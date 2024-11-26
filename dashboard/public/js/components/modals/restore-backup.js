export const RestoreBackupModal = {
    template: Handlebars.compile(`
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