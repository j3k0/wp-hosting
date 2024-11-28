const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const { logger } = require('./utils/logger');
const execAsync = util.promisify(exec);
const Convert = require('ansi-to-html');
const { formatBytes } = require('./utils/formatBytes');

// Path to the wp-hosting scripts directory
const SCRIPTS_DIR = path.join(__dirname, '../../');

class Commands {
    constructor() {
        // Store paths to all available scripts
        this.scripts = {
            ls: path.join(SCRIPTS_DIR, 'ls.sh'),
            info: path.join(SCRIPTS_DIR, 'info.sh'),
            quota: path.join(SCRIPTS_DIR, 'quota.sh'),
            backup: path.join(SCRIPTS_DIR, 'backup.sh'),
            restore: path.join(SCRIPTS_DIR, 'restore.sh'),
            logs_webserver: path.join(SCRIPTS_DIR, 'logs_wordpress.sh'),
            logs_database: path.join(SCRIPTS_DIR, 'logs_db.sh'),
            dockerCompose: path.join(SCRIPTS_DIR, 'docker-compose.sh'),
            disable: path.join(SCRIPTS_DIR, 'disable.sh'),
            delete: path.join(SCRIPTS_DIR, 'delete.sh'),
        };

        // Initialize ANSI converter with options
        this.converter = new Convert({
            fg: '#000',
            bg: '#FFF',
            newline: true,
            escapeXML: true,
            stream: false
        });
    }

    /**
     * Execute a script with given arguments
     * @param {string} scriptName - Name of the script to execute
     * @param {string[]} args - Array of arguments
     * @returns {Promise<{stdout: string, stderr: string}>}
     */
    async executeScript(scriptName, args = []) {
        const scriptPath = this.scripts[scriptName];
        if (!scriptPath) {
            logger.error('Script not found', {
                scriptName,
                availableScripts: Object.keys(this.scripts)
            });
            throw new Error(`Script "${scriptName}" not found`);
        }

        const command = `${scriptPath} ${args.join(' ')}`;
        logger.debug('Executing command', {
            scriptName,
            command,
            args
        });
        
        try {
            const result = await execAsync(command);
            logger.debug('Command executed successfully', {
                scriptName,
                stdout: result.stdout.substring(0, 1000), // Limit log size
                outputLength: result.stdout.length
            });
            return result;
        } catch (error) {
            logger.error('Command execution failed', {
                scriptName,
                command,
                error: {
                    message: error.message,
                    code: error.code,
                    stdout: error.stdout?.substring(0, 1000),
                    stderr: error.stderr?.substring(0, 1000)
                }
            });
            throw error;
        }
    }

    /**
     * List websites
     * @param {string[]} args - Arguments to pass to ls.sh
     * @returns {Promise<string[]>} Array of website names
     */
    async listWebsites(args = []) {
        try {
            logger.info('Listing websites', { args });
            const { stdout } = await this.executeScript('ls', args);
            const websites = stdout.trim().split('\n').filter(Boolean);
            logger.debug('Websites listed successfully', {
                count: websites.length,
                websites: websites.length > 10 ? 
                    websites.slice(0, 10).concat(['...']) : 
                    websites
            });
            return websites;
        } catch (error) {
            logger.error('Failed to list websites', {
                args,
                error: {
                    message: error.message,
                    code: error.code
                }
            });
            throw new Error('Failed to list websites');
        }
    }

    /**
     * List all customers (extracted from website names)
     * @returns {Promise<string[]>} Array of customer IDs
     */
    async listCustomers() {
        try {
            logger.info('Listing customers');
            const sites = await this.listWebsites();
            const customers = [...new Set(sites
                .map(site => {
                    const parts = site.split('.');
                    return parts.length >= 2 ? parts[1] : null;
                })
                .filter(Boolean))];

            logger.debug('Customers listed successfully', {
                customerCount: customers.length,
                customers
            });

            return customers;
        } catch (error) {
            logger.error('Failed to list customers', {
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            });
            throw new Error('Failed to list customers');
        }
    }

    /**
     * Get detailed information about a website
     * @param {string} siteName - Full website name
     * @returns {Promise<Object>} Parsed website information
     */
    async getWebsiteInfo(siteName) {
        logger.info('Getting website info', { siteName });
        try {
            const [infoOutput, statuses] = await Promise.all([
                this.executeScript('info', [siteName]),
                this.getServiceStatuses(siteName)
            ]);
            
            const parsedInfo = this.parseInfoOutput(infoOutput.stdout);
            logger.debug('Website info retrieved', {
                siteName,
                hasUrls: parsedInfo.urls?.length > 0,
                hasPhpMyAdmin: !!parsedInfo.phpmyadmin?.url,
                services: statuses
            });
            return {
                ...parsedInfo,
                services: statuses
            };
        } catch (error) {
            logger.error('Failed to get website info', {
                siteName,
                error: {
                    message: error.message,
                    code: error.code
                }
            });
            throw new Error('Failed to get website information');
        }
    }

