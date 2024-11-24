const fs = require('fs').promises;
const path = require('path');

class DiskUsage {
    constructor() {
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes en millisecondes
        this.diskUsageFile = path.join(__dirname, '../../disk-usage.log');
        this.lastUpdate = 0;
        this.usageIndex = new Map(); // Map pour stocker les données indexées
    }

    /**
     * Met à jour l'index si nécessaire et retourne les données d'utilisation
     * @param {string} [siteName] - Nom du site spécifique (optionnel)
     * @returns {Promise<number|Map<string,number>>} Utilisation en bytes pour un site ou Map de tous les sites
     */
    async getUsage(siteName = null) {
        await this.updateIndexIfNeeded();

        if (siteName) {
            const usage = this.usageIndex.get(siteName);
            if (usage === undefined) {
                throw new Error(`No disk usage data found for site: ${siteName}`);
            }
            return usage;
        }

        return this.usageIndex;
    }

    /**
     * Vérifie si l'index doit être mis à jour et le met à jour si nécessaire
     * @private
     */
    async updateIndexIfNeeded() {
        const now = Date.now();
        if (now - this.lastUpdate < this.cacheTimeout) {
            return; // L'index est encore valide
        }

        try {
            const content = await fs.readFile(this.diskUsageFile, 'utf8');
            const newIndex = new Map();

            // Parse chaque ligne du fichier
            content.split('\n').forEach(line => {
                const [usage, path] = line.trim().split(/\s+/);
                if (!usage || !path) return;

                // Extrait le nom du site du chemin (wp.client.domain/volumes -> wp.client.domain)
                const siteName = path.split('/')[0];
                if (!siteName) return;

                // Convertit l'utilisation en nombre et stocke dans l'index
                const usageBytes = parseInt(usage, 10);
                if (!isNaN(usageBytes)) {
                    newIndex.set(siteName, usageBytes);
                }
            });

            this.usageIndex = newIndex;
            this.lastUpdate = now;
        } catch (error) {
            console.error('Error reading disk usage file:', error);
            throw new Error('Failed to update disk usage data');
        }
    }

    /**
     * Formate l'utilisation du disque en une chaîne lisible
     * @param {number} bytes - Taille en bytes
     * @returns {string} Taille formatée (ex: "1.5 GB")
     */
    static formatUsage(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Force la mise à jour de l'index
     * @returns {Promise<void>}
     */
    async forceUpdate() {
        this.lastUpdate = 0;
        await this.updateIndexIfNeeded();
    }

    /**
     * Récupère l'utilisation du disque pour plusieurs sites
     * @param {string[]} siteNames - Liste des noms de sites
     * @returns {Promise<Map<string,number>>} Map des utilisations par site
     */
    async getMultipleUsage(siteNames) {
        await this.updateIndexIfNeeded();
        
        const result = new Map();
        for (const siteName of siteNames) {
            const usage = this.usageIndex.get(siteName);
            if (usage !== undefined) {
                result.set(siteName, usage);
            }
        }
        return result;
    }
}

// Exporte une instance unique pour toute l'application
module.exports = new DiskUsage(); 