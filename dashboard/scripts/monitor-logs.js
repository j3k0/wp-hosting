const fs = require('fs');
const path = require('path');
const { logger } = require('../src/utils/logger');

function monitorLogs(logFile, options = {}) {
    const thresholds = {
        responseTime: options.responseTimeThreshold || 1000,
        errorRate: options.errorRatePerMinute || 10,
        diskUsagePercent: options.diskUsagePercent || 90
    };

    let errorCount = 0;
    const errorWindow = new Set();

    console.log(`Monitoring logs in ${logFile}`);
    console.log('Thresholds:', thresholds);

    fs.watch(logFile, (eventType, filename) => {
        if (eventType !== 'change') return;

        try {
            const content = fs.readFileSync(logFile, 'utf8');
            const lastLine = content.trim().split('\n').pop();
            const log = JSON.parse(lastLine);

            // Monitor response times
            if (log.metadata?.responseTime > thresholds.responseTime) {
                logger.warn('High response time detected', {
                    path: log.metadata.url,
                    responseTime: log.metadata.responseTime,
                    threshold: thresholds.responseTime
                });
            }

            // Monitor error rates
            if (log.level === 'error') {
                const now = Date.now();
                errorWindow.add(now);
                
                // Clean old errors (older than 1 minute)
                Array.from(errorWindow).forEach(timestamp => {
                    if (now - timestamp > 60000) errorWindow.delete(timestamp);
                });

                if (errorWindow.size > thresholds.errorRate) {
                    logger.warn('High error rate detected', {
                        errorsPerMinute: errorWindow.size,
                        threshold: thresholds.errorRate
                    });
                }
            }

            // Monitor disk usage
            if (log.metadata?.totalUsageBytes) {
                const usagePercent = (log.metadata.totalUsageBytes / options.totalDiskSpace) * 100;
                if (usagePercent > thresholds.diskUsagePercent) {
                    logger.warn('High disk usage detected', {
                        usagePercent,
                        threshold: thresholds.diskUsagePercent,
                        totalBytes: log.metadata.totalUsageBytes
                    });
                }
            }

            // Monitor security events
            if (log.message.includes('Unauthorized') || log.message.includes('Invalid credentials')) {
                logger.warn('Security event detected', {
                    event: log.message,
                    ip: log.metadata.ip,
                    user: log.metadata.username
                });
            }

        } catch (error) {
            if (error.code !== 'ENOENT') {  // Ignore file not found errors during file rotation
                logger.error('Error parsing log line', { 
                    error: error.message,
                    code: error.code
                });
            }
        }
    });
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Created logs directory:', logsDir);
}

// Usage
const logFile = path.join(__dirname, '../logs/combined.log');
console.log('Starting log monitor...');

monitorLogs(logFile, {
    responseTimeThreshold: 1000,    // 1 second
    errorRatePerMinute: 10,         // 10 errors per minute
    diskUsagePercent: 90,           // 90% disk usage
    totalDiskSpace: 1000000000000   // 1TB in bytes
});

console.log('Log monitor started. Press Ctrl+C to stop.'); 