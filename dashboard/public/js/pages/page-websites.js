import { API } from '../modules/api.js';
import { render } from '../main.js';
import { showConfirmation, Notifications, formatBytes, showError, handleAPIRequest } from '../modules/utils.js';
import { DeployWebsiteModal } from '../modals/modal-deploy-website.js';
import { ProgressModal } from '../modals/modal-progress.js';

// First, move the table body template definition to the top
const tableBodyTemplate = Handlebars.compile(`
    {{#each sites}}
    <tr>
        <td style="cursor: pointer" onclick="window.router.navigate('/websites/{{../customerId}}/info/{{siteName}}')">
            <div class="d-flex align-items-center">
                <i class="ti ti-world me-2"></i>
                <span class="text-muted">{{siteName}}</span>
            </div>
        </td>
        <td>
            {{#with (serviceStatus 'Web' services.webserver)}}
                <span class="status-indicator status-{{statusColor}}"
                      title="Web: {{status}}">
                    <span class="status-indicator-circle"></span>
                    <span class="status-indicator-circle"></span>
                    <span class="status-indicator-circle"></span>
                </span>
            {{/with}}
        </td>
        <td>
            {{#with (serviceStatus 'DB' services.database)}}
                <span class="status-indicator status-{{statusColor}}"
                      title="Database: {{status}}">
                    <span class="status-indicator-circle"></span>
                    <span class="status-indicator-circle"></span>
                    <span class="status-indicator-circle"></span>
                </span>
            {{/with}}
        </td>
        <td class="text-end">{{usage}}</td>
        <td>
            <div class="btn-list flex-nowrap">
                <a href="/websites/{{../customerId}}/logs/{{siteName}}" 
                   data-navigo
                   class="btn btn-icon btn-ghost-secondary" 
                   title="View Logs">
                    <i class="ti ti-file-text"></i>
                </a>
                <button class="btn btn-icon btn-ghost-secondary" 
                        data-action="restart-website"
                        data-site-name="{{siteName}}"
                        title="Restart Website">
                    <i class="ti ti-refresh"></i>
                </button>
            </div>
        </td>
    </tr>
    {{/each}}
`);

// Then modify the main template to use the table body template
const template = Handlebars.compile(`
    <div class="page-header d-print-none">
        <div class="container-xl">
            <div class="row g-2 align-items-center">
                <div class="col">
                    {{#if ../userData.isAdmin}}
                    <div class="page-pretitle">
                        <a href="/customers" data-navigo class="text-muted">
                            <i class="ti ti-arrow-left"></i> Back to Customers
                        </a>
                    </div>
                    {{/if}}
                    <h2 class="page-title">
                        <i class="ti ti-world me-2"></i>
                        Websites for {{customerId}}
                    </h2>
                </div>
                {{#if (or userData.isAdmin userData.isTeamAdmin)}}
                
                <div class="col-auto me-3">
                    <select class="form-select" id="websiteFilter">
                        <option value="all" {{#if (eq filter "all")}}selected{{/if}}>All Sites</option>
                        <option value="enabled" {{#if (eq filter "enabled")}}selected{{/if}}>Enabled Sites</option>
                        <option value="disabled" {{#if (eq filter "disabled")}}selected{{/if}}>Disabled Sites</option>
                    </select>
                </div>
                <div class="col-auto me-3">
                    <input type="text" class="form-control" id="websiteSearch" placeholder="Search sites...">
                </div>

                <div class="col-auto ms-auto d-print-none">
                    <div class="btn-list">
                        <button class="btn btn-primary d-none d-sm-inline-block" data-action="deploy-website">
                            <i class="ti ti-plus"></i>
                            Deploy Website
                        </button>
                    </div>
                </div>
                {{/if}}
            </div>
        </div>
    </div>
    <div class="page-body">
        <div class="container-xl">
            <div class="card">
                <div class="table-responsive">
                    <table class="table table-vcenter table-hover card-table table-nowrap table-compact">
                        <thead>
                            <tr>
                                <th>Website</th>
                                <th class="w-1 text-center">Web</th>
                                <th class="w-1 text-center">DB</th>
                                <th class="w-1 text-center">Usage</th>
                                <th class="w-1 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{{tableBody}}}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
`);

