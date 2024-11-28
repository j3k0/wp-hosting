export const Layout = {
    template: Handlebars.compile(`
        <div class="page">
            <header class="navbar navbar-expand-md navbar-light d-none" id="header">
                <div class="container-xl">
                    <div class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
                        <a href="/customers" data-navigo class="admin-only d-none">
                            Fovea.Hosting
                        </a>
                        <span class="client-only d-none">Fovea.Hosting</span>
                    </div>
                    <div class="navbar-nav flex-row order-md-last">
                        {{#if canManageUsers}}
                            <div class="nav-item me-3">
                                <a href="/users" data-navigo class="nav-link">
                                    <i class="ti ti-users me-1"></i>
                                    Manage Users
                                </a>
                            </div>
                        {{/if}}
                        <div class="nav-item">
                            <a href="#" class="nav-link" id="logout">
                                <i class="ti ti-logout me-1"></i>
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            </header>
            <div class="page-wrapper">
                <div class="page-body">
                    <div class="container-xl">
                        {{{content}}}
                    </div>
                </div>
            </div>
        </div>
    `)
}; 