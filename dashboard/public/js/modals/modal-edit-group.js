import { API } from '../modules/api.js';
import { GroupForm } from '../components/group-form.js';

export const EditGroupModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="editGroupModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Group</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    {{{groupForm}}}
                </div>
            </div>
        </div>
    `),

    show: async (groupId, userData) => {
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
                                <h3>Loading group data...</h3>
                            </div>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', loadingHtml);
            const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
            loadingModal.show();

            // Load group data and websites
            const [groups, websites] = await Promise.all([
                API.get('groups'),
                GroupForm.loadWebsites(userData.isAdmin ? groups[groupId].client_id : userData.clientId)
            ]);
            const group = groups[groupId];

            // Remove loading modal
            loadingModal.hide();
            document.getElementById('loadingModal').remove();
            document.querySelector('.modal-backdrop')?.remove();

            // Prepare the group form
            const groupForm = GroupForm.template({
                formId: 'editGroupForm',
                group,
                websites,
                userData,
                submitIcon: 'check',
                submitText: 'Save Changes'
            });

            // Show the modal
            const modalHtml = EditGroupModal.template({ groupForm });
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById('editGroupModal');
            const form = document.getElementById('editGroupForm');
            const modal = new bootstrap.Modal(modalElement);
            
            return new Promise((resolve) => {
                form.addEventListener('submit', async (e) => {
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
            console.error('Error showing edit group modal:', error);
            throw error;
        }
    }
}; 