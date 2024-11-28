const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./utils/logger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET.slice(0, 64) : null;
if (!JWT_SECRET) {
    logger.error('JWT_SECRET not defined in environment variables');
    throw new Error('JWT_SECRET is not defined in environment variables');
}

const USERS_FILE = path.join(__dirname, '../config/users.json');
const GROUPS_FILE = path.join(__dirname, '../config/groups.json');

async function getUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.warn('Users file not found, creating empty users object');
            return {};
        }
        logger.error('Error reading users file', {
            error: {
                message: error.message,
                code: error.code
            }
        });
        throw error;
    }
}

async function saveUsers(users) {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        logger.info('Users file updated', {
            userCount: Object.keys(users).length
        });
    } catch (error) {
        logger.error('Failed to save users file', {
            error: {
                message: error.message,
                code: error.code
            }
        });
        throw error;
    }
}

async function getGroups() {
    try {
        const data = await fs.readFile(GROUPS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const emptyGroups = {};
            await fs.writeFile(GROUPS_FILE, JSON.stringify(emptyGroups, null, 2));
            return emptyGroups;
        }
        logger.error('Error reading groups file', {
            error: {
                message: error.message,
                code: error.code,
                stack: error.stack
            }
        });
        throw error;
    }
}

async function saveGroups(groups) {
    try {
        const configDir = path.dirname(GROUPS_FILE);
        await fs.mkdir(configDir, { recursive: true });
        
        await fs.writeFile(GROUPS_FILE, JSON.stringify(groups, null, 2));
        logger.info('Groups file updated', {
            groupCount: Object.keys(groups).length
        });
    } catch (error) {
        logger.error('Error saving groups', {
            error: {
                message: error.message,
                code: error.code,
                stack: error.stack
            }
        });
        throw error;
    }
}

async function updateUsersGroup(groupId, newGroupId) {
    try {
        const users = await getUsers();
        let updated = false;
        let updatedCount = 0;
        
        logger.info('Updating users group assignments', {
            oldGroupId: groupId,
            newGroupId
        });

        // Update all users that were in the deleted group
        for (const [username, userData] of Object.entries(users)) {
            if (userData.group_id === groupId) {
                users[username].group_id = newGroupId;
                updated = true;
                updatedCount++;
            }
        }
        
        if (updated) {
            await saveUsers(users);
            logger.info('Users group assignments updated', {
                oldGroupId: groupId,
                newGroupId,
                updatedCount
            });
        } else {
            logger.debug('No users needed group update', {
                oldGroupId: groupId,
                newGroupId
            });
        }
    } catch (error) {
        logger.error('Failed to update users group assignments', {
            error: {
                message: error.message,
                stack: error.stack
            },
            oldGroupId: groupId,
            newGroupId
        });
        throw error;
    }
}

async function addGroupInfoToRequest(req) {
    if (!req.user.groupId) return;
    
    try {
        const groups = await getGroups();
        req.group = groups[req.user.groupId] || null;
        
        logger.debug('Group info added to request', {
            username: req.user.username,
            groupId: req.user.groupId,
            hasGroup: !!req.group
        });
    } catch (error) {
        logger.error('Failed to add group info to request', {
            error: {
                message: error.message,
                stack: error.stack
            },
            username: req.user.username,
            groupId: req.user.groupId
        });
    }
}

