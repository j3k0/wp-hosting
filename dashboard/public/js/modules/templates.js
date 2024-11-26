import { ServiceStatusCard } from '../components/service-status.js';

Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

export const Templates = {
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
    `),

    restoreBackupModal: Handlebars.compile(`
        <div class="modal modal-blur fade" id="restoreBackupModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Restore Backup</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Select Backup</label>
                            <select class="form-select" id="backupSelect" size="10">
                                {{#each backups}}
                                    <option value="{{this}}">{{this}}</option>
                                {{/each}}
                            </select>
                        </div>
                        <div class="alert alert-warning mb-3" id="restoreWarning" style="display: none;">
                            <h4>Warning!</h4>
                            <p class="warning-message"></p>
                            <div id="backupSizeInfo" class="text-muted mb-3"></div>
                            <p class="confirm-message"></p>
                            <input type="text" class="form-control" id="restoreConfirmation" placeholder="Type confirmation here">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-link link-secondary" data-bs-dismiss="modal">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-warning ms-auto" id="confirmRestore" disabled>
                            <i class="ti ti-restore me-2"></i>
                            Restore
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `)
}; 