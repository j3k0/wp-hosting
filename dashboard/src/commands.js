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
     * @param {string} [clientId] - Optional client ID to filter websites
     * @returns {Promise<string[]>} Array of website names
     */
    async listWebsites(clientId = null) {
        try {
            const args = ['--enabled'];
            if (clientId) {
                args.push(`wp.${clientId}`);
            }

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
            const { stdout } = await this.executeScript('info', [siteName]);
            console.log('Raw info output:', stdout);
            const parsedInfo = this.parseInfoOutput(stdout);
            console.log('Parsed info:', parsedInfo);
            return parsedInfo;
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
            raw: output
        };

        let currentSection = null;
        const lines = output.split('\n');
        console.log('Number of lines to parse:', lines.length);

        for (const line of lines) {
            if (line.includes('** Website URL **')) {
                console.log('Found Website URL section');
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
}

module.exports = new Commands(); 