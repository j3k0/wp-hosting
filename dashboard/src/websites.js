const commands = require('./commands');
const diskUsage = require('./disk-usage');
const { logger } = require('./utils/logger');

const websites = {
    async listWebsites(req, res) {
        try {
            const requestedClientId = req.params.customerId;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;
            const isTeamAdmin = req.user.isTeamAdmin;
            const filter = req.query.filter || 'enabled';

            logger.info('Listing websites', {
                requestedClientId,
                userClientId,
                isAdmin,
                isTeamAdmin,
                filter,
                userId: req.user.username
            });

            // Si l'utilisateur n'est pas admin, il ne peut voir que ses propres sites
            if (!isAdmin && requestedClientId !== userClientId) {
                logger.warn('Access denied: User attempting to view other client websites', {
                    userId: req.user.username,
                    requestedClientId,
                    userClientId
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only view your own websites'
                });
            }

            // Pour les admins ou les utilisateurs regardant leurs propres sites
            const clientIdToUse = requestedClientId || userClientId;
            
            if (!clientIdToUse && !isAdmin) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get sites based on filter - team admins can see all sites including disabled
            let args = [];
            if (!isAdmin && !isTeamAdmin) {
                // Regular users can only see enabled sites
                args.push('--enabled');
            } else if (filter === 'enabled') {
                args.push('--enabled');
            } else if (filter === 'disabled') {
                args.push('--disabled');
            }
            if (clientIdToUse) {
                args.push(`wp.${clientIdToUse}`);
            }

            // Get all sites
            let sites = await commands.listWebsites(args);

            // If the user is a team member (not admin or team admin), filter sites based on allowed sites
            if (!isAdmin && !isTeamAdmin) {
                if (req.group) {
                    const allowedSites = req.group.allowed_sites || [];
                    sites = sites.filter(site => allowedSites.includes(site));
                }
                else {
                    sites = [];
                }
            }

            // Get all containers status at once
            const containers = await commands.getDockerContainers();
            
            // Get disk usage
            const usages = await diskUsage.getMultipleUsage(sites);
            
            // Process each site
            const sitesWithInfo = await Promise.all(sites.map(async site => {
                // Filter containers for this site
                const siteContainers = containers.filter(container => {
                    const labels = container.Labels.split(',').reduce((acc, label) => {
                        const [key, value] = label.split('=');
                        acc[key] = value;
                        return acc;
                    }, {});
                    return labels['com.docker.compose.project.working_dir'] === `/apps/wp-hosting/${site}`;
                });

                // Get wordpress and database status
                let wordpressStatus = 'Disabled';
                let databaseStatus = 'Disabled';

                for (const container of siteContainers) {
                    if (container.Names.includes('_wordpress_')) {
                        wordpressStatus = container.State === 'running' ? 'Up' : 'Down';
                    } else if (container.Names.includes('_db_')) {
                        databaseStatus = container.State === 'running' ? 'Up' : 'Down';
                    }
                }

                return {
                    name: site,
                    usage: usages.get(site) || 0,
                    services: {
                        webserver: wordpressStatus,
                        database: databaseStatus
                    }
                };
            }));

            logger.info('Websites listed successfully', {
                userId: req.user.username,
                clientId: clientIdToUse,
                siteCount: sitesWithInfo.length,
                filter
            });

            res.json({ sites: sitesWithInfo });
        } catch (error) {
            logger.error('Failed to list websites', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                userId: req.user.username,
                clientId: req.params.customerId
            });
            res.status(500).json({ error: 'Failed to list websites' });
        }
    },

    async listCustomers(req, res) {
        try {
            logger.info('Listing customers', {
                requestedBy: req.user.username,
                isAdmin: req.user.isAdmin
            });

            const customers = await commands.listCustomers();

            logger.debug('Customers listed successfully', {
                customerCount: customers.length,
                customers
            });

            res.json({ customers });
        } catch (error) {
            logger.error('Failed to list customers', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to list customers' });
        }
    },

    async getWebsiteInfo(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;
            const isTeamAdmin = req.user.isTeamAdmin;

            logger.info('Getting website info', {
                siteName,
                userClientId,
                isAdmin,
                isTeamAdmin,
                userId: req.user.username
            });

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only view your own websites'
                });
            }

            const info = await commands.getWebsiteInfo(siteName);

            // For team members (not admin or team admin), remove only passwords
            if (!isAdmin && !isTeamAdmin) {
                if (info.phpmyadmin) {
                    info.phpmyadmin = {
                        ...info.phpmyadmin,
                        password: ''
                    };
                }
                if (info.sftp) {
                    info.sftp = {
                        ...info.sftp,
                        password: ''
                    };
                }
            }

            res.json(info);
        } catch (error) {
            logger.error('Failed to get website info', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                userId: req.user.username
            });
            res.status(500).json({ error: 'Failed to get website information' });
        }
    },

    async getWebsiteLogs(req, res) {
        try {
            const siteName = req.params.siteName;
            const lines = parseInt(req.query.lines) || 100;
            const logType = req.query.type || 'webserver';
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Getting website logs', {
                siteName,
                lines,
                logType,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized log access attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only view your own websites'
                });
            }

            // Use the appropriate log script based on type
            const scriptName = logType === 'database' ? 'logs_database.sh' : 'logs_webserver.sh';
            const logs = await commands.getWebsiteLogs(siteName, lines, scriptName);

            logger.debug('Website logs retrieved', {
                siteName,
                logType,
                lines,
                outputSize: logs.length
            });

            res.json({ logs });
        } catch (error) {
            logger.error('Failed to get website logs', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                logType: req.query.type,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to get website logs' });
        }
    },

    async restartWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Website restart initiated', {
                siteName,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized website restart attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only restart your own websites'
                });
            }

            await commands.restartWebsite(siteName);

            logger.info('Website restarted successfully', {
                siteName,
                requestedBy: req.user.username
            });

            res.json({ message: 'Website restarted successfully' });
        } catch (error) {
            logger.error('Failed to restart website', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to restart website' });
        }
    },

    async stopWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Website stop initiated', {
                siteName,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized website stop attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only stop your own websites'
                });
            }

            await commands.stopWebsite(siteName);
            
            logger.info('Website stopped successfully', {
                siteName,
                requestedBy: req.user.username
            });

            res.json({ message: 'Website stopped successfully' });
        } catch (error) {
            logger.error('Failed to stop website', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to stop website' });
        }
    },

    async startWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Website start initiated', {
                siteName,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized website start attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only start your own websites'
                });
            }

            await commands.startWebsite(siteName);

            logger.info('Website started successfully', {
                siteName,
                requestedBy: req.user.username
            });

            res.json({ message: 'Website started successfully' });
        } catch (error) {
            logger.error('Failed to start website', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to start website' });
        }
    },

    async enableWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Website enable initiated', {
                siteName,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized website enable attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only enable your own websites'
                });
            }

            await commands.enableWebsite(siteName);

            logger.info('Website enabled successfully', {
                siteName,
                requestedBy: req.user.username
            });

            res.json({ message: 'Website enabled successfully' });
        } catch (error) {
            logger.error('Failed to enable website', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to enable website' });
        }
    },

    async disableWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Website disable initiated', {
                siteName,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized website disable attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only disable your own websites'
                });
            }

            await commands.disableWebsite(siteName);

            logger.info('Website disabled successfully', {
                siteName,
                requestedBy: req.user.username
            });

            res.json({ message: 'Website disabled successfully' });
        } catch (error) {
            logger.error('Failed to disable website', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to disable website' });
        }
    },

    async startBackup(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Website backup initiated', {
                siteName,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized backup attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only backup your own websites'
                });
            }

            await commands.startBackup(siteName);

            logger.info('Backup started successfully', {
                siteName,
                requestedBy: req.user.username
            });

            res.json({ message: 'Backup started successfully' });
        } catch (error) {
            logger.error('Failed to start backup', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to start backup' });
        }
    },

    async listBackups(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Listing backups', {
                siteName,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized backup listing attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only view backups of your own websites'
                });
            }

            const backups = await commands.listBackups(siteName);

            logger.info('Backups listed successfully', {
                siteName,
                backupCount: backups.length,
                requestedBy: req.user.username
            });

            res.json({ backups });
        } catch (error) {
            logger.error('Failed to list backups', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to list backups' });
        }
    },

    async restoreBackup(req, res) {
        try {
            const siteName = req.params.siteName;
            const { backupDate } = req.body;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Backup restore initiated', {
                siteName,
                backupDate,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized backup restore attempt', {
                    siteName,
                    backupDate,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only restore backups of your own websites'
                });
            }

            await commands.restoreBackup(siteName, backupDate);

            logger.info('Backup restore started successfully', {
                siteName,
                backupDate,
                requestedBy: req.user.username
            });

            res.json({ message: 'Backup restore started successfully' });
        } catch (error) {
            logger.error('Failed to restore backup', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                backupDate: req.body.backupDate,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to restore backup' });
        }
    },

    async getBackupSize(req, res) {
        try {
            const siteName = req.params.siteName;
            const { backupDate } = req.query;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            logger.info('Getting backup size', {
                siteName,
                backupDate,
                userClientId,
                isAdmin,
                requestedBy: req.user.username
            });

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized backup size request', {
                    siteName,
                    backupDate,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only access your own website backups'
                });
            }

            if (!backupDate) {
                logger.warn('Missing backup date in size request', {
                    siteName,
                    requestedBy: req.user.username
                });
                return res.status(400).json({
                    error: 'Backup date is required'
                });
            }

            const sizeInBytes = await commands.getBackupSize(siteName, backupDate);

            logger.info('Backup size retrieved successfully', {
                siteName,
                backupDate,
                sizeInBytes,
                formattedSize: formatBytes(sizeInBytes),
                requestedBy: req.user.username
            });

            res.json({ 
                size: sizeInBytes,
                formatted: formatBytes(sizeInBytes)
            });
        } catch (error) {
            logger.error('Failed to get backup size', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                backupDate: req.query.backupDate,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to get backup size' });
        }
    },

    async deleteWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;
            const isTeamAdmin = req.user.isTeamAdmin;

            logger.info('Website deletion initiated', {
                siteName,
                userClientId,
                isAdmin,
                isTeamAdmin,
                requestedBy: req.user.username
            });

            // Only admins and team admins can delete sites
            if (!isAdmin && !isTeamAdmin) {
                logger.warn('Non-admin user attempted to delete website', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: Only admins can delete websites'
                });
            }

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                logger.warn('Unauthorized website deletion attempt', {
                    siteName,
                    userClientId,
                    requestedBy: req.user.username
                });
                return res.status(403).json({ 
                    error: 'Access denied: You can only delete your own websites'
                });
            }

            await commands.deleteWebsite(siteName);

            logger.info('Website deleted successfully', {
                siteName,
                requestedBy: req.user.username
            });

            res.json({ message: 'Website deleted successfully' });
        } catch (error) {
            logger.error('Failed to delete website', {
                error: {
                    message: error.message,
                    stack: error.stack
                },
                siteName: req.params.siteName,
                requestedBy: req.user.username
            });
            res.status(500).json({ error: 'Failed to delete website' });
        }
    }
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = websites; 