import { API } from '../modules/api.js';

export const AddGroupModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="addGroupModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New Group</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="addGroupForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Group Name</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                            {{#if userData.isAdmin}}
                            <div class="mb-3">
                                <label class="form-label">Client ID</label>
                                <input type="text" class="form-control" name="clientId" required>
                                <small class="form-hint">The client this group belongs to</small>
                            </div>
                            {{/if}}
                            <div class="mb-3">
                                <label class="form-label">Allowed Sites</label>
                                <select class="form-select" name="allowedSites" multiple size="8">
                                    {{#each websites}}
                                        <option value="{{this}}">{{this}}</option>
                                    {{/each}}
                                </select>
                                <small class="form-hint">Hold Ctrl/Cmd to select multiple sites. Leave empty for no access.</small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-link link-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary ms-auto">
                                <i class="ti ti-plus"></i>
                                Create group
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `),

    async loadWebsites(clientId) {
        const response = await API.get(`websites/${clientId}`);
        return response.sites.map(site => site.name);
    },

    show: async (userData) => {
        try {
            // Create loading indicator
            const loadingHtml = `
                <div class="modal modal-blur fade" id="loadingModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-body text-center py-4">
                                <div class="mb-3">
                                    <i class="ti ti-loader ti-spin" style="font-size: 2rem;"></i>
                                </div>
                                <h3>Loading websites...</h3>
                            </div>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', loadingHtml);
            const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
            loadingModal.show();

            // Fetch websites
            let websites = [];
            if (!userData.isAdmin) {
                websites = await AddGroupModal.loadWebsites(userData.clientId);
                console.log('Loaded websites for team admin:', websites);
            }

            // Remove loading modal
            loadingModal.hide();
            document.getElementById('loadingModal').remove();
            document.querySelector('.modal-backdrop')?.remove();

            // Show the actual modal with loaded data
            const modalHtml = AddGroupModal.template({ userData, websites });
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById('addGroupModal');
            const form = document.getElementById('addGroupForm');
            const modal = new bootstrap.Modal(modalElement);
            
            // For admin, add client ID change handler to load websites
            if (userData.isAdmin) {
                const clientIdInput = form.querySelector('input[name="clientId"]');
                const sitesSelect = form.querySelector('select[name="allowedSites"]');
                
                clientIdInput.addEventListener('change', async () => {
                    const clientId = clientIdInput.value.trim();
                    if (clientId) {
                        sitesSelect.disabled = true;
                        sitesSelect.innerHTML = '<option>Loading...</option>';
                        
                        try {
                            const websites = await AddGroupModal.loadWebsites(clientId);
                            console.log('Loaded websites for admin:', websites);
                            
                            // Update select options
                            sitesSelect.innerHTML = websites
                                .map(site => `<option value="${site}">${site}</option>`)
                                .join('');
                        } catch (error) {
                            console.error('Failed to load websites:', error);
                            sitesSelect.innerHTML = '';
                        } finally {
                            sitesSelect.disabled = false;
                        }
                    }
                });
            }
            
            return new Promise((resolve) => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    form.classList.add('was-submitted');
                    const formData = new FormData(form);
                    
                    // Get selected options from multiple select
                    const allowedSites = Array.from(
                        form.querySelector('select[name="allowedSites"]').selectedOptions
                    ).map(option => option.value);

                    const result = {
                        name: formData.get('name'),
                        clientId: userData.isAdmin ? formData.get('clientId') : userData.clientId,
                        allowedSites
                    };

                    // Hide modal and cleanup
                    modal.hide();
                    modalElement.addEventListener('hidden.bs.modal', () => {
                        modalElement.remove();
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) backdrop.remove();
                        document.body.classList.remove('modal-open');
                        resolve(result);
                    }, { once: true });
                });
                
                // Handle modal close/cancel
                modalElement.addEventListener('hidden.bs.modal', () => {
                    if (!form.classList.contains('was-submitted')) {
                        modalElement.remove();
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) backdrop.remove();
                        document.body.classList.remove('modal-open');
                        resolve(null);
                    }
                }, { once: true });
                
                modal.show();
            });
        } catch (error) {
            console.error('Error showing add group modal:', error);
            throw error;
        }
    }
}; 