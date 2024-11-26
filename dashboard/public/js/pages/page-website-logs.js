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
                    <div class="logs-container bg-dark text-light p-3" style="font-family: monospace;">
                        {{{logs}}}
                    </div>
                </div>
            </div>
        </div>
    </div>
`);

const loadLogs = async (fullSiteName, lines, data) => {
    const { logs } = await handleAPIRequest(
        () => API.get(`websites/${fullSiteName}/logs?lines=${lines}`),
        'Failed to load logs'
    );

    render(template, {
        customerId: data.customerId,
        siteName: data.siteName,
        logs,
        selectedLines: lines
    });

    // Re-attach event handlers after render
    setupLogHandlers(fullSiteName, data);
};

const setupLogHandlers = (fullSiteName, data) => {
    const lineSelect = document.getElementById('logLines');
    const refreshBtn = document.getElementById('refreshLogs');

    if (lineSelect) {
        lineSelect.addEventListener('change', () => {
            loadLogs(fullSiteName, lineSelect.value, data);
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const currentLines = document.getElementById('logLines')?.value || 100;
            loadLogs(fullSiteName, currentLines, data);
        });
    }
};

const handler = async ({ data }) => {
    const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
    const lines = document.getElementById('logLines')?.value || 100;
    
    try {
        await loadLogs(fullSiteName, lines, data);
        Notifications.info('Logs refreshed');
    } catch (error) {
        showError(error, 'Failed to load logs');
    }
};

export const WebsiteLogsPage = {
    template,
    handler
}; 