const auth = {
    async login(req, res) {
        const { username, password } = req.body;
        
        try {
            const users = await getUsers();
            
            if (!users[username]) {
                logger.warn('Login attempt with invalid username', {
                    username,
                    ip: req.ip
                });
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, users[username].password);
            
            if (!validPassword) {
                logger.warn('Login attempt with invalid password', {
                    username,
                    ip: req.ip
                });
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { 
                    username,
                    isAdmin: users[username].is_admin,
                    isTeamAdmin: users[username].is_team_admin,
                    clientId: users[username].client_id,
                    groupId: users[username].group_id
                },
                JWT_SECRET,
                {
                    expiresIn: '24h',
                    algorithm: 'HS256'
                }
            );

            logger.info('User logged in successfully', {
                username,
                ip: req.ip,
                isAdmin: users[username].is_admin,
                isTeamAdmin: users[username].is_team_admin,
                clientId: users[username].client_id
            });

            res.cookie('token', token, { httpOnly: true, secure: true });
            res.json({ 
                username,
                isAdmin: users[username].is_admin,
                isTeamAdmin: users[username].is_team_admin,
                clientId: users[username].client_id,
                groupId: users[username].group_id
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error during login' });
        }
    },

    async createUser(req, res) {
        const { username, password, isTeamAdmin, groupId, clientId } = req.body;
        const users = await getUsers();

        if (users[username]) {
            return res.status(400).json({ error: 'User already exists' });
        }

        if (!req.user.isAdmin && !req.user.isTeamAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const actualClientId = req.user.isAdmin ? clientId : req.user.clientId;

        if (groupId) {
            const groups = await getGroups();
            if (!groups[groupId]) {
                return res.status(400).json({ error: 'Invalid group ID' });
            }
            if (groups[groupId].client_id !== actualClientId) {
                return res.status(400).json({ 
                    error: 'Group does not belong to this client' 
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = {
            password: hashedPassword,
            is_admin: false,
            is_team_admin: isTeamAdmin || false,
            client_id: actualClientId,
            group_id: groupId || null
        };

        await saveUsers(users);
        res.json({ message: 'User created successfully' });
    },

    async authenticate(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            logger.warn('Authentication attempt without token', {
                ip: req.ip,
                path: req.path
            });
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            await addGroupInfoToRequest(req);
            logger.debug('User authenticated', {
                username: decoded.username,
                path: req.path
            });
            next();
        } catch (error) {
            logger.warn('Invalid token authentication attempt', {
                ip: req.ip,
                path: req.path,
                error: {
                    message: error.message,
                    name: error.name
                }
            });
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    async authenticateAdmin(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            logger.warn('Admin authentication attempt without token', {
                ip: req.ip,
                path: req.path
            });
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (!decoded.isAdmin) {
                logger.warn('Non-admin user attempted admin access', {
                    username: decoded.username,
                    ip: req.ip,
                    path: req.path
                });
                return res.status(403).json({ error: 'Admin access required' });
            }
            req.user = decoded;
            await addGroupInfoToRequest(req);
            logger.debug('Admin authenticated', {
                username: decoded.username,
                path: req.path
            });
            next();
        } catch (error) {
            logger.error('Admin authentication failed', {
                ip: req.ip,
                path: req.path,
                error: {
                    message: error.message,
                    name: error.name
                }
            });
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    async authenticateTeamAdmin(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            logger.warn('Team admin authentication attempt without token', {
                ip: req.ip,
                path: req.path
            });
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (!decoded.isAdmin && !decoded.isTeamAdmin) {
                logger.warn('Non-team-admin user attempted team admin access', {
                    username: decoded.username,
                    ip: req.ip,
                    path: req.path
                });
                return res.status(403).json({ error: 'Team admin access required' });
            }
            req.user = decoded;
            await addGroupInfoToRequest(req);
            logger.debug('Team admin authenticated', {
                username: decoded.username,
                path: req.path
            });
            next();
        } catch (error) {
            logger.error('Team admin authentication failed', {
                ip: req.ip,
                path: req.path,
                error: {
                    message: error.message,
                    name: error.name
                }
            });
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    logout(req, res) {
        logger.info('User logged out', {
            username: req.user?.username || 'unknown',
            ip: req.ip
        });
        res.clearCookie('token');
        res.json({ message: 'Logged out successfully' });
    },

    async listUsers(req, res) {
        try {
            logger.info('Listing users', {
                requestedBy: req.user.username,
                isAdmin: req.user.isAdmin
            });

            const users = await getUsers();
            
            // Filter users based on permissions
            const safeUsers = Object.entries(users)
                .filter(([_, data]) => 
                    req.user.isAdmin || data.client_id === req.user.clientId
                )
                .map(([username, data]) => ({
                    username,
                    isAdmin: data.is_admin,
                    isTeamAdmin: data.is_team_admin,
                    clientId: data.client_id,
                    groupId: data.group_id
                }));

            logger.debug('Users listed successfully', {
                requestedBy: req.user.username,
                userCount: safeUsers.length
            });

            res.json(safeUsers);
        } catch (error) {
            logger.error('Failed to list users', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to list users' });
        }
    },

    async resetPassword(req, res) {
        try {
            const { username } = req.params;
            const { password } = req.body;
            
            logger.info('Password reset initiated', {
                targetUser: username,
                requestedBy: req.user.username
            });

            const users = await getUsers();
            if (!users[username]) {
                logger.warn('Password reset attempted for non-existent user', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(404).json({ error: 'User not found' });
            }

            // Check permissions
            if (!req.user.isAdmin && users[username].client_id !== req.user.clientId) {
                logger.warn('Unauthorized password reset attempt', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ error: 'Access denied' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            users[username].password = hashedPassword;

            await saveUsers(users);
            
            logger.info('Password reset successful', {
                targetUser: username,
                requestedBy: req.user.username
            });

            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            logger.error('Password reset failed', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                targetUser: req.params.username,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to reset password' });
        }
    },

    async deleteUser(req, res) {
        try {
            const { username } = req.params;
            logger.info('User deletion initiated', {
                targetUser: username,
                requestedBy: req.user.username
            });

            const users = await getUsers();
            
            if (!users[username]) {
                logger.warn('Attempted to delete non-existent user', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(404).json({ error: 'User not found' });
            }

            // Prevent deleting admin users
            if (users[username].is_admin) {
                logger.warn('Attempted to delete admin user', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ error: 'Cannot delete admin user' });
            }

            // Prevent deleting yourself
            if (username === req.user.username) {
                logger.warn('User attempted to delete own account', {
                    username,
                    ip: req.ip
                });
                return res.status(403).json({ error: 'Cannot delete your own account' });
            }

            // Team admins can only delete users from their client
            if (!req.user.isAdmin && users[username].client_id !== req.user.clientId) {
                logger.warn('Unauthorized user deletion attempt', {
                    targetUser: username,
                    requestedBy: req.user.username,
                    userClientId: users[username].client_id,
                    requesterClientId: req.user.clientId
                });
                return res.status(403).json({ error: 'Access denied' });
            }

            delete users[username];
            await saveUsers(users);
            
            logger.info('User deleted successfully', {
                targetUser: username,
                requestedBy: req.user.username
            });

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            logger.error('Failed to delete user', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                targetUser: req.params.username,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    async createGroup(req, res) {
        try {
            const { name, allowedSites } = req.body;
            let { clientId } = req.body;
            
            logger.info('Group creation initiated', {
                name,
                clientId,
                siteCount: allowedSites?.length,
                requestedBy: req.user.username
            });

            if (!req.user.isAdmin) {
                clientId = req.user.clientId;
            }
            
            if (!name || !clientId || !Array.isArray(allowedSites)) {
                logger.warn('Invalid group creation data', {
                    name,
                    clientId,
                    allowedSites,
                    requestedBy: req.user.username
                });
                return res.status(400).json({ error: 'Invalid group data' });
            }

            if (allowedSites.length > 0) {
                const validSitePrefix = `wp.${clientId}.`;
                const invalidSites = allowedSites.filter(site => !site.startsWith(validSitePrefix));
                if (invalidSites.length > 0) {
                    logger.warn('Invalid sites in group creation', {
                        invalidSites,
                        clientId,
                        requestedBy: req.user.username
                    });
                    return res.status(400).json({ 
                        error: `Invalid sites for this client: ${invalidSites.join(', ')}` 
                    });
                }
            }

            const groups = await getGroups();
            const groupId = Date.now().toString();

            groups[groupId] = {
                name,
                client_id: clientId,
                allowed_sites: allowedSites,
                created_at: new Date().toISOString(),
                created_by: req.user.username
            };

            await saveGroups(groups);

            logger.info('Group created successfully', {
                groupId,
                name,
                clientId,
                siteCount: allowedSites.length,
                requestedBy: req.user.username
            });

            res.json({ 
                message: 'Group created successfully',
                groupId 
            });
        } catch (error) {
            logger.error('Failed to create group', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                requestedBy: req.user.username,
                groupData: req.body
            });
            res.status(500).json({ error: 'Failed to create group' });
        }
    },

    async listGroups(req, res) {
        try {
            logger.info('Listing groups', {
                username: req.user.username,
                isAdmin: req.user.isAdmin,
                isTeamAdmin: req.user.isTeamAdmin,
                hasGroupId: !!req.user.groupId
            });

            if (!req.user.isAdmin && !req.user.isTeamAdmin && !req.user.groupId) {
                logger.debug('Regular user with no group, returning empty object', {
                    username: req.user.username
                });
                return res.json({});
            }

            const groups = await getGroups();
            const filteredGroups = req.user.isAdmin 
                ? groups 
                : req.user.isTeamAdmin
                    ? Object.fromEntries(
                        Object.entries(groups)
                            .filter(([_, group]) => group.client_id === req.user.clientId)
                    )
                    : Object.fromEntries(
                        Object.entries(groups)
                            .filter(([id, _]) => id === req.user.groupId)
                    );

            logger.debug('Groups filtered based on user role', {
                username: req.user.username,
                totalGroups: Object.keys(groups).length,
                filteredGroupCount: Object.keys(filteredGroups).length
            });

            res.json(filteredGroups);
        } catch (error) {
            logger.error('Failed to list groups', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                username: req.user.username
            });
            res.status(500).json({ error: 'Failed to list groups' });
        }
    },

    async updateGroup(req, res) {
        try {
            const { groupId } = req.params;
            const { name, allowedSites } = req.body;
            
            logger.info('Group update initiated', {
                groupId,
                name,
                siteCount: allowedSites?.length,
                requestedBy: req.user.username
            });

            const groups = await getGroups();
            if (!groups[groupId]) {
                logger.warn('Attempted to update non-existent group', {
                    groupId,
                    requestedBy: req.user.username
                });
                return res.status(404).json({ error: 'Group not found' });
            }

            if (!req.user.isAdmin && groups[groupId].client_id !== req.user.clientId) {
                logger.warn('Unauthorized group update attempt', {
                    groupId,
                    requestedBy: req.user.username,
                    groupClientId: groups[groupId].client_id,
                    userClientId: req.user.clientId
                });
                return res.status(403).json({ error: 'Access denied' });
            }

            if (allowedSites && !req.user.isAdmin) {
                const validSitePrefix = `wp.${req.user.clientId}.`;
                const invalidSites = allowedSites.filter(site => !site.startsWith(validSitePrefix));
                if (invalidSites.length > 0) {
                    logger.warn('Invalid sites in group update', {
                        invalidSites,
                        groupId,
                        requestedBy: req.user.username
                    });
                    return res.status(400).json({ 
                        error: `Invalid sites for this client: ${invalidSites.join(', ')}` 
                    });
                }
            }

            groups[groupId] = {
                ...groups[groupId],
                name: name || groups[groupId].name,
                allowed_sites: allowedSites || groups[groupId].allowed_sites,
                updated_at: new Date().toISOString(),
                updated_by: req.user.username
            };

            await saveGroups(groups);

            logger.info('Group updated successfully', {
                groupId,
                name,
                siteCount: groups[groupId].allowed_sites.length,
                requestedBy: req.user.username
            });

            res.json({ message: 'Group updated successfully' });
        } catch (error) {
            logger.error('Failed to update group', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                groupId: req.params.groupId,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to update group' });
        }
    },

    async deleteGroup(req, res) {
        try {
            const { groupId } = req.params;
            logger.info('Group deletion initiated', {
                groupId,
                requestedBy: req.user.username
            });

            const groups = await getGroups();
            
            if (!groups[groupId]) {
                logger.warn('Attempted to delete non-existent group', {
                    groupId,
                    requestedBy: req.user.username
                });
                return res.status(404).json({ error: 'Group not found' });
            }

            if (!req.user.isAdmin && groups[groupId].client_id !== req.user.clientId) {
                logger.warn('Unauthorized group deletion attempt', {
                    groupId,
                    requestedBy: req.user.username,
                    groupClientId: groups[groupId].client_id,
                    userClientId: req.user.clientId
                });
                return res.status(403).json({ error: 'Access denied' });
            }

            // Update all users in this group to have no group
            await updateUsersGroup(groupId, null);

            // Delete the group
            delete groups[groupId];
            await saveGroups(groups);
            
            logger.info('Group deleted successfully', {
                groupId,
                requestedBy: req.user.username
            });

            res.json({ message: 'Group deleted successfully' });
        } catch (error) {
            logger.error('Failed to delete group', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                groupId: req.params.groupId,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to delete group' });
        }
    },

    async updateUserGroup(req, res) {
        try {
            const { username } = req.params;
            const { groupId } = req.body;
            
            logger.info('User group update initiated', {
                targetUser: username,
                newGroupId: groupId,
                requestedBy: req.user.username
            });

            const users = await getUsers();
            if (!users[username]) {
                logger.warn('Attempted to update group of non-existent user', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(404).json({ error: 'User not found' });
            }

            if (username === req.user.username) {
                logger.warn('User attempted to modify own group', {
                    username,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ error: 'Cannot modify your own group' });
            }

            if (users[username].is_admin) {
                logger.warn('Attempted to modify admin user group', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ error: 'Cannot modify admin users' });
            }

            if (!req.user.isAdmin && users[username].client_id !== req.user.clientId) {
                logger.warn('Unauthorized group modification attempt', {
                    targetUser: username,
                    requestedBy: req.user.username,
                    userClientId: users[username].client_id,
                    requesterClientId: req.user.clientId
                });
                return res.status(403).json({ error: 'Access denied' });
            }

            if (groupId !== null) {
                const groups = await getGroups();
                if (!groups[groupId]) {
                    logger.warn('Attempted to assign non-existent group', {
                        targetUser: username,
                        groupId,
                        requestedBy: req.user.username
                    });
                    return res.status(400).json({ error: 'Invalid group ID' });
                }
                if (groups[groupId].client_id !== users[username].client_id) {
                    logger.warn('Attempted to assign group from different client', {
                        targetUser: username,
                        groupId,
                        groupClientId: groups[groupId].client_id,
                        userClientId: users[username].client_id,
                        requestedBy: req.user.username
                    });
                    return res.status(400).json({ error: 'Group does not belong to this client' });
                }
            }

            users[username].group_id = groupId;
            await saveUsers(users);
            
            logger.info('User group updated successfully', {
                targetUser: username,
                newGroupId: groupId,
                requestedBy: req.user.username
            });

            res.json({ message: 'User group updated successfully' });
        } catch (error) {
            logger.error('Failed to update user group', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                targetUser: req.params.username,
                newGroupId: req.body.groupId,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to update user group' });
        }
    },

    async updateUserRole(req, res) {
        try {
            const { username } = req.params;
            const { isTeamAdmin } = req.body;
            
            logger.info('User role update initiated', {
                targetUser: username,
                newRole: isTeamAdmin ? 'team_admin' : 'user',
                requestedBy: req.user.username
            });

            const users = await getUsers();
            if (!users[username]) {
                logger.warn('Attempted to update role of non-existent user', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(404).json({ error: 'User not found' });
            }

            // Prevent modifying admin users
            if (users[username].is_admin) {
                logger.warn('Attempted to modify admin user role', {
                    targetUser: username,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ error: 'Cannot modify admin users' });
            }

            // Prevent modifying your own role
            if (username === req.user.username) {
                logger.warn('User attempted to modify own role', {
                    username,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ error: 'Cannot modify your own role' });
            }

            // Team admins can only modify users from their client
            if (!req.user.isAdmin && users[username].client_id !== req.user.clientId) {
                logger.warn('Unauthorized role modification attempt', {
                    targetUser: username,
                    requestedBy: req.user.username,
                    userClientId: users[username].client_id,
                    requesterClientId: req.user.clientId
                });
                return res.status(403).json({ error: 'Access denied' });
            }

            users[username].is_team_admin = isTeamAdmin;
            await saveUsers(users);
            
            logger.info('User role updated successfully', {
                targetUser: username,
                newRole: isTeamAdmin ? 'team_admin' : 'user',
                requestedBy: req.user.username
            });

            res.json({ message: 'User role updated successfully' });
        } catch (error) {
            logger.error('Failed to update user role', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                targetUser: req.params.username,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to update user role' });
        }
    }
};

module.exports = auth; 