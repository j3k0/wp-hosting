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
export const getServiceStatusData = (service, status) => {
    return {
        name: service,
        status: status,
        isUp: status === 'Up',
        isDisabled: status === 'Disabled',
        statusColor: status === 'Up' ? 'green' : 
                    status === 'Disabled' ? 'dark' : 'red',
        isAnimated: status !== 'Disabled'
    };
};

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

                return Templates.serviceStatusCard(getServiceStatusData(displayName, status));
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
        const loadWebsites = async (filter = 'all') => {
            const response = await handleAPIRequest(
                () => API.get(`websites/${data.customerId}?filter=${filter}`),
                'Failed to load websites'
            );

            const sites = response.sites.map(site => ({
                siteName: site.name.split('.').slice(2).join('.'),
                usage: formatBytes(site.usage),
                services: site.services
            }));

            render(Templates.websites, { 
                customerId: data.customerId, 
                sites,
                userData: window.userData,
                filter
            });

            // Add event listeners
            const filterSelect = document.getElementById('websiteFilter');
            if (filterSelect) {
                filterSelect.addEventListener('change', (e) => {
                    loadWebsites(e.target.value);
                });
            }

            // Add restart button handlers
            document.querySelectorAll('[data-action="restart-website"]').forEach(button => {
                button.addEventListener('click', async () => {
                    const siteName = button.dataset.siteName;
                    try {
                        const confirmed = await showConfirmation({
                            type: 'warning',
                            icon: 'refresh',
                            title: 'Restart Website?',
                            message: 'The website will be temporarily unavailable during the restart.',
                            confirmText: 'Restart'
                        });

                        if (confirmed) {
                            button.disabled = true;
                            button.innerHTML = '<i class="ti ti-loader ti-spin"></i>';
                            
                            const fullSiteName = `wp.${data.customerId}.${siteName}`;
                            await API.post(`websites/${fullSiteName}/restart`);
                            
                            // Refresh the website list after restart
                            await loadWebsites(filterSelect?.value || 'enabled');
                            Notifications.success('Website restarted successfully');
                        }
                    } catch (error) {
                        showError(error, 'Failed to restart website');
                    } finally {
                        button.disabled = false;
                        button.innerHTML = '<i class="ti ti-refresh"></i>';
                    }
                });
            });
        };

        // Initial load with default filter
        await loadWebsites('enabled');
    },

    async websiteInfo({ data }) {
        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
        
        // Function to disable/enable all action buttons
        const setActionButtonsState = (disabled) => {
            const buttons = [
                document.getElementById('startWebsite'),
                document.getElementById('stopWebsite'),
                document.getElementById('restartWebsite'),
                document.getElementById('refreshServices')
            ];
            buttons.forEach(button => {
                if (button) button.disabled = disabled;
            });
        };

        // Function to refresh services and update buttons
        const refreshServices = async () => {
            try {
                const info = await API.get(`websites/${fullSiteName}/info`);
                
                // Update services container
                const servicesContainer = document.getElementById('servicesContainer');
                if (servicesContainer) {
                    const servicesHtml = Object.entries({
                        'Webserver': info.services.webserver,
                        'Database': info.services.database,
                        'phpMyAdmin': info.services.phpmyadmin,
                        'SFTP': info.services.sftp,
                        'Backup': info.services.backup
                    }).map(([name, status]) => {
                        return Templates.serviceStatusCard(getServiceStatusData(name, status));
                    }).join('');
                    
                    servicesContainer.innerHTML = servicesHtml;
                }

                // Update button states based on new service status
                const backupInProgress = info.services.backup.startsWith('In Progress');
                const allDisabled = Object.values(info.services).every(status => status === 'Disabled');
                const allUp = Object.values(info.services).every(status => status === 'Up');
                const allDown = Object.values(info.services).every(status => status === 'Down' || status === 'Disabled');

                const startBtn = document.getElementById('startWebsite');
                const stopBtn = document.getElementById('stopWebsite');
                const restartBtn = document.getElementById('restartWebsite');
                const createBackupBtn = document.getElementById('startBackup');
                const restoreBackupBtn = document.getElementById('restoreBackup');

                if (startBtn) startBtn.disabled = allUp || allDisabled || backupInProgress;
                if (stopBtn) stopBtn.disabled = allDown || allDisabled || backupInProgress;
                if (restartBtn) restartBtn.disabled = allDisabled || backupInProgress;
                if (createBackupBtn) createBackupBtn.disabled = allDisabled || allDown || backupInProgress;
                if (restoreBackupBtn) restoreBackupBtn.disabled = allDisabled || allDown || backupInProgress;

                return info.services;
            } catch (error) {
                showError(error, 'Failed to refresh services status');
                throw error;
            }
        };

        // Function to handle service action with automatic refresh
        const handleServiceAction = async (action, buttonId, loadingText) => {
            const button = document.getElementById(buttonId);
            const originalHtml = button.innerHTML;
            try {
                setActionButtonsState(true);
                button.innerHTML = `<i class="ti ti-loader ti-spin me-2"></i>${loadingText}`;
                
                setTimeout(() => refreshServices(), 1000);
                await action();
                
                // For enable/disable actions, reload the page
                if (buttonId === 'enableWebsite' || buttonId === 'disableWebsite') {
                    Notifications.success(`Website ${buttonId.replace('Website', '').toLowerCase()}d successfully`);
                    // Short delay to show the success notification
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    return;
                }
                
                // For other actions, continue with service status refresh
                let retryCount = 0;
                const maxRetries = 10;
                const refreshInterval = setInterval(async () => {
                    try {
                        const services = await refreshServices();
                        retryCount++;
                        
                        const allStable = Object.values(services).every(status => 
                            status === 'Up' || status === 'Down' || status === 'Disabled'
                        );
                        
                        if (allStable || retryCount >= maxRetries) {
                            clearInterval(refreshInterval);
                            setActionButtonsState(false);
                            button.innerHTML = originalHtml;
                        }
                    } catch (error) {
                        clearInterval(refreshInterval);
                        setActionButtonsState(false);
                        button.innerHTML = originalHtml;
                    }
                }, 2000);
                
                if (buttonId === 'startBackup') {
                    Notifications.success(`Backup started successfully`);
                } else if (buttonId === 'restoreBackup') {
                    Notifications.success(`Restoring backup, please wait...`);
                } else {
                    Notifications.success(`Website ${buttonId.replace('Website', '').toLowerCase()}ed successfully`);
                }
            } catch (error) {
                showError(error, `Failed to ${buttonId.replace('Website', '')} website`);
                button.innerHTML = originalHtml;
                setActionButtonsState(false);
            }
        };

        // Initial render
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
            services: info.services,
            state: info.state
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

        // Add this line to initialize button states immediately after render
        await refreshServices();

        // Add refresh button handler
        const refreshBtn = document.getElementById('refreshServices');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const icon = refreshBtn.querySelector('i');
                refreshBtn.disabled = true;
                icon.classList.add('ti-spin');
                
                await refreshServices();
                
                refreshBtn.disabled = false;
                icon.classList.remove('ti-spin');
            });
        }

        // Add restart button handler
        const restartBtn = document.getElementById('restartWebsite');
        if (restartBtn) {
            restartBtn.addEventListener('click', async () => {
                const confirmed = await showConfirmation({
                    type: 'warning',
                    icon: 'refresh',
                    title: 'Restart Website?',
                    message: 'The website will be temporarily unavailable during the restart.',
                    confirmText: 'Restart'
                });

                if (confirmed) {
                    await handleServiceAction(
                        () => API.restartWebsite(fullSiteName),
                        'restartWebsite',
                        'Restarting...'
                    );
                }
            });
        }

        // Add start button handler
        const startBtn = document.getElementById('startWebsite');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                const confirmed = await showConfirmation({
                    type: 'success',
                    icon: 'player-play',
                    title: 'Start Website?',
                    message: 'All services will be started.',
                    confirmText: 'Start'
                });

                if (confirmed) {
                    await handleServiceAction(
                        () => API.startWebsite(fullSiteName),
                        'startWebsite',
                        'Starting...'
                    );
                }
            });
        }

        // Add stop button handler
        const stopBtn = document.getElementById('stopWebsite');
        if (stopBtn) {
            stopBtn.addEventListener('click', async () => {
                const confirmed = await showConfirmation({
                    type: 'danger',
                    icon: 'player-stop',
                    title: 'Stop Website?',
                    message: 'All services will be stopped. The website will be unavailable.',
                    confirmText: 'Stop'
                });

                if (confirmed) {
                    await handleServiceAction(
                        () => API.stopWebsite(fullSiteName),
                        'stopWebsite',
                        'Stopping...'
                    );
                }
            });
        }

        // Add enable/disable button handlers
        const enableBtn = document.getElementById('enableWebsite');
        const disableBtn = document.getElementById('disableWebsite');

        if (enableBtn) {
            enableBtn.addEventListener('click', async () => {
                const confirmed = await showConfirmation({
                    type: 'success',
                    icon: 'power',
                    title: 'Enable Website?',
                    message: 'This will enable all services for this website.',
                    confirmText: 'Enable'
                });

                if (confirmed) {
                    await handleServiceAction(
                        () => API.enableWebsite(fullSiteName),
                        'enableWebsite',
                        'Enabling...'
                    );
                }
            });
        }

        if (disableBtn) {
            disableBtn.addEventListener('click', async () => {
                const confirmed = await showConfirmation({
                    type: 'danger',
                    icon: 'power',
                    title: 'Disable Website?',
                    message: 'This will disable all services for this website. The website will be unavailable.',
                    confirmText: 'Disable'
                });

                if (confirmed) {
                    await handleServiceAction(
                        () => API.disableWebsite(fullSiteName),
                        'disableWebsite',
                        'Disabling...'
                    );
                }
            });
        }

        // Add restore backup button handler
        const restoreBtn = document.getElementById('restoreBackup');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', async () => {
                try {
                    // Load backups
                    const response = await API.get(`websites/${fullSiteName}/backups`);
                    const { backups } = response;
                    
                    if (!backups.length) {
                        Notifications.warning('No backups available');
                        return;
                    }

                    // Show modal with backups
                    const modalHtml = Templates.restoreBackupModal({ backups });
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                    
                    const modalElement = document.getElementById('restoreBackupModal');
                    const modal = new bootstrap.Modal(modalElement);
                    const backupSelect = document.getElementById('backupSelect');
                    const restoreWarning = document.getElementById('restoreWarning');
                    const confirmBtn = document.getElementById('confirmRestore');
                    const confirmInput = document.getElementById('restoreConfirmation');
                    const sizeInfo = document.getElementById('backupSizeInfo');
                    
                    backupSelect.addEventListener('change', async () => {
                        const selectedBackup = backupSelect.value;
                        const selectedIndex = backupSelect.selectedIndex;
                        
                        // Show loading indicator
                        restoreWarning.style.display = 'block';
                        const warningMessage = restoreWarning.querySelector('.warning-message');
                        const confirmMessage = restoreWarning.querySelector('.confirm-message');
                        sizeInfo.innerHTML = '<i class="ti ti-loader ti-spin"></i> Calculating size...';
                        
                        try {
                            // Get backup size
                            const sizeData = await API.getBackupSize(fullSiteName, selectedBackup);
                            
                            // Update size info and warning messages
                            sizeInfo.textContent = `Total size: ${sizeData.formatted}`;
                            warningMessage.textContent = 
                                `Restoring this backup will take time. The operation will process ${backups.length - selectedIndex} backup files.`;
                            confirmMessage.textContent = 
                                `To confirm, please type "RESTORE FROM ${selectedBackup}" below:`;
                        } catch (error) {
                            console.error('Error getting backup size:', error);
                            sizeInfo.innerHTML = '<i class="ti ti-alert-triangle text-warning"></i> Failed to calculate size';
                        }
                        
                        // Reset confirmation
                        confirmInput.value = '';
                        confirmBtn.disabled = true;
                    });
                    
                    confirmInput.addEventListener('input', () => {
                        const selectedBackup = backupSelect.value;
                        const expectedText = `RESTORE FROM ${selectedBackup}`;
                        confirmBtn.disabled = confirmInput.value.toUpperCase() !== expectedText.toUpperCase();
                    });
                    
                    confirmBtn.addEventListener('click', async () => {
                        try {
                            const selectedBackup = backupSelect.value;
                            modal.hide();
                            handleServiceAction(
                                async () => { API.restoreBackup(fullSiteName, selectedBackup); },
                                'restoreBackup',
                                'Restoring Backup...'
                            );
                        } catch (error) {
                            showError(error, 'Failed to restore backup');
                        }
                    });
                    
                    modalElement.addEventListener('hidden.bs.modal', () => {
                        modalElement.remove();
                    });
                    
                    modal.show();
                } catch (error) {
                    showError(error, 'Failed to load backups');
                }
            });
        }

        // Add this handler for the Create Backup button
        const startBackupBtn = document.getElementById('startBackup');
        if (startBackupBtn) {
            startBackupBtn.addEventListener('click', async () => {
                try {
                    const confirmed = await showConfirmation({
                        type: 'primary',
                        icon: 'archive',
                        title: 'Create Backup?',
                        message: 'This will create a new backup of your website.',
                        confirmText: 'Create Backup'
                    });

                    if (confirmed) {

                        // Refresh services status after a delay
                        // setTimeout(() => refreshServices(), 2000);
                        // await API.startBackup(fullSiteName);
                        handleServiceAction(
                            async () => { API.startBackup(fullSiteName); },
                            'startBackup',
                            'Creating Backup...'
                        );
                        // Notifications.success('Backup started successfully');

                        // Refresh services status after a delay
                        // setTimeout(() => refreshServices(), 2000);
                    }
                } catch (error) {
                    showError(error, 'Failed to start backup');
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