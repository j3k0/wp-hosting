import { API } from '../modules/api.js';
import { render } from '../main.js';
import { Notifications, showError, handleAPIRequest } from '../modules/utils.js';

const template = Handlebars.compile(`
    <div class="page-header d-print-none">
        <div class="container-xl">
            <div class="row g-2 align-items-center">
                <div class="col">
                    <div class="page-pretitle">
                        <a href="/websites/{{customerId}}/info/{{siteName}}" data-navigo class="text-muted">
                            <i class="ti ti-arrow-left"></i> Back to Website Info
                        </a>
                    </div>
                    <h2 class="page-title">
                        <i class="ti ti-file-text me-2"></i>
                        Logs for {{siteName}}
                    </h2>
                </div>
                <div class="col-auto">
                    <div class="btn-list">
                        <div class="btn-group" role="group">
                            <button class="btn {{#if (eq logType 'webserver')}}btn-primary{{else}}btn-outline-primary{{/if}}" 
                                    id="webserverLogs">
                                <i class="ti ti-world me-1"></i>
                                Webserver
                            </button>
                            <button class="btn {{#if (eq logType 'database')}}btn-primary{{else}}btn-outline-primary{{/if}}" 
                                    id="databaseLogs">
                                <i class="ti ti-database me-1"></i>
                                Database
                            </button>
                        </div>
                        <button class="btn btn-primary" id="refreshLogs">
                            <i class="ti ti-refresh me-2"></i>
                            Refresh
                        </button>
                        <select id="logLines" class="form-select">
                            <option value="50" {{#if (eq selectedLines "50")}}selected{{/if}}>50 lines</option>
                            <option value="100" {{#if (eq selectedLines "100")}}selected{{/if}}>100 lines</option>
                            <option value="200" {{#if (eq selectedLines "200")}}selected{{/if}}>200 lines</option>
                            <option value="500" {{#if (eq selectedLines "500")}}selected{{/if}}>500 lines</option>
                            <option value="2000" {{#if (eq selectedLines "2000")}}selected{{/if}}>2000 lines</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="page-body">
        <div class="container-xl">
            <div class="card">
                <div class="card-body">
                    <div class="logs-container bg-dark text-light p-3" style="font-family: monospace; height: 600px; overflow-y: auto;">
                        {{{logs}}}
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="autoRefresh">
                            <label class="form-check-label" for="autoRefresh">
                                Auto-refresh every 5 seconds
                                <span id="autoRefreshTimer" class="text-muted ms-2" style="display: none;">
                                    (expires in <span id="autoRefreshCountdown">60:00</span>)
                                </span>
                            </label>
                        </div>
                        <button class="btn btn-primary" id="refreshLogsBottom">
                            <i class="ti ti-refresh me-2"></i>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
`);

let currentServiceStatuses = null;

