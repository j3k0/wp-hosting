const commands = require('./commands');
const diskUsage = require('./disk-usage');

const websites = {
    async listWebsites(req, res) {
        try {
            const requestedClientId = req.params.customerId;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;
            const isTeamAdmin = req.user.isTeamAdmin;
            const filter = req.query.filter || 'enabled';

            // Si l'utilisateur n'est pas admin, il ne peut voir que ses propres sites
            if (!isAdmin && requestedClientId !== userClientId) {
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

            res.json({ sites: sitesWithInfo });
        } catch (error) {
            console.error('Error listing websites:', error);
            res.status(500).json({ error: 'Failed to list websites' });
        }
    },

    async listCustomers(req, res) {
        try {
            const customers = await commands.listCustomers();
            res.json({ customers });
        } catch (error) {
            console.error('Error listing customers:', error);
            res.status(500).json({ error: 'Failed to list customers' });
        }
    },

    async getWebsiteInfo(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;
            const isTeamAdmin = req.user.isTeamAdmin;

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
            console.error('Error getting website info:', error);
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

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only view your own websites'
                });
            }

            // Use the appropriate log script based on type
            const scriptName = logType === 'database' ? 'logs_database.sh' : 'logs_webserver.sh';
            const logs = await commands.getWebsiteLogs(siteName, lines, scriptName);
            res.json({ logs });
        } catch (error) {
            console.error('Error getting website logs:', error);
            res.status(500).json({ error: 'Failed to get website logs' });
        }
    },

    async restartWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only restart your own websites'
                });
            }

            await commands.restartWebsite(siteName);
            res.json({ message: 'Website restarted successfully' });
        } catch (error) {
            console.error('Error restarting website:', error);
            res.status(500).json({ error: 'Failed to restart website' });
        }
    },

    async stopWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only stop your own websites'
                });
            }

            await commands.stopWebsite(siteName);
            res.json({ message: 'Website stopped successfully' });
        } catch (error) {
            console.error('Error stopping website:', error);
            res.status(500).json({ error: 'Failed to stop website' });
        }
    },

    async startWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only start your own websites'
                });
            }

            await commands.startWebsite(siteName);
            res.json({ message: 'Website started successfully' });
        } catch (error) {
            console.error('Error starting website:', error);
            res.status(500).json({ error: 'Failed to start website' });
        }
    },

    async enableWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only enable your own websites'
                });
            }

            await commands.enableWebsite(siteName);
            res.json({ message: 'Website enabled successfully' });
        } catch (error) {
            console.error('Error enabling website:', error);
            res.status(500).json({ error: 'Failed to enable website' });
        }
    },

    async disableWebsite(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only disable your own websites'
                });
            }

            await commands.disableWebsite(siteName);
            res.json({ message: 'Website disabled successfully' });
        } catch (error) {
            console.error('Error disabling website:', error);
            res.status(500).json({ error: 'Failed to disable website' });
        }
    },

    async startBackup(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only backup your own websites'
                });
            }

            await commands.startBackup(siteName);
            res.json({ message: 'Backup started successfully' });
        } catch (error) {
            console.error('Error starting backup:', error);
            res.status(500).json({ error: 'Failed to start backup' });
        }
    },

    async listBackups(req, res) {
        try {
            const siteName = req.params.siteName;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only view backups of your own websites'
                });
            }

            const backups = await commands.listBackups(siteName);
            res.json({ backups });
        } catch (error) {
            console.error('Error listing backups:', error);
            res.status(500).json({ error: 'Failed to list backups' });
        }
    },

    async restoreBackup(req, res) {
        try {
            const siteName = req.params.siteName;
            const { backupDate } = req.body;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only restore backups of your own websites'
                });
            }

            await commands.restoreBackup(siteName, backupDate);
            res.json({ message: 'Backup restore started successfully' });
        } catch (error) {
            console.error('Error restoring backup:', error);
            res.status(500).json({ error: 'Failed to restore backup' });
        }
    },

    async getBackupSize(req, res) {
        try {
            const siteName = req.params.siteName;
            const { backupDate } = req.query;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only access your own website backups'
                });
            }

            if (!backupDate) {
                return res.status(400).json({
                    error: 'Backup date is required'
                });
            }

            const sizeInBytes = await commands.getBackupSize(siteName, backupDate);
            res.json({ 
                size: sizeInBytes,
                formatted: formatBytes(sizeInBytes)
            });
        } catch (error) {
            console.error('Error getting backup size:', error);
            res.status(500).json({ error: 'Failed to get backup size' });
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