    /**
     * Parse the output of info.sh
     * @private
     * @param {string} output - Raw output from info.sh
     * @returns {Object} Parsed information and raw output
     */
    parseInfoOutput(output) {
        logger.debug('Starting to parse info output', {
            outputLength: output.length
        });

        const info = {
            urls: [],
            phpmyadmin: {
                url: '',
                username: '',
                password: ''
            },
            sftp: {
                host: '',
                port: '',
                username: '',
                password: ''
            },
            dns: [],
            state: 'enabled',
            raw: output
        };

        let currentSection = null;
        const lines = output.split('\n');
        logger.debug('Parsing info output lines', {
            lineCount: lines.length
        });

        for (const line of lines) {
            if (line.includes('** State **')) {
                currentSection = 'state';
            }
            else if (line.includes('** Website URL **')) {
                currentSection = 'urls';
            }
            else if (line.includes('** phpMyAdmin **')) {
                logger.debug('Found phpMyAdmin section');
                currentSection = 'phpmyadmin';
            }
            else if (line.includes('** SFTP **')) {
                logger.debug('Found SFTP section');
                currentSection = 'sftp';
            }
            else if (line.includes('** DNS **')) {
                logger.debug('Found DNS section');
                currentSection = 'dns';
            }
            else if (line.trim().startsWith('- http')) {
                const url = line.trim().replace('- ', '');
                logger.debug('Found URL', {
                    url,
                    section: currentSection
                });
                if (currentSection === 'urls') {
                    info.urls.push(url);
                } else if (currentSection === 'phpmyadmin') {
                    info.phpmyadmin.url = url;
                }
            }
            else if (line.includes('phpMyAdmin Username:')) {
                info.phpmyadmin.username = line.split(':')[1].trim();
                logger.debug('Found phpMyAdmin username');
            }
            else if (line.includes('phpMyAdmin Password:')) {
                info.phpmyadmin.password = line.split(':')[1].trim();
                logger.debug('Found phpMyAdmin password');
            }
            else if (line.includes('SFTP Host:')) {
                info.sftp.host = line.split(':')[1].trim();
                logger.debug('Found SFTP host');
            }
            else if (line.includes('SFTP Port:')) {
                info.sftp.port = line.split(':')[1].trim();
                logger.debug('Found SFTP port');
            }
            else if (line.includes('SFTP Username:')) {
                info.sftp.username = line.split(':')[1].trim();
                logger.debug('Found SFTP username');
            }
            else if (line.includes('SFTP Password:')) {
                info.sftp.password = line.split(':')[1].trim();
                logger.debug('Found SFTP password');
            }
            else if (currentSection === 'dns' && line.trim() && !line.startsWith('```')) {
                info.dns.push(line.trim());
                logger.debug('Added DNS entry');
            }
            else if (currentSection === 'state') {
                const state = line.trim();
                if (state === 'disabled' || state === 'enabled') {
                    info.state = state;
                    logger.debug('Found website state', { state });
                }
            }
        }

        logger.debug('Info parsing completed', {
            hasUrls: info.urls.length > 0,
            hasPhpMyAdmin: !!info.phpmyadmin.url,
            hasSftp: !!info.sftp.host,
            hasDns: info.dns.length > 0,
            state: info.state
        });

        // Only return raw if no structured data was parsed
        if (info.urls.length === 0 && 
            !info.phpmyadmin.url && 
            !info.sftp.host && 
            info.dns.length === 0) {
            logger.warn('No structured data found in info output');
            return { raw: output };
        }

        return info;
    }

