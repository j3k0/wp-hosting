import { API } from './api.js';
import { Templates } from './templates.js';
import { render } from '../main.js';
import { Notifications } from './utils.js';
import { showConfirmation } from './utils.js';

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Add utility functions at the top
const showError = (error, context) => {
    console.error(`${context}:`, error);
    Notifications.error(`${context}: ${error.message}`);
};

const handleAPIRequest = async (apiCall, errorContext) => {
    try {
        return await apiCall();
    } catch (error) {
        showError(error, errorContext);
        throw error;
    }
};

// Add this helper function at the top with the other utility functions
const refreshServiceStatus = async (fullSiteName) => {
    try {
        const info = await API.get(`websites/${fullSiteName}/info`);
        
        // Find the services container and update it
        const servicesContainer = document.querySelector('.card.mb-3 .row.g-3');
        if (servicesContainer && info.services) {
            // Define the order of services
            const serviceOrder = ['webserver', 'database', 'phpmyadmin', 'sftp', 'backup'];
            
            // Create HTML for services in the specified order
            const servicesHtml = serviceOrder.map(serviceKey => {
                const status = info.services[serviceKey] || 'Unknown';
                const displayName = {
                    'webserver': 'Webserver',
                    'database': 'Database',
                    'phpmyadmin': 'phpMyAdmin',
                    'sftp': 'SFTP',
                    'backup': 'Backup'
                }[serviceKey];

                const serviceData = {
                    name: displayName,
                    status: status,
                    isUp: status === 'Up',
                    isDisabled: status === 'Disabled',
                    statusColor: status === 'Up' ? 'green' : 
                                status === 'Disabled' ? 'black' : 'red'
                };
                
                return Templates.serviceStatusCard(serviceData);
            }).join('');
            
            servicesContainer.innerHTML = servicesHtml;
        }
    } catch (error) {
        showError(error, 'Failed to refresh service status');
    }
};

