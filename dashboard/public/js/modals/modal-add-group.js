import { API } from '../modules/api.js';
import { GroupForm } from '../components/group-form.js';

export const AddGroupModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="addGroupModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New Group</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    {{{groupForm}}}
                </div>
            </div>
        </div>
    `),

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

            // Fetch websites for team admin
            let websites = [];
            if (!userData.isAdmin) {
                websites = await GroupForm.loadWebsites(userData.clientId);
                console.log('Loaded websites for team admin:', websites);
            }

            // Remove loading modal
            loadingModal.hide();
            document.getElementById('loadingModal').remove();
            document.querySelector('.modal-backdrop')?.remove();

            // Prepare the group form
            const groupForm = GroupForm.template({
                formId: 'addGroupForm',
                group: {},  // Empty for new group
                websites,
                userData,
                submitIcon: 'plus',
                submitText: 'Create group'
            });

            // Show the modal
            const modalHtml = AddGroupModal.template({ groupForm });
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById('addGroupModal');
            const form = document.getElementById('addGroupForm');
            const modal = new bootstrap.Modal(modalElement);

            // Setup client ID handler if admin
            if (userData.isAdmin) {
                await GroupForm.setupClientIdHandler(form, userData);
            }
            
            return new Promise((resolve) => {
                const submitHandler = async (e) => {
                    e.preventDefault();
                    form.classList.add('was-submitted');
                    
                    const result = GroupForm.getFormData(form);

                    // Hide modal and cleanup
                    modal.hide();
                    modalElement.addEventListener('hidden.bs.modal', () => {
                        modalElement.remove();
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) backdrop.remove();
                        document.body.classList.remove('modal-open');
                        // Remove event listeners
                        form.removeEventListener('submit', submitHandler);
                        resolve(result);
                    }, { once: true });
                };

                const closeHandler = () => {
                    if (!form.classList.contains('was-submitted')) {
                        modalElement.remove();
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) backdrop.remove();
                        document.body.classList.remove('modal-open');
                        // Remove event listeners
                        modalElement.removeEventListener('hidden.bs.modal', closeHandler);
                        resolve(null);
                    }
                };

                // Add event listeners
                form.addEventListener('submit', submitHandler, { once: true });
                modalElement.addEventListener('hidden.bs.modal', closeHandler, { once: true });
                
                modal.show();
            });
        } catch (error) {
            console.error('Error showing add group modal:', error);
            throw error;
        }
    }
}; 