    /**
     * Get WordPress logs for a site
     * @param {string} siteName - Full website name
     * @param {number} lines - Number of lines to tail
     * @returns {Promise<string>} Formatted log output
     */
    async getWordPressLogs(siteName, lines = 100) {
        try {
            logger.info('Getting WordPress logs', {
                siteName,
                lines
            });

            const { stdout } = await this.executeScript('logs', [siteName, `--tail=${lines}`]);
            
            logger.debug('WordPress logs retrieved', {
                siteName,
                outputLength: stdout.length
            });

            return this.converter.toHtml(stdout);
        } catch (error) {
            logger.error('Failed to get WordPress logs', {
                siteName,
                lines,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to get WordPress logs');
        }
    }

    async restartWebsite(siteName) {
        try {
            logger.info('Restarting website', { siteName });

            const { stdout } = await this.executeScript('dockerCompose', [siteName, 'restart', 'wordpress', 'db']);
            
            logger.info('Website restarted successfully', {
                siteName,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to restart website', {
                siteName,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to restart website');
        }
    }

    async getDockerContainers() {
        try {
            logger.info('Getting Docker containers status');

            const { stdout } = await execAsync('docker ps -a --format json');
            const containers = stdout.trim().split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));

            logger.debug('Docker containers retrieved', {
                containerCount: containers.length
            });

            return containers;
        } catch (error) {
            logger.error('Failed to get Docker containers status', {
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to get docker containers status');
        }
    }

    async getServiceStatuses(siteName) {
        try {
            logger.info('Getting service statuses', { siteName });
            const [containers, isBackupRunning] = await Promise.all([
                this.getDockerContainers(),
                this.isBackupInProgress(siteName.replace(/\./g, ''))
            ]);
            
            // Initialize default statuses
            const statuses = {
                backup: 'Disabled',
                database: 'Disabled',
                phpmyadmin: 'Disabled',
                sftp: 'Disabled',
                webserver: 'Disabled'
            };

            // Filter containers for this site
            const siteContainers = containers.filter(container => {
                const labels = container.Labels.split(',').reduce((acc, label) => {
                    const [key, value] = label.split('=');
                    acc[key] = value;
                    return acc;
                }, {});
                
                return labels['com.docker.compose.project.working_dir'] === `/apps/wp-hosting/${siteName}`;
            });

            // Map container states to service statuses
            for (const container of siteContainers) {
                let serviceName = null;
                
                // Determine service type from container name
                if (container.Names.includes('_wordpress_')) serviceName = 'webserver';
                else if (container.Names.includes('_db_')) serviceName = 'database';
                else if (container.Names.includes('_backup_')) serviceName = 'backup';
                else if (container.Names.includes('_phpmyadmin_')) serviceName = 'phpmyadmin';
                else if (container.Names.includes('_sftp_')) serviceName = 'sftp';

                if (serviceName) {
                    // Map Docker states to our standard states
                    if (container.State === 'running') {
                        if (serviceName === 'backup' && isBackupRunning) {
                            statuses[serviceName] = 'In Progress...';
                        } else {
                            statuses[serviceName] = 'Up';
                        }
                    } else if (container.State === 'exited') {
                        statuses[serviceName] = 'Down';
                    } else {
                        statuses[serviceName] = container.State;
                    }
                }
            }

            logger.debug('Service statuses retrieved', {
                siteName,
                statuses,
                containerCount: siteContainers.length
            });
            return statuses;
        } catch (error) {
            logger.error('Failed to get service statuses', {
                siteName,
                error: {
                    message: error.message,
                    code: error.code
                }
            });
            throw new Error('Failed to get service statuses');
        }
    }

    async stopWebsite(siteName) {
        try {
            logger.info('Stopping website', { siteName });

            const { stdout } = await this.executeScript('dockerCompose', [siteName, 'stop']);
            
            logger.info('Website stopped successfully', {
                siteName,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to stop website', {
                siteName,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to stop website');
        }
    }

    async startWebsite(siteName) {
        try {
            logger.info('Starting website', { siteName });

            const { stdout } = await this.executeScript('dockerCompose', [siteName, 'up', '-d']);
            
            logger.info('Website started successfully', {
                siteName,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to start website', {
                siteName,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to start website');
        }
    }

    async enableWebsite(siteName) {
        try {
            logger.info('Enabling website', { siteName });

            const { stdout } = await this.executeScript('disable', [siteName, '--enable']);
            
            logger.info('Website enabled successfully', {
                siteName,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to enable website', {
                siteName,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to enable website');
        }
    }

    async disableWebsite(siteName) {
        try {
            logger.info('Disabling website', { siteName });

            const { stdout } = await this.executeScript('disable', [siteName]);
            
            logger.info('Website disabled successfully', {
                siteName,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to disable website', {
                siteName,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to disable website');
        }
    }

    async isBackupInProgress(siteName) {
        try {
            const { stdout } = await execAsync(`docker exec ${siteName}_backup_1 ps aux`);
            logger.debug('Checking backup status', {
                siteName,
                processOutput: stdout.substring(0, 1000)
            });

            const isRunning = stdout.includes('/usr/bin/backup') || 
                            stdout.includes('tar ') ||
                            stdout.includes('gzip ') ||
                            stdout.includes('/usr/bin/restore ') ||
                            stdout.includes('mysqldump');

            logger.debug('Backup status checked', {
                siteName,
                isRunning
            });

            return isRunning;
        } catch (error) {
            logger.error('Error checking backup status', {
                siteName,
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            });
            return false;
        }
    }

    async startBackup(siteName) {
        try {
            logger.info('Starting website backup', { siteName });

            const { stdout } = await this.executeScript('backup', [siteName]);
            
            logger.info('Backup started successfully', {
                siteName,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to start backup', {
                siteName,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            throw new Error('Failed to start backup: ' + error.message);
        }
    }

    async listBackups(siteName) {
        try {
            logger.info('Listing backups', { siteName });
            // Call restore.sh with just the site name to get the list
            const { stdout, stderr } = await this.executeScript('restore', [siteName]);
            
            // Parse the output to extract backup dates
            const backups = [];
            const lines = stdout.split('\n');
            let foundBackups = false;
            
            for (const line of lines) {
                // Skip lines until we find "Available backups:"
                if (line.trim() === 'Available backups:') {
                    foundBackups = true;
                    continue;
                }
                
                // Stop when we hit an empty line after finding backups
                if (foundBackups && line.trim() === '') {
                    break;
                }
                
                // Add backup dates to array
                if (foundBackups) {
                    const backup = line.trim();
                    if (backup.match(/^\d{8}-\d{6}$/)) {  // Format: YYYYMMDD-HHMMSS
                        backups.push(backup);
                    }
                }
            }

            // If we didn't find any backups section, the command probably failed
            if (!foundBackups) {
                logger.warn('No backup section found in output', {
                    siteName,
                    stdout,
                    stderr
                });
                throw new Error('Failed to parse backup list');
            }

            backups.reverse();
            
            logger.info('Backups listed successfully', {
                siteName,
                backupCount: backups.length,
                oldestBackup: backups[backups.length - 1],
                newestBackup: backups[0]
            });

            return backups;
        } catch (error) {
            logger.error('Failed to list backups', {
                siteName,
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            });
            throw new Error(`Failed to list backups: ${error.message}`);
        }
    }

    async restoreBackup(siteName, backupDate) {
        try {
            logger.info('Starting backup restore', {
                siteName,
                backupDate
            });

            const { stdout } = await this.executeScript('restore', [siteName, backupDate]);
            
            logger.info('Backup restore initiated successfully', {
                siteName,
                backupDate,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to restore backup', {
                siteName,
                backupDate,
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            });
            throw new Error('Failed to restore backup: ' + error.message);
        }
    }

    async getBackupSize(siteName, backupDate) {
        try {
            logger.info('Calculating backup size', {
                siteName,
                backupDate
            });

            // Build the command to calculate total size
            const command = `du -cb $(find /backups/${siteName} -type f | sort | grep -B1000000 ${backupDate}) | tail -1 | awk '{print $1}'`;
            const { stdout } = await execAsync(command);
            
            // Parse the output as integer (bytes)
            const sizeInBytes = parseInt(stdout.trim(), 10);
            if (isNaN(sizeInBytes)) {
                throw new Error('Invalid size calculation result');
            }
            
            logger.info('Backup size calculated successfully', {
                siteName,
                backupDate,
                sizeInBytes,
                formattedSize: formatBytes(sizeInBytes)
            });

            return sizeInBytes;
        } catch (error) {
            logger.error('Failed to calculate backup size', {
                siteName,
                backupDate,
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            });
            throw new Error('Failed to calculate backup size');
        }
    }

    async getWebsiteLogs(siteName, lines = 100, scriptName = 'logs_webserver.sh') {
        try {
            logger.info('Fetching website logs', {
                siteName,
                lines,
                scriptType: scriptName
            });

            // Map the script name to the correct key
            const scriptKey = scriptName.replace('.sh', '');
            const { stdout } = await this.executeScript(scriptKey, [siteName, `--tail=${lines}`]);
            
            logger.debug('Logs retrieved successfully', {
                siteName,
                outputLength: stdout.length,
                scriptType: scriptName
            });

            return this.converter.toHtml(stdout);
        } catch (error) {
            logger.error('Failed to get logs', {
                siteName,
                scriptName,
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            });
            throw new Error(`Failed to get ${scriptName} logs`);
        }
    }

    async deleteWebsite(siteName) {
        try {
            logger.info('Website deletion initiated', { siteName });

            const { stdout } = await execAsync(`sudo ${this.scripts.delete} ${siteName} -y`);
            
            logger.info('Website deleted successfully', {
                siteName,
                output: stdout.substring(0, 1000)
            });

            return stdout;
        } catch (error) {
            logger.error('Failed to delete website', {
                siteName,
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            });
            throw new Error('Failed to delete website');
        }
    }
}

module.exports = new Commands(); 