export const Handlers = {
    async login() {
        render(Templates.login);
        
        document.getElementById('login').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                if (!username || !password) {
                    throw new Error('Please enter both username and password');
                }

                const data = await API.post('login', { username, password });
                window.userData = data;
                window.router.navigate(data.isAdmin ? '/customers' : `/websites/${data.clientId}`);
            } catch (error) {
                showError(error, 'Login failed');
                // Clear password field on error
                document.getElementById('password').value = '';
            }
        });
    },

    async customers() {
        const { customers } = await handleAPIRequest(
            () => API.get('customers'),
            'Failed to load customers'
        );
        render(Templates.customers, { customers });
    },

    async websites({ data }) {
        const response = await handleAPIRequest(
            () => API.get(`websites/${data.customerId}`),
            'Failed to load websites'
        );

        const sites = response.sites.map(site => ({
            siteName: site.name.split('.').slice(2).join('.'),
            usage: formatBytes(site.usage)
        }));

        render(Templates.websites, { 
            customerId: data.customerId, 
            sites,
            userData: window.userData 
        });
    },

    async websiteInfo({ data }) {
        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
        const info = await handleAPIRequest(
            () => API.get(`websites/${fullSiteName}/info`),
            'Failed to load website information'
        );
        
        console.log('Frontend received info:', info);
        
        // If we have structured data, use it; otherwise use raw
        const templateData = {
            customerId: data.customerId,
            siteName: data.siteName,
            userData: window.userData,
            services: info.services
        };

        if (info.urls?.length || info.phpmyadmin?.url || info.sftp?.host || info.dns?.length) {
            // Use structured data
            Object.assign(templateData, {
                urls: info.urls,
                phpmyadmin: info.phpmyadmin,
                sftp: info.sftp,
                dns: info.dns
            });
        } else {
            // Use raw data
            templateData.raw = info.raw;
        }

        console.log('Template data being rendered:', templateData);
        render(Templates.websiteInfo, templateData);

        // Add restart button handler
        const restartBtn = document.getElementById('restartWebsite');
        if (restartBtn) {
            restartBtn.addEventListener('click', async () => {
                try {
                    const confirmed = await showConfirmation({
                        type: 'warning',
                        icon: 'refresh',
                        title: 'Restart Website?',
                        message: 'The website will be temporarily unavailable during the restart.',
                        confirmText: 'Restart'
                    });

                    if (confirmed) {
                        restartBtn.disabled = true;
                        restartBtn.innerHTML = '<i class="ti ti-loader ti-spin me-2"></i>Restarting...';
                        
                        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
                        
                        // Start periodic status refresh
                        const refreshInterval = setInterval(() => {
                            refreshServiceStatus(fullSiteName);
                        }, 2000); // Refresh every 2 seconds
                        
                        await API.restartWebsite(fullSiteName);
                        
                        // Continue refreshing for a few more seconds after restart
                        setTimeout(() => {
                            clearInterval(refreshInterval);
                            // One final refresh after services should be up
                            refreshServiceStatus(fullSiteName);
                        }, 10000); // Stop refreshing after 10 seconds
                        
                        Notifications.success('Website restarted successfully');
                    }
                } catch (error) {
                    showError(error, 'Failed to restart website');
                } finally {
                    restartBtn.disabled = false;
                    restartBtn.innerHTML = '<i class="ti ti-refresh me-2"></i>Restart';
                }
            });
        }

        // Add start button handler
        const startBtn = document.getElementById('startWebsite');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                try {
                    const confirmed = await showConfirmation({
                        type: 'success',
                        icon: 'player-play',
                        title: 'Start Website?',
                        message: 'All services will be started.',
                        confirmText: 'Start'
                    });

                    if (confirmed) {
                        startBtn.disabled = true;
                        startBtn.innerHTML = '<i class="ti ti-loader ti-spin me-2"></i>Starting...';
                        
                        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
                        
                        // Start periodic status refresh
                        const refreshInterval = setInterval(() => {
                            refreshServiceStatus(fullSiteName);
                        }, 2000);
                        
                        await API.startWebsite(fullSiteName);
                        
                        // Continue refreshing for a few more seconds after start
                        setTimeout(() => {
                            clearInterval(refreshInterval);
                            refreshServiceStatus(fullSiteName);
                        }, 10000);
                        
                        Notifications.success('Website started successfully');
                    }
                } catch (error) {
                    showError(error, 'Failed to start website');
                } finally {
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="ti ti-player-play me-2"></i>Start';
                }
            });
        }

        // Add stop button handler
        const stopBtn = document.getElementById('stopWebsite');
        if (stopBtn) {
            stopBtn.addEventListener('click', async () => {
                try {
                    const confirmed = await showConfirmation({
                        type: 'danger',
                        icon: 'player-stop',
                        title: 'Stop Website?',
                        message: 'All services will be stopped. The website will be unavailable.',
                        confirmText: 'Stop'
                    });

                    if (confirmed) {
                        stopBtn.disabled = true;
                        stopBtn.innerHTML = '<i class="ti ti-loader ti-spin me-2"></i>Stopping...';
                        
                        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
                        
                        // Start periodic status refresh
                        const refreshInterval = setInterval(() => {
                            refreshServiceStatus(fullSiteName);
                        }, 2000);
                        
                        await API.stopWebsite(fullSiteName);
                        
                        // Continue refreshing for a few more seconds after stop
                        setTimeout(() => {
                            clearInterval(refreshInterval);
                            refreshServiceStatus(fullSiteName);
                        }, 10000);
                        
                        Notifications.success('Website stopped successfully');
                    }
                } catch (error) {
                    showError(error, 'Failed to stop website');
                } finally {
                    stopBtn.disabled = false;
                    stopBtn.innerHTML = '<i class="ti ti-player-stop me-2"></i>Stop';
                }
            });
        }
    },

    async users() {
        const users = await handleAPIRequest(
            () => API.get('users'),
            'Failed to load users'
        );
        render(Templates.users, { users });

        // Fix: Bind the correct this context
        Handlers.setupUserFormHandlers();
    },

    // Make setupUserFormHandlers a proper method of the Handlers object
    setupUserFormHandlers() {
        const form = document.getElementById('addUserForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const clientId = formData.get('clientId');

                try {
                    await API.post('users', {
                        username: clientId,
                        password: formData.get('password'),
                        clientId: clientId,
                        isAdmin: false
                    });

                    // Close modal and reset form
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                    modal.hide();
                    form.reset();
                    
                    // Refresh users list
                    await Handlers.users();  // Use Handlers instead of this
                    
                    Notifications.success('User created successfully');
                } catch (error) {
                    showError(error, 'Failed to create user');
                }
            });
        }

        // Add event handlers for reset password and delete buttons
        document.addEventListener('click', async (e) => {
            const resetBtn = e.target.closest('[data-action="reset-password"]');
            const deleteBtn = e.target.closest('[data-action="delete-user"]');

            if (resetBtn) {
                const username = resetBtn.dataset.username;
                await Handlers.handleResetPassword(username);
            }
            else if (deleteBtn) {
                const username = deleteBtn.dataset.username;
                await Handlers.handleDeleteUser(username);
            }
        });
    },

    async handleResetPassword(username) {
        try {
            const confirmed = await showConfirmation({
                type: 'warning',
                icon: 'key',
                title: 'Reset Password',
                message: `Are you sure you want to reset the password for ${username}?`,
                confirmText: 'Reset Password'
            });

            if (confirmed) {
                const password = prompt('Enter new password for ' + username);
                if (password) {
                    await API.post(`users/${username}/reset-password`, { password });
                    Notifications.success('Password updated successfully');
                }
            }
        } catch (error) {
            showError(error, 'Failed to reset password');
        }
    },

    async handleDeleteUser(username) {
        try {
            const confirmed = await showConfirmation({
                type: 'danger',
                icon: 'trash',
                title: 'Delete User',
                message: `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
                confirmText: 'Delete'
            });

            if (confirmed) {
                await API.delete(`users/${username}`);
                Notifications.success('User deleted successfully');
                await Handlers.users();  // Use Handlers instead of this
            }
        } catch (error) {
            showError(error, 'Failed to delete user');
        }
    },

    websiteLogs: async function({ data }) {
        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
        const lines = document.getElementById('logLines')?.value || 100;
        
        try {
            await Handlers.loadLogs(fullSiteName, lines, data);
            Notifications.info('Logs refreshed');
        } catch (error) {
            showError(error, 'Failed to load logs');
        }
    },

    loadLogs: async function(fullSiteName, lines, data) {
        const { logs } = await handleAPIRequest(
            () => API.get(`websites/${fullSiteName}/logs?lines=${lines}`),
            'Failed to load logs'
        );

        render(Templates.websiteLogs, {
            customerId: data.customerId,
            siteName: data.siteName,
            logs,
            selectedLines: lines
        });

        // Re-attach event handlers after render
        Handlers.setupLogHandlers(fullSiteName, data);
    },

    setupLogHandlers: function(fullSiteName, data) {
        const lineSelect = document.getElementById('logLines');
        const refreshBtn = document.getElementById('refreshLogs');

        if (lineSelect) {
            lineSelect.addEventListener('change', () => {
                Handlers.loadLogs(fullSiteName, lineSelect.value, data);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const currentLines = document.getElementById('logLines')?.value || 100;
                Handlers.loadLogs(fullSiteName, currentLines, data);
            });
        }
    }
}; 