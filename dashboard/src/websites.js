const commands = require('./commands');
const diskUsage = require('./disk-usage');

const websites = {
    async listWebsites(req, res) {
        try {
            const requestedClientId = req.params.customerId;
            const userClientId = req.user.clientId;
            const isAdmin = req.user.isAdmin;

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

            const sites = await commands.listWebsites(clientIdToUse);
            
            // Récupérer l'utilisation du disque pour tous les sites
            const usages = await diskUsage.getMultipleUsage(sites);
            
            // Combiner les informations
            const sitesWithUsage = sites.map(site => ({
                name: site,
                usage: usages.get(site) || 0
            }));

            res.json({ sites: sitesWithUsage });
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
    }
};

module.exports = websites; 