const loadLogs = async (fullSiteName, lines, data, logType = 'webserver', isAutoRefresh = false) => {
    // Use cached service status if available
    const serviceStatus = logType === 'webserver' ? 
        currentServiceStatuses?.webserver : 
        currentServiceStatuses?.database;

    if (serviceStatus !== 'Up') {
        // If service isn't up, render empty logs with a message
        const message = `Cannot load logs: ${logType} service is ${serviceStatus?.toLowerCase() || 'unavailable'}`;
        
        // Check if we're still on the logs page
        const currentUrl = window.location.pathname;
        const expectedUrl = `/websites/${data.customerId}/logs/${data.siteName}`;
        if (currentUrl !== expectedUrl) return;

        // Get the logs container
        const logsContainer = document.querySelector('.logs-container');
        if (logsContainer) {
            logsContainer.innerHTML = `<div class="text-muted">${message}</div>`;
        } else {
            // Initial render of the full template
            render(template, {
                customerId: data.customerId,
                siteName: data.siteName,
                logs: `<div class="text-muted">${message}</div>`,
                selectedLines: lines,
                logType
            });
            // Setup handlers only on initial render
            setupLogHandlers(fullSiteName, data, logType);
        }

        // Update button states
        updateLogTypeButtons(logType);
        return;
    }

    // Get the logs container and check if we're at the bottom before refresh
    const logsContainer = document.querySelector('.logs-container');
    const wasAtBottom = isAutoRefresh || (logsContainer ? 
        (logsContainer.scrollHeight - logsContainer.scrollTop - logsContainer.clientHeight < 10) : 
        false);

    const { logs } = await handleAPIRequest(
        () => API.get(`websites/${fullSiteName}/logs?lines=${lines}&type=${logType}`),
        'Failed to load logs'
    );

    // Check if we're still on the logs page after the API call
    const currentUrl = window.location.pathname;
    const expectedUrl = `/websites/${data.customerId}/logs/${data.siteName}`;
    if (currentUrl !== expectedUrl) {
        return; // Exit if we're no longer on the logs page
    }

    if (logsContainer) {
        // If the container exists, just update its content
        logsContainer.innerHTML = logs;
    } else {
        // Initial render of the full template
        render(template, {
            customerId: data.customerId,
            siteName: data.siteName,
            logs,
            selectedLines: lines,
            logType
        });
        // Setup handlers only on initial render
        setupLogHandlers(fullSiteName, data, logType);
    }

    // After update, scroll to bottom if we were at bottom before or if it's auto-refresh
    if (wasAtBottom) {
        const newLogsContainer = document.querySelector('.logs-container');
        if (newLogsContainer) {
            newLogsContainer.scrollTo({
                top: newLogsContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
};

let autoRefreshInterval = null;
let autoRefreshTimeout = null;
let autoRefreshEndTime = null;

const startAutoRefresh = (fullSiteName, data, currentLogType) => {
    const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
    autoRefreshEndTime = Date.now() + ONE_HOUR;
    
    // Update countdown every second
    const updateCountdown = () => {
        const remaining = Math.max(0, autoRefreshEndTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        const countdown = document.getElementById('autoRefreshCountdown');
        if (countdown) {
            countdown.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (remaining <= 0) {
            stopAutoRefresh();
        }
    };

    // Show the countdown timer
    const timerElement = document.getElementById('autoRefreshTimer');
    if (timerElement) {
        timerElement.style.display = 'inline';
    }

    // Start the refresh interval
    autoRefreshInterval = setInterval(() => {
        // Check if we're still on the logs page by checking URL
        const currentUrl = window.location.pathname;
        const expectedUrl = `/websites/${data.customerId}/logs/${data.siteName}`;
        
        if (currentUrl !== expectedUrl) {
            // If we're not on the logs page anymore, stop auto-refresh
            stopAutoRefresh();
            return;
        }

        // Always use 50 lines for auto-refresh
        loadLogs(fullSiteName, '50', data, currentLogType, true);
    }, 5000);

    // Start the countdown interval
    const countdownInterval = setInterval(updateCountdown, 1000);

    // Set timeout to stop after 1 hour
    autoRefreshTimeout = setTimeout(() => {
        stopAutoRefresh();
        clearInterval(countdownInterval);
    }, ONE_HOUR);

    // Initial countdown update
    updateCountdown();
};

const stopAutoRefresh = () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    if (autoRefreshTimeout) {
        clearTimeout(autoRefreshTimeout);
        autoRefreshTimeout = null;
    }
    
    // Hide the countdown timer
    const timerElement = document.getElementById('autoRefreshTimer');
    if (timerElement) {
        timerElement.style.display = 'none';
    }

    // Uncheck the auto-refresh checkbox
    const checkbox = document.getElementById('autoRefresh');
    if (checkbox) {
        checkbox.checked = false;
    }
};

const setupLogHandlers = (fullSiteName, data, currentLogType) => {
    let currentType = currentLogType; // Track current type in closure

    const lineSelect = document.getElementById('logLines');
    const refreshBtn = document.getElementById('refreshLogs');
    const refreshBtnBottom = document.getElementById('refreshLogsBottom');
    const webserverBtn = document.getElementById('webserverLogs');
    const databaseBtn = document.getElementById('databaseLogs');
    const autoRefreshCheckbox = document.getElementById('autoRefresh');

    const refreshFunction = () => {
        stopAutoRefresh(); // Stop auto-refresh when manually refreshing
        const currentLines = document.getElementById('logLines')?.value || 100;
        loadLogs(fullSiteName, currentLines, data, currentType);
    };

    if (lineSelect) {
        lineSelect.addEventListener('change', () => {
            stopAutoRefresh(); // Stop auto-refresh when changing lines
            refreshFunction();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshFunction);
    }

    if (refreshBtnBottom) {
        refreshBtnBottom.addEventListener('click', refreshFunction);
    }

    if (webserverBtn) {
        webserverBtn.addEventListener('click', () => {
            if (currentType !== 'webserver' && currentServiceStatuses?.webserver === 'Up') {
                stopAutoRefresh();
                currentType = 'webserver'; // Update current type
                const currentLines = document.getElementById('logLines')?.value || 100;
                loadLogs(fullSiteName, currentLines, data, currentType);
            }
        });
    }

    if (databaseBtn) {
        databaseBtn.addEventListener('click', () => {
            if (currentType !== 'database' && currentServiceStatuses?.database === 'Up') {
                stopAutoRefresh();
                currentType = 'database'; // Update current type
                const currentLines = document.getElementById('logLines')?.value || 100;
                loadLogs(fullSiteName, currentLines, data, currentType);
            }
        });
    }

    if (autoRefreshCheckbox) {
        autoRefreshCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                startAutoRefresh(fullSiteName, data, currentType);
            } else {
                stopAutoRefresh();
            }
        });
    }

    // Stop auto-refresh for any navigation
    window.router.hooks({
        before: (done) => {
            stopAutoRefresh();
            done();
        },
        leave: () => {
            stopAutoRefresh();
        }
    });

    // Stop auto-refresh when user leaves/refreshes the page
    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
    });

    // Stop auto-refresh when user switches tabs/minimizes window
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoRefresh();
        }
    });
};

