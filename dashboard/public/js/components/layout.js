export const Layout = {
    template: Handlebars.compile(`
        <div class="page">
            <header class="navbar navbar-expand-md navbar-light d-none" id="header">
                <div class="container-xl">
                    <div class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
                        <a href="/" data-navigo>
                            Fovea.Hosting
                        </a>
                    </div>
                    <div class="navbar-nav flex-row order-md-last">
                        {{#if userData.isAdmin}}
                            <div class="nav-item me-3">
                                <a href="/customers" data-navigo class="nav-link">
                                    <i class="ti ti-building me-1"></i>
                                    Customers
                                </a>
                            </div>
                        {{else}}
                            <div class="nav-item me-3">
                                <a href="/websites/{{userData.clientId}}" data-navigo class="nav-link">
                                    <i class="ti ti-world me-1"></i>
                                    Websites
                                </a>
                            </div>
                        {{/if}}
                        {{#if canManageUsers}}
                            <div class="nav-item me-3">
                                <a href="/users" data-navigo class="nav-link">
                                    <i class="ti ti-users me-1"></i>
                                    Manage Users
                                </a>
                            </div>
                        {{/if}}
                        <div class="nav-item me-3">
                            <a href="/account" data-navigo class="nav-link">
                                <i class="ti ti-user me-1"></i>
                                {{userData.username}}
                            </a>
                        </div>
                        <div class="nav-item">
                            <a href="#" class="nav-link" id="logout">
                                <i class="ti ti-logout"></i>
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