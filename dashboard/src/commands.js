const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);
const Convert = require('ansi-to-html');

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
            logs: path.join(SCRIPTS_DIR, 'logs_wordpress.sh'),
            dockerCompose: path.join(SCRIPTS_DIR, 'docker-compose.sh'),
            disable: path.join(SCRIPTS_DIR, 'disable.sh'),
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
            throw new Error(`Script "${scriptName}" not found`);
        }

        const command = `${scriptPath} ${args.join(' ')}`;
        // console.log(`Executing command: ${command}`);
        
        try {
            const result = await execAsync(command);
            // console.log(`Command output:`, result.stdout);
            return result;
        } catch (error) {
            console.error(`Error executing ${scriptName}:`, {
                error: error.message,
                command,
                stdout: error.stdout,
                stderr: error.stderr
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
            const { stdout } = await this.executeScript('ls', args);
            return stdout.trim().split('\n').filter(Boolean);
        } catch (error) {
            console.error('Error listing websites:', error);
            throw new Error('Failed to list websites');
        }
    }

    /**
     * List all customers (extracted from website names)
     * @returns {Promise<string[]>} Array of customer IDs
     */
    async listCustomers() {
        try {
            const sites = await this.listWebsites();
            const customers = [...new Set(sites
                .map(site => {
                    const parts = site.split('.');
                    return parts.length >= 2 ? parts[1] : null;
                })
                .filter(Boolean))];
            return customers;
        } catch (error) {
            console.error('Error listing customers:', error);
            throw new Error('Failed to list customers');
        }
    }

    /**
     * Get detailed information about a website
     * @param {string} siteName - Full website name
     * @returns {Promise<Object>} Parsed website information
     */
    async getWebsiteInfo(siteName) {
        console.log(`Getting info for website: ${siteName}`);
        try {
            const [infoOutput, statuses] = await Promise.all([
                this.executeScript('info', [siteName]),
                this.getServiceStatuses(siteName)
            ]);
            
            const parsedInfo = this.parseInfoOutput(infoOutput.stdout);
            return {
                ...parsedInfo,
                services: statuses
            };
        } catch (error) {
            console.error('Error getting website info:', error);
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
        console.log('Starting to parse info output:', output);
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
        console.log('Number of lines to parse:', lines.length);

        for (const line of lines) {
            if (line.includes('** State **')) {
                currentSection = 'state';
            }
            else if (line.includes('** Website URL **')) {
                currentSection = 'urls';
            }
            else if (line.includes('** phpMyAdmin **')) {
                console.log('Found phpMyAdmin section');
                currentSection = 'phpmyadmin';
            }
            else if (line.includes('** SFTP **')) {
                console.log('Found SFTP section');
                currentSection = 'sftp';
            }
            else if (line.includes('** DNS **')) {
                console.log('Found DNS section');
                currentSection = 'dns';
            }
            else if (line.trim().startsWith('- http')) {
                const url = line.trim().replace('- ', '');
                console.log('Found URL:', url, 'in section:', currentSection);
                if (currentSection === 'urls') {
                    info.urls.push(url);
                } else if (currentSection === 'phpmyadmin') {
                    info.phpmyadmin.url = url;
                }
            }
            else if (line.includes('phpMyAdmin Username:')) {
                info.phpmyadmin.username = line.split(':')[1].trim();
                console.log('Found phpMyAdmin username:', info.phpmyadmin.username);
            }
            else if (line.includes('phpMyAdmin Password:')) {
                info.phpmyadmin.password = line.split(':')[1].trim();
                console.log('Found phpMyAdmin password');
            }
            else if (line.includes('SFTP Host:')) {
                info.sftp.host = line.split(':')[1].trim();
                console.log('Found SFTP host:', info.sftp.host);
            }
            else if (line.includes('SFTP Port:')) {
                info.sftp.port = line.split(':')[1].trim();
                console.log('Found SFTP port:', info.sftp.port);
            }
            else if (line.includes('SFTP Username:')) {
                info.sftp.username = line.split(':')[1].trim();
                console.log('Found SFTP username:', info.sftp.username);
            }
            else if (line.includes('SFTP Password:')) {
                info.sftp.password = line.split(':')[1].trim();
                console.log('Found SFTP password');
            }
            else if (currentSection === 'dns' && line.trim() && !line.startsWith('```')) {
                info.dns.push(line.trim());
                console.log('Added DNS line:', line.trim());
            }
            else if (currentSection === 'state') {
                const state = line.trim();
                if (state === 'disabled' || state === 'enabled') {
                    info.state = state;
                }
            }
        }

        console.log('Final parsed info structure:', {
            hasUrls: info.urls.length > 0,
            hasPhpMyAdmin: !!info.phpmyadmin.url,
            hasSftp: !!info.sftp.host,
            hasDns: info.dns.length > 0
        });

        // Only return raw if no structured data was parsed
        if (info.urls.length === 0 && 
            !info.phpmyadmin.url && 
            !info.sftp.host && 
            info.dns.length === 0) {
            console.log('No structured data found, returning raw output');
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
            const { stdout } = await this.executeScript('logs', [siteName, `--tail=${lines}`]);
            return this.converter.toHtml(stdout);
        } catch (error) {
            console.error('Error getting logs:', error);
            throw new Error('Failed to get WordPress logs');
        }
    }

    async restartWebsite(siteName) {
        try {
            const { stdout } = await this.executeScript('dockerCompose', [siteName, 'restart', 'wordpress', 'db']);
            return stdout;
        } catch (error) {
            console.error('Error restarting website:', error);
            throw new Error('Failed to restart website');
        }
    }

    async getDockerContainers() {
        try {
            const { stdout } = await execAsync('docker ps -a --format json');
            // Split by newline and parse each JSON object
            return stdout.trim().split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
        } catch (error) {
            console.error('Error getting docker containers:', error);
            throw new Error('Failed to get docker containers status');
        }
    }

    async getServiceStatuses(siteName) {
        try {
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

            return statuses;
        } catch (error) {
            console.error('Error getting service statuses:', error);
            throw new Error('Failed to get service statuses');
        }
    }

    async stopWebsite(siteName) {
        try {
            const { stdout } = await this.executeScript('dockerCompose', [siteName, 'stop']);
            return stdout;
        } catch (error) {
            console.error('Error stopping website:', error);
            throw new Error('Failed to stop website');
        }
    }

    async startWebsite(siteName) {
        try {
            const { stdout } = await this.executeScript('dockerCompose', [siteName, 'up', '-d']);
            return stdout;
        } catch (error) {
            console.error('Error starting website:', error);
            throw new Error('Failed to start website');
        }
    }

    async enableWebsite(siteName) {
        try {
            const { stdout } = await this.executeScript('disable', [siteName, '--enable']);
            return stdout;
        } catch (error) {
            console.error('Error enabling website:', error);
            throw new Error('Failed to enable website');
        }
    }

    async disableWebsite(siteName) {
        try {
            const { stdout } = await this.executeScript('disable', [siteName]);
            return stdout;
        } catch (error) {
            console.error('Error disabling website:', error);
            throw new Error('Failed to disable website');
        }
    }

    async isBackupInProgress(siteName) {
        try {
            const { stdout } = await execAsync(`docker exec ${siteName}_backup_1 ps aux`);
            console.log(`Checking backup status for ${siteName}:`, stdout);
            // If we see backup, tar, or mysqldump processes, a backup is in progress
            return stdout.includes('/usr/bin/backup') || 
                   stdout.includes('tar ') ||
                   stdout.includes('gzip ') ||
                   stdout.includes('/usr/bin/restore ') ||
                   stdout.includes('mysqldump');
        } catch (error) {
            console.error('Error checking backup status:', error);
            return false;
        }
    }

    async startBackup(siteName) {
        try {
            // Execute backup script from wp-hosting root
            const { stdout } = await this.executeScript('backup', [siteName]);
            return stdout;
        } catch (error) {
            console.error('Error starting backup:', error);
            throw new Error('Failed to start backup: ' + error.message);
        }
    }

    async listBackups(siteName) {
        try {
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
                console.error('No backup section found in output:', stdout);
                if (stderr) console.error('stderr:', stderr);
                throw new Error('Failed to parse backup list');
            }

            backups.reverse();
            
            return backups;
        } catch (error) {
            console.error('Error listing backups:', error);
            // Include more details in the error message
            throw new Error(`Failed to list backups: ${error.message}`);
        }
    }

    async restoreBackup(siteName, backupDate) {
        try {
            // Send the full backup date without truncating
            const { stdout } = await this.executeScript('restore', [siteName, backupDate]);
            return stdout;
        } catch (error) {
            console.error('Error restoring backup:', error);
            throw new Error('Failed to restore backup: ' + error.message);
        }
    }

    async getBackupSize(siteName, backupDate) {
        try {
            // Build the command to calculate total size
            const command = `du -cb $(find /backups/${siteName} -type f | sort | grep -B1000000 ${backupDate}) | tail -1 | awk '{print $1}'`;
            const { stdout } = await execAsync(command);
            
            // Parse the output as integer (bytes)
            const sizeInBytes = parseInt(stdout.trim(), 10);
            if (isNaN(sizeInBytes)) {
                throw new Error('Invalid size calculation result');
            }
            
            return sizeInBytes;
        } catch (error) {
            console.error('Error calculating backup size:', error);
            throw new Error('Failed to calculate backup size');
        }
    }
}

module.exports = new Commands(); 