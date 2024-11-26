import { API } from '../modules/api.js';
import { Notifications, showError } from '../modules/utils.js';

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
    `),

    show: async (fullSiteName, options = {}) => {
        const { handleServiceAction } = options;

        try {
            // Load backups
            const response = await API.get(`websites/${fullSiteName}/backups`);
            const { backups } = response;
            
            if (!backups.length) {
                Notifications.warning('No backups available');
                return;
            }

            // Show modal with backups
            const modalHtml = RestoreBackupModal.template({ backups });
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById('restoreBackupModal');
            const modal = new bootstrap.Modal(modalElement);
            const backupSelect = document.getElementById('backupSelect');
            const restoreWarning = document.getElementById('restoreWarning');
            const confirmBtn = document.getElementById('confirmRestore');
            const confirmInput = document.getElementById('restoreConfirmation');
            const sizeInfo = document.getElementById('backupSizeInfo');
            
            backupSelect.addEventListener('change', async () => {
                const selectedBackup = backupSelect.value;
                const selectedIndex = backupSelect.selectedIndex;
                
                // Show loading indicator
                restoreWarning.style.display = 'block';
                const warningMessage = restoreWarning.querySelector('.warning-message');
                const confirmMessage = restoreWarning.querySelector('.confirm-message');
                sizeInfo.innerHTML = '<i class="ti ti-loader ti-spin"></i> Calculating size...';
                
                try {
                    // Get backup size
                    const sizeData = await API.getBackupSize(fullSiteName, selectedBackup);
                    
                    // Update size info and warning messages
                    sizeInfo.textContent = `Total size: ${sizeData.formatted}`;
                    warningMessage.textContent = 
                        `Restoring this backup will take time. The operation will process ${backups.length - selectedIndex} backup files.`;
                    confirmMessage.textContent = 
                        `To confirm, please type "RESTORE FROM ${selectedBackup}" below:`;
                } catch (error) {
                    console.error('Error getting backup size:', error);
                    sizeInfo.innerHTML = '<i class="ti ti-alert-triangle text-warning"></i> Failed to calculate size';
                }
                
                // Reset confirmation
                confirmInput.value = '';
                confirmBtn.disabled = true;
            });
            
            confirmInput.addEventListener('input', () => {
                const selectedBackup = backupSelect.value;
                const expectedText = `RESTORE FROM ${selectedBackup}`;
                confirmBtn.disabled = confirmInput.value.toUpperCase() !== expectedText.toUpperCase();
            });
            
            confirmBtn.addEventListener('click', async () => {
                try {
                    const selectedBackup = backupSelect.value;
                    modal.hide();
                    
                    await handleServiceAction(
                        async () => { await API.restoreBackup(fullSiteName, selectedBackup); },
                        'restoreBackup',
                        'Restoring Backup...'
                    );
                } catch (error) {
                    showError(error, 'Failed to restore backup');
                }
            });
            
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });
            
            modal.show();
        } catch (error) {
            showError(error, 'Failed to load backups');
        }
    }
}; 