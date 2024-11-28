import { API } from '../modules/api.js';
import { render } from '../main.js';
import { ServiceStatusCard } from '../components/service-status.js';
import { showConfirmation, Notifications, showError, handleAPIRequest } from '../modules/utils.js';
import { RestoreBackupModal } from '../modals/modal-restore-backup.js';

const template = Handlebars.compile(`
    <div class="page-header d-print-none">
        <div class="container-xl">
            <div class="row g-2 align-items-center">
                <div class="col">
                    <div class="page-pretitle">
                        <a href="/websites/{{customerId}}" data-navigo class="text-muted">
                            <i class="ti ti-arrow-left"></i> Back to Websites
                        </a>
                    </div>
                    <h2 class="page-title">
                        <i class="ti ti-world me-2"></i>
                        Information for {{siteName}}
                    </h2>
                </div>
            </div>
        </div>
    </div>
    <div class="page-body">
        <div class="container-xl">
            {{#if raw}}
                <div class="card">
                    <div class="card-body">
                        <pre class="text-muted">{{raw}}</pre>
                    </div>
                </div>
            {{else}}
                <!-- Service Status Card -->
                <div class="card mb-3">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h3 class="card-title">
                                <i class="ti ti-activity me-2"></i>
                                Service Status
                            </h3>
                            <button class="btn btn-icon btn-ghost-secondary" id="refreshServices" title="Refresh Status">
                                <i class="ti ti-refresh"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row g-3" id="servicesContainer">
                            {{#with (serviceStatus 'Webserver' services.webserver)}}
                                {{> serviceStatusCard}}
                            {{/with}}
                            {{#with (serviceStatus 'Database' services.database)}}
                                {{> serviceStatusCard}}
                            {{/with}}
                            {{#with (serviceStatus 'phpMyAdmin' services.phpmyadmin)}}
                                {{> serviceStatusCard}}
                            {{/with}}
                            {{#with (serviceStatus 'SFTP' services.sftp)}}
                                {{> serviceStatusCard}}
                            {{/with}}
                            {{#with (serviceStatus 'Backup' services.backup)}}
                                {{> serviceStatusCard}}
                            {{/with}}
                        </div>
                    </div>
                </div>

                <!-- Website Actions Card -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="ti ti-tool me-2"></i>
                            Actions
                        </h3>
                    </div>
                    <div class="card-body">
                        <div class="btn-list">
                            {{#if (eq state "enabled")}}
                                <a href="/websites/{{customerId}}/logs/{{siteName}}" 
                                   data-navigo 
                                   class="btn btn-outline-primary">
                                    <i class="ti ti-file-text me-2"></i>
                                    View Logs
                                </a>

                                <div class="vr mx-3"></div>

                                <button class="btn btn-outline-secondary" id="restartWebsite">
                                    <i class="ti ti-refresh me-2"></i>
                                    Restart
                                </button>
                                <button class="btn btn-outline-success" id="startWebsite">
                                    <i class="ti ti-player-play me-2"></i>
                                    Start
                                </button>
                                <button class="btn btn-outline-warning" id="stopWebsite">
                                    <i class="ti ti-player-pause me-2"></i>
                                    Pause
                                </button>
                                {{#if (or userData.isAdmin userData.isTeamAdmin)}}
                                <button class="btn btn-outline-danger" id="disableWebsite">
                                    <i class="ti ti-power me-2"></i>
                                    Shutdown
                                </button>
                                {{/if}}

                                <div class="vr mx-3"></div>

                                <button class="btn btn-outline-primary" id="startBackup">
                                    <i class="ti ti-archive me-2"></i>
                                    Create Backup...
                                </button>
                                <button class="btn btn-outline-danger" id="restoreBackup">
                                    <i class="ti ti-restore me-2"></i>
                                    Restore Backup...
                                </button>
                            {{else}}
                                {{#if (or userData.isAdmin userData.isTeamAdmin)}}
                                <button class="btn btn-outline-success" id="enableWebsite">
                                    <i class="ti ti-power me-2"></i>
                                    Enable Website
                                </button>
                                {{/if}}
                            {{/if}}
                        </div>
                    </div>
                </div>

                <!-- Website Information Cards -->
                <div class="row row-cards">
                    <div class="col-12 col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title"><i class="ti ti-world me-2"></i>Website URLs</h3>
                            </div>
                            <div class="list-group list-group-flush">
                                {{#each urls}}
                                    <a href="{{this}}" target="_blank" class="list-group-item list-group-item-action">
                                        <i class="ti ti-link me-2"></i>{{this}}
                                    </a>
                                {{/each}}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-12 col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title"><i class="ti ti-database me-2"></i>phpMyAdmin Access</h3>
                            </div>
                            <div class="card-body">
                                <div class="datagrid">
                                    <div class="datagrid-item">
                                        <div class="datagrid-title">URL</div>
                                        <div class="datagrid-content">
                                            <a href="{{phpmyadmin.url}}" target="_blank">{{phpmyadmin.url}}</a>
                                        </div>
                                    </div>
                                    <div class="datagrid-item">
                                        <div class="datagrid-title">Username</div>
                                        <div class="datagrid-content">
                                            <code>{{phpmyadmin.username}}</code>
                                        </div>
                                    </div>
                                    <div class="datagrid-item">
                                        <div class="datagrid-title">Password</div>
                                        <div class="datagrid-content">
                                            {{#if (or userData.isAdmin userData.isTeamAdmin)}}
                                                <div class="input-group">
                                                    <input type="password" class="form-control form-control-sm" readonly value="{{phpmyadmin.password}}">
                                                    <button class="btn btn-sm" type="button" data-action="toggle-password">
                                                        <i class="ti ti-eye"></i>
                                                    </button>
                                                </div>
                                            {{else}}
                                                <span class="text-muted">Hidden - Ask your administrator</span>
                                            {{/if}}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title"><i class="ti ti-server me-2"></i>SFTP Access</h3>
                            </div>
                            <div class="card-body">
                                <div class="datagrid">
                                    <div class="datagrid-item">
                                        <div class="datagrid-title">Host</div>
                                        <div class="datagrid-content"><code>{{sftp.host}}</code></div>
                                    </div>
                                    <div class="datagrid-item">
                                        <div class="datagrid-title">Port</div>
                                        <div class="datagrid-content"><code>{{sftp.port}}</code></div>
                                    </div>
                                    <div class="datagrid-item">
                                        <div class="datagrid-title">Username</div>
                                        <div class="datagrid-content"><code>{{sftp.username}}</code></div>
                                    </div>
                                    <div class="datagrid-item">
                                        <div class="datagrid-title">Password</div>
                                        <div class="datagrid-content">
                                            {{#if (or userData.isAdmin userData.isTeamAdmin)}}
                                                <div class="input-group">
                                                    <input type="password" class="form-control form-control-sm" readonly value="{{sftp.password}}">
                                                    <button class="btn btn-sm" type="button" data-action="toggle-password">
                                                        <i class="ti ti-eye"></i>
                                                    </button>
                                                </div>
                                            {{else}}
                                                <span class="text-muted">Hidden - Ask your administrator</span>
                                            {{/if}}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title"><i class="ti ti-dns me-2"></i>DNS Configuration</h3>
                            </div>
                            <div class="card-body">
                                <pre class="bg-light text-dark p-3 mb-0">{{#each dns}}{{this}}
{{/each}}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            {{/if}}
        </div>
    </div>
`);

