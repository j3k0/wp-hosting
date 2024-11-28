const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET.slice(0, 64) : null;
if (!JWT_SECRET) {
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
            return {};
        }
        throw error;
    }
}

async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
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
        console.error('Error reading groups file:', error);
        throw error;
    }
}

async function saveGroups(groups) {
    try {
        const configDir = path.dirname(GROUPS_FILE);
        await fs.mkdir(configDir, { recursive: true });
        
        await fs.writeFile(GROUPS_FILE, JSON.stringify(groups, null, 2));
    } catch (error) {
        console.error('Error saving groups:', error);
        throw error;
    }
}

async function updateUsersGroup(groupId, newGroupId) {
    const users = await getUsers();
    let updated = false;
    
    // Update all users that were in the deleted group
    for (const [username, userData] of Object.entries(users)) {
        if (userData.group_id === groupId) {
            users[username].group_id = newGroupId;
            updated = true;
        }
    }
    
    if (updated) {
        await saveUsers(users);
    }
}

const auth = {
    async login(req, res) {
        const { username, password } = req.body;
        
        try {
            const users = await getUsers();
            
            if (!users[username]) {
                console.log('User not found:', username);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, users[username].password);
            console.log('Password validation result:', validPassword);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            console.log('JWT_SECRET type:', typeof JWT_SECRET);
            console.log('JWT_SECRET length:', JWT_SECRET.length);

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

    authenticate(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    authenticateAdmin(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (!decoded.isAdmin) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    authenticateTeamAdmin(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (!decoded.isAdmin && !decoded.isTeamAdmin) {
                return res.status(403).json({ error: 'Team admin access required' });
            }
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    logout(req, res) {
        res.clearCookie('token');
        res.json({ message: 'Logged out successfully' });
    },

    async listUsers(req, res) {
        try {
            const users = await getUsers();
            
            // Filter users based on permissions
            const safeUsers = Object.entries(users)
                // For team admins, only show users from their client
                .filter(([_, data]) => 
                    req.user.isAdmin || data.client_id === req.user.clientId
                )
                // Map to safe user data
                .map(([username, data]) => ({
                    username,
                    isAdmin: data.is_admin,
                    isTeamAdmin: data.is_team_admin,
                    clientId: data.client_id,
                    groupId: data.group_id
                }));

            res.json(safeUsers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to list users' });
        }
    },

    async resetPassword(req, res) {
        try {
            const { username } = req.params;
            const { password } = req.body;
            
            const users = await getUsers();
            if (!users[username]) {
                return res.status(404).json({ error: 'User not found' });
            }

            users[username].password = await bcrypt.hash(password, 10);
            await saveUsers(users);
            
            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to reset password' });
        }
    },

    async deleteUser(req, res) {
        try {
            const { username } = req.params;
            const users = await getUsers();
            
            if (!users[username]) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (users[username].is_admin) {
                return res.status(403).json({ error: 'Cannot delete admin user' });
            }

            delete users[username];
            await saveUsers(users);
            
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    async createGroup(req, res) {
        try {
            const { name, allowedSites } = req.body;
            let { clientId } = req.body;
            
            if (!req.user.isAdmin) {
                clientId = req.user.clientId;
            }
            
            if (!name || !clientId || !Array.isArray(allowedSites)) {
                return res.status(400).json({ error: 'Invalid group data' });
            }

            if (allowedSites.length > 0) {
                const validSitePrefix = `wp.${clientId}.`;
                const invalidSites = allowedSites.filter(site => !site.startsWith(validSitePrefix));
                if (invalidSites.length > 0) {
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
            res.json({ 
                message: 'Group created successfully',
                groupId 
            });
        } catch (error) {
            console.error('Error creating group:', error);
            res.status(500).json({ error: 'Failed to create group' });
        }
    },

    async listGroups(req, res) {
        try {
            if (!req.user.isAdmin && !req.user.isTeamAdmin) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const groups = await getGroups();
            const filteredGroups = req.user.isAdmin 
                ? groups 
                : Object.fromEntries(
                    Object.entries(groups)
                        .filter(([_, group]) => group.client_id === req.user.clientId)
                );
            res.json(filteredGroups);
        } catch (error) {
            res.status(500).json({ error: 'Failed to list groups' });
        }
    },

    async updateGroup(req, res) {
        try {
            const { groupId } = req.params;
            const { name, allowedSites } = req.body;
            
            const groups = await getGroups();
            if (!groups[groupId]) {
                return res.status(404).json({ error: 'Group not found' });
            }

            if (!req.user.isAdmin && groups[groupId].client_id !== req.user.clientId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            if (allowedSites && !req.user.isAdmin) {
                const validSitePrefix = `wp.${req.user.clientId}.`;
                const invalidSites = allowedSites.filter(site => !site.startsWith(validSitePrefix));
                if (invalidSites.length > 0) {
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
            res.json({ message: 'Group updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update group' });
        }
    },

    async deleteGroup(req, res) {
        try {
            const { groupId } = req.params;
            const groups = await getGroups();
            
            if (!groups[groupId]) {
                return res.status(404).json({ error: 'Group not found' });
            }

            if (!req.user.isAdmin && groups[groupId].client_id !== req.user.clientId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Update all users in this group to have no group
            await updateUsersGroup(groupId, null);

            // Delete the group
            delete groups[groupId];
            await saveGroups(groups);
            
            res.json({ message: 'Group deleted successfully' });
        } catch (error) {
            console.error('Error deleting group:', error);
            res.status(500).json({ error: 'Failed to delete group' });
        }
    },

    async updateUserGroup(req, res) {
        try {
            const { username } = req.params;
            const { groupId } = req.body;
            
            const users = await getUsers();
            if (!users[username]) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (username === req.user.username) {
                return res.status(403).json({ error: 'Cannot modify your own group' });
            }

            if (users[username].is_admin) {
                return res.status(403).json({ error: 'Cannot modify admin users' });
            }

            if (!req.user.isAdmin && users[username].client_id !== req.user.clientId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            if (groupId !== null) {
                const groups = await getGroups();
                if (!groups[groupId]) {
                    return res.status(400).json({ error: 'Invalid group ID' });
                }
                if (groups[groupId].client_id !== users[username].client_id) {
                    return res.status(400).json({ error: 'Group does not belong to this client' });
                }
            }

            users[username].group_id = groupId;
            await saveUsers(users);
            
            res.json({ message: 'User group updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update user group' });
        }
    },

    async updateUserRole(req, res) {
        try {
            const { username } = req.params;
            const { isTeamAdmin } = req.body;
            
            const users = await getUsers();
            if (!users[username]) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (username === req.user.username) {
                return res.status(403).json({ error: 'Cannot modify your own role' });
            }

            if (users[username].is_admin) {
                return res.status(403).json({ error: 'Cannot modify admin users' });
            }

            if (!req.user.isAdmin && users[username].client_id !== req.user.clientId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            users[username].is_team_admin = isTeamAdmin;
            await saveUsers(users);
            
            res.json({ message: 'User role updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update user role' });
        }
    }
};

module.exports = auth; 