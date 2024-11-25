Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

export const Templates = {
    login: Handlebars.compile(`
        <div class="container-tight py-4">
            <div class="card card-md">
                <div class="card-body">
                    <h2 class="card-title text-center mb-4">Login to Fovea.Hosting</h2>
                    <form id="login" autocomplete="off">
                        <div class="mb-3">
                            <label class="form-label">Username</label>
                            <div class="input-icon">
                                <span class="input-icon-addon">
                                    <i class="ti ti-user"></i>
                                </span>
                                <input type="text" name="username" id="username" class="form-control" placeholder="Username" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <div class="input-icon">
                                <span class="input-icon-addon">
                                    <i class="ti ti-lock"></i>
                                </span>
                                <input type="password" name="password" id="password" class="form-control" placeholder="Password" required>
                            </div>
                        </div>
                        <div class="form-footer">
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="ti ti-login me-2"></i>
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `),

    customers: Handlebars.compile(`
        <div class="page-header d-print-none">
            <div class="container-xl">
                <div class="row g-2 align-items-center">
                    <div class="col">
                        <h2 class="page-title">
                            <i class="ti ti-users me-2"></i>
                            Customers
                        </h2>
                    </div>
                    <div class="col-auto">
                        <a href="/users" data-navigo class="btn btn-primary">
                            <i class="ti ti-settings me-2"></i>
                            Manage Users
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <div class="page-body">
            <div class="container-xl">
                <div class="row row-cards">
                    {{#each customers}}
                    <div class="col-md-6 col-lg-4">
                        <a href="/websites/{{this}}" data-navigo class="card card-link">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <div class="font-weight-medium">
                                            <i class="ti ti-building me-2"></i>
                                            {{this}}
                                        </div>
                                        <div class="text-muted mt-1">
                                            Click to view websites
                                        </div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="ti ti-chevron-right text-muted"></i>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                    {{/each}}
                </div>
            </div>
        </div>
    `),

    websites: Handlebars.compile(`
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
                                    <th class="w-1 text-end">Usage</th>
                                    <th class="w-1">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{#each sites}}
                                <tr>
                                    <td colspan="2" style="cursor: pointer" onclick="window.router.navigate('/websites/{{../customerId}}/info/{{siteName}}')">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div class="d-flex align-items-center">
                                                <i class="ti ti-world me-2"></i>
                                                <span class="text-muted">{{siteName}}</span>
                                            </div>
                                            <span class="text-muted">{{usage}}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="btn-list flex-nowrap">
                                            <a href="/websites/{{../customerId}}/logs/{{siteName}}" 
                                               data-navigo
                                               class="btn btn-icon btn-ghost-secondary" 
                                               title="View Logs">
                                                <i class="ti ti-file-text"></i>
                                            </a>
                                            <button class="btn btn-icon btn-ghost-secondary" title="Backup">
                                                <i class="ti ti-download"></i>
                                            </button>
                                            <button class="btn btn-icon btn-ghost-secondary" title="Settings">
                                                <i class="ti ti-settings"></i>
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
    `),

    websiteInfo: Handlebars.compile(`
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
                                <a href="/websites/{{customerId}}/logs/{{siteName}}" 
                                   data-navigo 
                                   class="btn btn-outline-primary">
                                    <i class="ti ti-file-text me-2"></i>
                                    View Logs
                                </a>
                                <button class="btn btn-outline-primary" disabled>
                                    <i class="ti ti-download me-2"></i>
                                    Backup
                                </button>
                                <button class="btn btn-outline-primary" disabled>
                                    <i class="ti ti-upload me-2"></i>
                                    Restore
                                </button>
                                <button class="btn btn-outline-warning" id="restartWebsite">
                                    <i class="ti ti-refresh me-2"></i>
                                    Restart
                                </button>
                                <button class="btn btn-outline-warning" disabled>
                                    <i class="ti ti-refresh me-2"></i>
                                    Rebuild Cache
                                </button>
                                <button class="btn btn-outline-danger" disabled>
                                    <i class="ti ti-trash me-2"></i>
                                    Delete
                                </button>
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
                                                <code>{{phpmyadmin.password}}</code>
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
                                            <div class="datagrid-content"><code>{{sftp.password}}</code></div>
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
    `),

    users: Handlebars.compile(`
        <div class="page-header d-print-none">
            <div class="container-xl">
                <div class="row g-2 align-items-center">
                    <div class="col">
                        <div class="page-pretitle">
                            <a href="/customers" data-navigo class="text-muted">
                                <i class="ti ti-arrow-left"></i> Back to Dashboard
                            </a>
                        </div>
                        <h2 class="page-title">
                            <i class="ti ti-users me-2"></i>
                            User Management
                        </h2>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addUserModal">
                            <i class="ti ti-plus"></i> Add User
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="page-body">
            <div class="container-xl">
                <div class="row justify-content-center">
                    <div class="col-12 col-lg-10 col-xl-8">
                        <div class="card">
                            <div class="table-responsive">
                                <table class="table table-vcenter table-hover card-table">
                                    <thead>
                                        <tr>
                                            <th>Client ID</th>
                                            <th>Role</th>
                                            <th class="w-1">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {{#each users}}
                                        <tr>
                                            <td>{{username}}</td>
                                            <td>{{#if isAdmin}}Admin{{else}}User{{/if}}</td>
                                            <td>
                                                <div class="btn-list">
                                                    <button class="btn btn-ghost-secondary" 
                                                            data-action="reset-password"
                                                            data-username="{{username}}"
                                                            title="Reset Password">
                                                        <i class="ti ti-key me-1"></i>
                                                        Reset Password
                                                    </button>
                                                    {{#unless isAdmin}}
                                                    <button class="btn btn-ghost-danger" 
                                                            data-action="delete-user"
                                                            data-username="{{username}}"
                                                            title="Delete User">
                                                        <i class="ti ti-trash me-1"></i>
                                                        Delete
                                                    </button>
                                                    {{/unless}}
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
            </div>
        </div>

        <!-- Add User Modal -->
        <div class="modal modal-blur fade" id="addUserModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="addUserForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Client ID</label>
                                <input type="text" class="form-control" name="clientId" required>
                                <small class="form-hint">This will be used as both username and website filter</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" name="password" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-link link-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary ms-auto">
                                <i class="ti ti-plus"></i>
                                Create user
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `),

    dashboard: Handlebars.compile(`
        <nav class="container-fluid">
            <ul>
                <li><strong>Fovea.Hosting</strong></li>
            </ul>
            <ul>
                {{#if isAdmin}}
                    <li><a href="/users" data-navigo role="button" class="outline">Manage Users</a></li>
                {{/if}}
                <li><a href="#" id="logout" role="button" class="contrast outline">Logout</a></li>
            </ul>
        </nav>
        <main class="container">
            {{{content}}}
        </main>
    `),

    websiteLogs: Handlebars.compile(`
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
    `),

    confirmModal: Handlebars.compile(`
        <div class="modal modal-blur fade" id="confirmModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
                <div class="modal-content">
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    <div class="modal-status bg-{{type}}"></div>
                    <div class="modal-body text-center py-4">
                        <i class="ti ti-{{icon}} icon mb-3 icon-lg text-{{type}}"></i>
                        <h3>{{title}}</h3>
                        <div class="text-muted">{{message}}</div>
                    </div>
                    <div class="modal-footer">
                        <div class="w-100">
                            <div class="row">
                                <div class="col">
                                    <button class="btn w-100" data-bs-dismiss="modal">
                                        Cancel
                                    </button>
                                </div>
                                <div class="col">
                                    <button class="btn btn-{{type}} w-100" id="confirmModalAction">
                                        {{confirmText}}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `)
}; 