// Service action handler
const handleServiceAction = async (action, buttonId, loadingText, refreshServices, setActionButtonsState) => {
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

const handler = async ({ data }) => {
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
                    return ServiceStatusCard.template(ServiceStatusCard.getStatusData(name, status));
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
    render(template, templateData);

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
                    'Restarting...',
                    refreshServices,
                    setActionButtonsState
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
                    'Starting...',
                    refreshServices,
                    setActionButtonsState
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
                    'Stopping...',
                    refreshServices,
                    setActionButtonsState
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
                    'Enabling...',
                    refreshServices,
                    setActionButtonsState
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
                    'Disabling...',
                    refreshServices,
                    setActionButtonsState
                );
            }
        });
    }

    // Add restore backup button handler
    const restoreBtn = document.getElementById('restoreBackup');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', async () => {
            await RestoreBackupModal.show(fullSiteName, {
                handleServiceAction: (action, buttonId, loadingText) => {
                    return handleServiceAction(
                        action,
                        buttonId,
                        loadingText,
                        refreshServices,
                        setActionButtonsState
                    );
                }
            });
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
                    handleServiceAction(
                        async () => { API.startBackup(fullSiteName); },
                        'startBackup',
                        'Creating Backup...',
                        refreshServices,
                        setActionButtonsState
                    );
                }
            } catch (error) {
                showError(error, 'Failed to start backup');
            }
        });
    }

    // Add password toggle handlers
    document.querySelectorAll('[data-action="toggle-password"]').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('ti-eye');
                icon.classList.add('ti-eye-off');
            } else {
                input.type = 'password';
                icon.classList.remove('ti-eye-off');
                icon.classList.add('ti-eye');
            }
        });
    });
};

export const WebsiteInfoPage = {
    template,
    handler
}; 