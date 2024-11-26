export const Layout = {
    template: Handlebars.compile(`
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
    `)
}; 