const updateLogTypeButtons = (logType) => {
    const webserverBtn = document.getElementById('webserverLogs');
    const databaseBtn = document.getElementById('databaseLogs');
    if (webserverBtn && databaseBtn) {
        // Update active state
        if (logType === 'webserver') {
            webserverBtn.classList.replace('btn-outline-primary', 'btn-primary');
            databaseBtn.classList.replace('btn-primary', 'btn-outline-primary');
        } else {
            webserverBtn.classList.replace('btn-primary', 'btn-outline-primary');
            databaseBtn.classList.replace('btn-outline-primary', 'btn-primary');
        }

        // Update disabled state based on service status
        webserverBtn.disabled = currentServiceStatuses?.webserver !== 'Up';
        databaseBtn.disabled = currentServiceStatuses?.database !== 'Up';

        // Add title attribute to show status on hover
        webserverBtn.title = `Webserver is ${currentServiceStatuses?.webserver?.toLowerCase() || 'unavailable'}`;
        databaseBtn.title = `Database is ${currentServiceStatuses?.database?.toLowerCase() || 'unavailable'}`;
    }
};

const handler = async ({ data }) => {
    const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
    const lines = document.getElementById('logLines')?.value || '50';
    const logType = 'webserver'; // Default to webserver logs
    
    try {
        // Get initial service status
        const info = await handleAPIRequest(
            () => API.get(`websites/${fullSiteName}/info`),
            'Failed to check service status'
        );
        currentServiceStatuses = info.services;

        // Pass true as isAutoRefresh to force scroll to bottom on initial load
        await loadLogs(fullSiteName, lines, data, logType, true);
        Notifications.info('Logs refreshed');
    } catch (error) {
        showError(error, 'Failed to load logs');
    }
};

export const WebsiteLogsPage = {
    template,
    handler
}; 