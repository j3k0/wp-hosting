const commands = require('./commands');
const diskUsage = require('./disk-usage');

const websites = {
    async listWebsites(req, res) {
        try {
            const requestedClientId = req.params.customerId;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;
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

            // Get sites based on filter
            let args = [];
            if (filter === 'enabled') {
                args.push('--enabled');
            } else if (filter === 'disabled') {
                args.push('--disabled');
            }
            if (clientIdToUse) {
                args.push(`wp.${clientIdToUse}`);
            }

            // Get all sites
            const sites = await commands.listWebsites(args);
            
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

            // Vérifier que l'utilisateur a le droit d'accéder à ce site
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only view your own websites'
                });
            }

            const info = await commands.getWebsiteInfo(siteName);
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
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

            // Verify access rights
            if (!isAdmin && !siteName.startsWith(`wp.${userClientId}.`)) {
                return res.status(403).json({ 
                    error: 'Access denied: You can only view your own websites'
                });
            }

            const logs = await commands.getWordPressLogs(siteName, lines);
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
    }
};

module.exports = websites; 