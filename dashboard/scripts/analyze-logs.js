const fs = require('fs');
const path = require('path');

function analyzeLogs(logFile, options = {}) {
    console.log('Reading logs from:', logFile);
    
    let logs = fs.readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            try {
                // Try to parse as JSON first
                return JSON.parse(line);
            } catch (e) {
                // If not JSON, try to parse the log line format
                const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d+) (\w+): (.+)$/);
                if (match) {
                    return {
                        timestamp: match[1],
                        level: match[2].toLowerCase(),
                        message: match[3],
                        metadata: {}
                    };
                }
                // Skip lines we can't parse
                return null;
            }
        })
        .filter(log => log !== null);

    console.log(`Successfully parsed ${logs.length} log entries`);

    // Filter by time range if specified
    if (options.startTime) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(options.startTime));
    }
    if (options.endTime) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(options.endTime));
    }

    // Filter by level if specified
    if (options.level) {
        logs = logs.filter(log => log.level === options.level);
    }

    // Analyze the logs
    const analysis = {
        // General statistics
        totalLogs: logs.length,
        byLevel: logs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        }, {}),

        // Error analysis
        errors: logs
            .filter(log => log.level === 'error')
            .map(log => ({
                timestamp: log.timestamp,
                message: log.message,
                stack: log.metadata?.error?.stack,
                context: log.metadata
            })),

        // Security events
        securityEvents: logs.filter(log => 
            log.message.toLowerCase().includes('authentication') ||
            log.message.toLowerCase().includes('authorized') ||
            log.message.toLowerCase().includes('login') ||
            log.message.toLowerCase().includes('access denied')
        ),

        // Performance metrics
        performance: logs
            .filter(log => log.metadata?.responseTime)
            .map(log => ({
                path: log.metadata?.url,
                responseTime: log.metadata.responseTime,
                timestamp: log.timestamp
            })),

        // User activity
        userActivity: logs
            .filter(log => log.metadata?.requestedBy || log.metadata?.username)
            .reduce((acc, log) => {
                const user = log.metadata?.requestedBy || log.metadata?.username;
                if (!acc[user]) acc[user] = [];
                acc[user].push({
                    timestamp: log.timestamp,
                    action: log.message,
                    path: log.metadata?.url
                });
                return acc;
            }, {}),

        // Website operations
        websiteOperations: logs
            .filter(log => log.metadata?.siteName)
            .reduce((acc, log) => {
                const site = log.metadata.siteName;
                if (!acc[site]) acc[site] = [];
                acc[site].push({
                    timestamp: log.timestamp,
                    operation: log.message,
                    user: log.metadata.requestedBy
                });
                return acc;
            }, {})
    };

    // Add some useful derived metrics
    analysis.errorRate = (analysis.errors.length / analysis.totalLogs * 100).toFixed(2) + '%';
    analysis.securityEventRate = (analysis.securityEvents.length / analysis.totalLogs * 100).toFixed(2) + '%';
    
    if (analysis.performance.length > 0) {
        analysis.averageResponseTime = (
            analysis.performance.reduce((sum, p) => sum + p.responseTime, 0) / 
            analysis.performance.length
        ).toFixed(2) + 'ms';
    }

    return analysis;
}

// Example usage:
try {
    const analysis = analyzeLogs(path.join(__dirname, '../logs/combined.log'), {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endTime: new Date()
    });

    console.log('\nLog Analysis Results:');
    console.log('===================');
    console.log('\nGeneral Statistics:');
    console.log('------------------');
    console.log('Total logs:', analysis.totalLogs);
    console.log('Logs by level:', analysis.byLevel);
    console.log('Error rate:', analysis.errorRate);

    console.log('\nError Analysis:');
    console.log('--------------');
    console.log('Number of errors:', analysis.errors.length);
    if (analysis.errors.length > 0) {
        console.log('Latest errors:');
        analysis.errors.slice(-5).forEach(error => {
            console.log(`- ${error.timestamp}: ${error.message}`);
        });
    }

    console.log('\nSecurity Analysis:');
    console.log('-----------------');
    console.log('Security events:', analysis.securityEvents.length);
    console.log('Security event rate:', analysis.securityEventRate);
    if (analysis.securityEvents.length > 0) {
        console.log('Latest security events:');
        analysis.securityEvents.slice(-5).forEach(event => {
            console.log(`- ${event.timestamp}: ${event.message}`);
        });
    }

    console.log('\nPerformance Analysis:');
    console.log('--------------------');
    if (analysis.performance.length > 0) {
        console.log('Average response time:', analysis.averageResponseTime);
    }

    console.log('\nUser Activity:');
    console.log('--------------');
    const userActivityCounts = Object.entries(analysis.userActivity)
        .map(([user, actions]) => ({ user, count: actions.length }))
        .sort((a, b) => b.count - a.count);
    console.log('Most active users:', userActivityCounts.slice(0, 5));

    console.log('\nWebsite Operations:');
    console.log('------------------');
    const websiteOperationCounts = Object.entries(analysis.websiteOperations)
        .map(([site, ops]) => ({ site, count: ops.length }))
        .sort((a, b) => b.count - a.count);
    console.log('Most operated websites:', websiteOperationCounts.slice(0, 5));

} catch (error) {
    if (error.code === 'ENOENT') {
        console.error('Log file not found. Please ensure the logs directory exists and contains combined.log');
    } else {
        console.error('Error analyzing logs:', error);
    }
} 