const handler = async ({ data }) => {
    const loadWebsites = async (filter = 'all') => {
        const effectiveFilter = (!window.userData.isAdmin && !window.userData.isTeamAdmin) 
            ? 'enabled' 
            : filter;

        const response = await handleAPIRequest(
            () => API.get(`websites/${data.customerId}?filter=${effectiveFilter}`),
            'Failed to load websites'
        );

        // Store the full list of sites
        const allSites = response.sites.map(site => ({
            siteName: site.name.split('.').slice(2).join('.'),
            usage: formatBytes(site.usage),
            services: site.services
        }));

        // Initial render of the full page
        render(template, { 
            customerId: data.customerId, 
            tableBody: tableBodyTemplate({ 
                sites: allSites,
                customerId: data.customerId 
            }),
            userData: window.userData,
            filter: effectiveFilter
        });

        // Attach page-level event handlers (only once)
        const filterSelect = document.getElementById('websiteFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                loadWebsites(e.target.value);
            });
        }

        const searchInput = document.getElementById('websiteSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredSites = allSites.filter(site => 
                    site.siteName.toLowerCase().includes(searchTerm)
                );
                renderTableBody(filteredSites);
            });
        }

        const deployButton = document.querySelector('[data-action="deploy-website"]');
        if (deployButton) {
            deployButton.addEventListener('click', async () => {
                try {
                    const result = await DeployWebsiteModal.show(window.userData, data.customerId);
                    if (result) {
                        const { domain, siteName, type } = result;
                        
                        // Show progress modal
                        const progressModal = ProgressModal.show({
                            title: 'Deploying Website',
                            message: 'Initializing deployment...',
                            icon: 'rocket',
                            color: 'primary'
                        });
                        progressModal.show();

                        // Add a function to check deploy log
                        const checkDeployLog = async (siteName) => {
                            try {
                                const response = await fetch(`/api/websites/${siteName}/deploy-log`);
                                if (response.ok) {
                                    const log = await response.text();
                                    // Update progress modal message with last line of log
                                    const lines = log.split('\n');
                                    const lastLine = lines[lines.length - 2] || lines[lines.length - 1];
                                    if (lastLine) {
                                        progressModal._element.querySelector('.text-muted').textContent = lastLine;
                                    }
                                }
                            } catch (error) {
                                console.log('Error checking deploy log:', error);
                            }
                        };

                        try {
                            // Start deployment
                            await API.deployWebsite(domain, siteName, type);
                            
                            // Start polling for website status
                            const maxAttempts = 60; // 2 minutes
                            let attempts = 0;
                            
                            while (attempts < maxAttempts) {
                                try {
                                    // Update progress message
                                    progressModal._element.querySelector('.text-muted').textContent = 
                                        `Waiting for services to start (attempt ${attempts + 1}/${maxAttempts})...`;

                                    const info = await API.get(`websites/${siteName}/info`);
                                    if (info.services?.webserver === 'Up' && info.services?.database === 'Up') {
                                        // Site is ready
                                        break;
                                    }
                                } catch (error) {
                                    // Check deploy log while waiting
                                    await checkDeployLog(siteName);
                                }
                                
                                // Wait 2 seconds before next attempt
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                attempts++;
                            }

                            // Hide progress modal
                            progressModal.hide();
                            
                            // Extract the base site name for navigation
                            const baseSiteName = siteName.split('.').slice(2).join('.');
                            
                            // Refresh the website list
                            await loadWebsites('all');
                            
                            // Show success notification
                            Notifications.success('Website deployed successfully');
                            
                            // Navigate to the new website's info page
                            window.router.navigate(`/websites/${data.customerId}/info/${baseSiteName}`);
                        } catch (error) {
                            progressModal.hide();
                            throw error;
                        }
                    }
                } catch (error) {
                    showError(error, 'Failed to deploy website');
                }
            });
        }

        // Helper function to render just the table body
        function renderTableBody(sites) {
            const tbody = document.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = tableBodyTemplate({ 
                    sites,
                    customerId: data.customerId 
                });
                attachTableEventHandlers();
            }
        }

        // Helper function to attach only table-specific event handlers
        function attachTableEventHandlers() {
            // Only attach handlers to elements within the table
            document.querySelectorAll('tbody [data-action="restart-website"]').forEach(button => {
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
        }

        // Initial attachment of table handlers
        attachTableEventHandlers();
    };

    // Initial load with appropriate filter
    const initialFilter = (!window.userData.isAdmin && !window.userData.isTeamAdmin) 
        ? 'enabled' 
        : 'all';
    await loadWebsites(initialFilter);
};

export const WebsitesPage = {
    template,
    handler
}; 