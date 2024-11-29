import { API } from '../modules/api.js';
import { showError, isValidDomain, isValidSiteName } from '../modules/utils.js';

export const DeployWebsiteModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="deployWebsiteModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Deploy New Website</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="deployWebsiteForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label required">Domain</label>
                                <input type="text" class="form-control" name="domain" required 
                                       pattern="[a-z0-9][a-z0-9.\\-]*[a-z0-9]"
                                       placeholder="example.com">
                                <small class="form-hint">Enter domain without www</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label required">Site Name</label>
                                <div class="input-group">
                                    <span class="input-group-text">wp.{{clientId}}.</span>
                                    <input type="text" class="form-control" name="siteName" required
                                           pattern="[a-z0-9][a-z0-9.\\-]*[a-z0-9]">
                                </div>
                                <small class="form-hint">Site name will be automatically suggested based on domain</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label required">Type</label>
                                {{#if userData.isAdmin}}
                                <select class="form-select" name="type" required>
                                    <option value="php">PHP</option>
                                    <option value="wordpress">WordPress</option>
                                </select>
                                {{else}}
                                <input type="text" class="form-control" name="type" value="php" readonly disabled>
                                {{/if}}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-link link-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary ms-auto" id="deployButton">
                                <i class="ti ti-rocket"></i>
                                Deploy
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `),

    show: async (userData, customerId) => {
        try {
            const clientId = userData.isAdmin ? (customerId || '') : userData.clientId;
            const modalHtml = DeployWebsiteModal.template({ 
                userData,
                clientId
            });
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById('deployWebsiteModal');
            const form = document.getElementById('deployWebsiteForm');
            const modal = new bootstrap.Modal(modalElement);

            // Setup domain to site name auto-suggestion
            const domainInput = form.querySelector('input[name="domain"]');
            const siteNameInput = form.querySelector('input[name="siteName"]');
            
            domainInput.addEventListener('input', (e) => {
                const value = e.target.value.toLowerCase();
                e.target.value = value;
                
                if (!isValidDomain(value)) {
                    e.target.setCustomValidity('Domain must contain only lowercase letters, numbers, dots, and dashes');
                } else {
                    e.target.setCustomValidity('');
                }

                // Auto-suggest site name if it's empty
                const domain = value.trim().replace(/^www\./, '');
                const year = new Date().getFullYear();
                siteNameInput.value = `${year}.${domain}`;
                // Trigger input event to validate the new value
                siteNameInput.dispatchEvent(new Event('input'));
            });

            siteNameInput.addEventListener('input', (e) => {
                const value = e.target.value.toLowerCase();
                e.target.value = value;
                
                if (!isValidSiteName(value)) {
                    e.target.setCustomValidity('Site name must contain only lowercase letters, numbers, dots, and dashes');
                } else {
                    e.target.setCustomValidity('');
                }
            });

            return new Promise((resolve) => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const deployButton = document.getElementById('deployButton');
                    deployButton.disabled = true;
                    deployButton.innerHTML = '<i class="ti ti-loader ti-spin"></i> Deploying...';

                    try {
                        const formData = new FormData(form);
                        const domain = formData.get('domain').trim().toLowerCase().replace(/^www\./, '');
                        const siteName = formData.get('siteName').trim().toLowerCase();
                        const type = userData.isAdmin ? formData.get('type') : 'php';
                        const clientId = customerId || userData.clientId;
                        const fullSiteName = `wp.${clientId}.${siteName}`;
                        
                        if (!isValidDomain(domain)) {
                            showError(new Error('Invalid domain format'), 'Validation Error');
                            deployButton.disabled = false;
                            deployButton.innerHTML = '<i class="ti ti-rocket"></i> Deploy';
                            return;
                        }

                        if (!isValidSiteName(siteName)) {
                            showError(new Error('Invalid site name format'), 'Validation Error');
                            deployButton.disabled = false;
                            deployButton.innerHTML = '<i class="ti ti-rocket"></i> Deploy';
                            return;
                        }

                        // Only admins can use wordpress type
                        if (!userData.isAdmin && type !== 'php') {
                            showError(new Error('Invalid site type'), 'Validation Error');
                            deployButton.disabled = false;
                            deployButton.innerHTML = '<i class="ti ti-rocket"></i> Deploy';
                            return;
                        }

                        // Check if site exists
                        try {
                            await API.get(`websites/${fullSiteName}/info`);
                            showError(new Error('Site already exists'), 'Site name not available');
                            deployButton.disabled = false;
                            deployButton.innerHTML = '<i class="ti ti-rocket"></i> Deploy';
                            return;
                        } catch (error) {
                            // 404 is expected and means we can proceed
                            if (!error.message.includes('404')) {
                                // Only throw if it's not a 404
                                showError(error, 'Failed to validate site name');
                                deployButton.disabled = false;
                                deployButton.innerHTML = '<i class="ti ti-rocket"></i> Deploy';
                                return;
                            }
                            // If it's a 404, we can proceed with deployment
                            form.classList.add('was-submitted');
                            const result = {
                                domain,
                                siteName: fullSiteName,
                                type
                            };

                            // Hide modal and cleanup
                            modalElement.addEventListener('hidden.bs.modal', () => {
                                modalElement.remove();
                                resolve(result);
                            }, { once: true });
                            modal.hide();
                        }
                    } catch (error) {
                        showError(error, 'Deployment validation failed');
                        deployButton.disabled = false;
                        deployButton.innerHTML = '<i class="ti ti-rocket"></i> Deploy';
                    }
                });
                
                modalElement.addEventListener('hidden.bs.modal', () => {
                    if (!form.classList.contains('was-submitted')) {
                        modalElement.remove();
                        resolve(null);
                    }
                }, { once: true });
                
                modal.show();
            });
        } catch (error) {
            console.error('Error showing deploy website modal:', error);
            throw error;
        }
    }
}; 