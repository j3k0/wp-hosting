const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./utils/logger');
const { formatBytes } = require('./utils/formatBytes');

class DiskUsage {
    constructor() {
        this.cacheTimeout = 10 * 60 * 1000;
        this.diskUsageFile = path.join(__dirname, '../../disk-usage.log');
        this.lastUpdate = 0;
        this.usageIndex = new Map();
        
        logger.info('DiskUsage initialized', {
            cacheTimeout: this.cacheTimeout,
            diskUsageFile: this.diskUsageFile,
            cacheTimeoutMinutes: this.cacheTimeout / 60000
        });
    }

    /**
     * Gets disk usage for a specific site or all sites
     * @param {string} [siteName] - Optional site name
     * @returns {Promise<number|Map<string,number>>} Usage in bytes
     */
    async getUsage(siteName = null) {
        await this.updateIndexIfNeeded();

        if (siteName) {
            const usage = this.usageIndex.get(siteName);
            if (usage === undefined) {
                logger.warn('No disk usage data found for site', { siteName });
                throw new Error(`No disk usage data found for site: ${siteName}`);
            }
            
            logger.debug('Retrieved disk usage for site', {
                siteName,
                usageBytes: usage,
                formattedUsage: formatBytes(usage)
            });
            
            return usage;
        }

        logger.debug('Retrieved all disk usage data', {
            siteCount: this.usageIndex.size,
            totalUsageBytes: Array.from(this.usageIndex.values()).reduce((a, b) => a + b, 0)
        });

        return this.usageIndex;
    }

    /**
     * Updates the disk usage index if cache is expired
     * @private
     */
    async updateIndexIfNeeded() {
        const now = Date.now();
        if (now - this.lastUpdate < this.cacheTimeout) {
            logger.debug('Skipping index update - cache still valid', {
                lastUpdate: new Date(this.lastUpdate).toISOString(),
                nextUpdate: new Date(this.lastUpdate + this.cacheTimeout).toISOString(),
                timeRemaining: (this.lastUpdate + this.cacheTimeout - now) / 1000
            });
            return;
        }

        try {
            const startTime = process.hrtime();
            logger.info('Starting disk usage index update');
            
            const content = await fs.readFile(this.diskUsageFile, 'utf8');
            const newIndex = new Map();
            let processedLines = 0;
            let skippedLines = 0;
            let totalBytes = 0;

            content.split('\n').forEach(line => {
                processedLines++;
                const [usage, path] = line.trim().split(/\s+/);
                if (!usage || !path) {
                    skippedLines++;
                    return;
                }

                const siteName = path.split('/')[0];
                if (!siteName) {
                    skippedLines++;
                    return;
                }

                const usageBytes = parseInt(usage, 10);
                if (!isNaN(usageBytes)) {
                    newIndex.set(siteName, usageBytes);
                    totalBytes += usageBytes;
                }
            });

            this.usageIndex = newIndex;
            this.lastUpdate = now;

            const [seconds, nanoseconds] = process.hrtime(startTime);
            const duration = seconds + nanoseconds / 1e9;

            logger.info('Disk usage index updated', {
                totalLines: processedLines,
                skippedLines,
                validEntries: newIndex.size,
                totalUsageBytes: totalBytes,
                formattedTotalUsage: formatBytes(totalBytes),
                averageUsageBytes: Math.round(totalBytes / newIndex.size),
                updateDurationSeconds: duration.toFixed(3),
                nextUpdate: new Date(now + this.cacheTimeout).toISOString()
            });
        } catch (error) {
            logger.error('Failed to update disk usage index', {
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                },
                diskUsageFile: this.diskUsageFile
            });
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
        logger.info('Forcing disk usage index update');
        this.lastUpdate = 0;
        await this.updateIndexIfNeeded();
    }

    /**
     * Gets disk usage for multiple sites
     * @param {string[]} siteNames - Array of site names
     * @returns {Promise<Map<string,number>>} Map of site usages
     */
    async getMultipleUsage(siteNames) {
        const startTime = process.hrtime();
        logger.info('Getting disk usage for multiple sites', {
            requestedSites: siteNames.length
        });

        await this.updateIndexIfNeeded();
        
        const result = new Map();
        let foundCount = 0;
        let missingCount = 0;
        let totalBytes = 0;

        for (const siteName of siteNames) {
            const usage = this.usageIndex.get(siteName);
            if (usage !== undefined) {
                result.set(siteName, usage);
                totalBytes += usage;
                foundCount++;
            } else {
                missingCount++;
                logger.debug('No disk usage data for site', { siteName });
            }
        }

        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds + nanoseconds / 1e9;

        logger.info('Retrieved multiple site disk usage', {
            requestedCount: siteNames.length,
            foundCount,
            missingCount,
            totalUsageBytes: totalBytes,
            formattedTotalUsage: formatBytes(totalBytes),
            averageUsageBytes: Math.round(totalBytes / foundCount),
            durationSeconds: duration.toFixed(3)
        });

        return result;
    }
}

// Export a singleton instance
module.exports = new DiskUsage(); 