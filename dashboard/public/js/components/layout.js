import { formatDisplayUsername } from '../modules/utils.js';

export const Layout = {
    template: Handlebars.compile(`
        <div class="page">
            <header class="navbar navbar-expand-md navbar-light d-print-none">
                <div class="container-xl">
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
                        <a href="/" class="text-decoration-none text-primary" style="color: #206bc4 !important;">
                            Fovea.Hosting
                        </a>
                    </h1>
                    {{#if userData.username}}
                    <div class="collapse navbar-collapse" id="navbar-menu">
                        <div class="d-flex flex-column flex-md-row flex-fill align-items-stretch align-items-md-center">
                            <ul class="navbar-nav">
                                {{#if userData.isAdmin}}
                                    <li class="nav-item">
                                        <a class="nav-link" href="/customers" data-navigo>
                                            <span class="nav-link-icon d-md-none d-lg-inline-block">
                                                <i class="ti ti-building"></i>
                                            </span>
                                            <span class="nav-link-title">
                                                Customers
                                            </span>
                                        </a>
                                    </li>
                                {{else}}
                                    <li class="nav-item">
                                        <a class="nav-link" href="/websites/{{userData.clientId}}" data-navigo>
                                            <span class="nav-link-icon d-md-none d-lg-inline-block">
                                                <i class="ti ti-world"></i>
                                            </span>
                                            <span class="nav-link-title">
                                                Websites
                                            </span>
                                        </a>
                                    </li>
                                {{/if}}
                                {{#if (or userData.isAdmin userData.isTeamAdmin)}}
                                    <li class="nav-item">
                                        <a class="nav-link" href="/users" data-navigo>
                                            <span class="nav-link-icon d-md-none d-lg-inline-block">
                                                <i class="ti ti-users"></i>
                                            </span>
                                            <span class="nav-link-title">
                                                Manage Users
                                            </span>
                                        </a>
                                    </li>
                                {{/if}}
                            </ul>
                        </div>
                    </div>
                    <div class="navbar-nav flex-row order-md-last">
                        <div class="nav-item dropdown">
                            <a href="#" class="nav-link d-flex lh-1 text-reset p-0" data-bs-toggle="dropdown" aria-label="Open user menu">
                                <div class="d-none d-xl-block ps-2">
                                    <div>{{formatDisplayUsername userData.username}}</div>
                                    <div class="mt-1 small text-muted">
                                        {{#if userData.isAdmin}}
                                            Administrator
                                        {{else if userData.isTeamAdmin}}
                                            Team Administrator
                                        {{else if userData.groupName}}
                                            {{userData.groupName}}
                                        {{else}}
                                            Team Member
                                        {{/if}}
                                    </div>
                                </div>
                                <span class="avatar avatar-sm ms-2">{{userInitials userData.username}}</span>
                            </a>
                            <div class="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                                <a href="/account" class="dropdown-item" data-navigo>
                                    <i class="ti ti-user me-1"></i>
                                    Account Settings
                                </a>
                                <div class="dropdown-divider"></div>
                                <a href="#" class="dropdown-item" data-action="logout">
                                    <i class="ti ti-logout me-1"></i>
                                    Logout
                                </a>
                            </div>
                        </div>
                    </div>
                    {{/if}}
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
    `),

    userInitials(username) {
        if (!username) return '';
        
        return username
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase())
            .join('')
            .slice(0, 2);
    }
};

// Register helpers
Handlebars.registerHelper('formatDisplayUsername', formatDisplayUsername);
Handlebars.registerHelper('userInitials', Layout.userInitials);
Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
}); 