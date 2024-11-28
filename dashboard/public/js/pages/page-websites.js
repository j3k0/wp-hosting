import { API } from '../modules/api.js';
import { render } from '../main.js';
import { showConfirmation, Notifications, formatBytes, showError, handleAPIRequest } from '../modules/utils.js';

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
                <div class="col-auto">
                    <select class="form-select" id="websiteFilter">
                        <option value="all" {{#if (eq filter "all")}}selected{{/if}}>All Sites</option>
                        <option value="enabled" {{#if (eq filter "enabled")}}selected{{/if}}>Enabled Sites</option>
                        <option value="disabled" {{#if (eq filter "disabled")}}selected{{/if}}>Disabled Sites</option>
                    </select>
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

        const sites = response.sites.map(site => ({
            siteName: site.name.split('.').slice(2).join('.'),
            usage: formatBytes(site.usage),
            services: site.services
        }));

        render(template, { 
            customerId: data.customerId, 
            sites,
            userData: window.userData,
            filter: effectiveFilter
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