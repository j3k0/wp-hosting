import { API } from '../modules/api.js';
import { UserGroupSelect } from '../components/user-group.js';

export const ChangeGroupModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="changeGroupModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Change Group for {{username}}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="changeGroupForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Group</label>
                                {{{userGroupSelect}}}
                                <small class="form-hint">Select Team Admin or a specific group</small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-link link-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary ms-auto">
                                <i class="ti ti-check me-2"></i>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `),

    show: async (username, currentData, allGroups, userData) => {
        try {
            // Filter groups to only show those matching the user's client ID
            const users = await API.get('users');
            const user = users.find(u => u.username === username);
            if (!user) throw new Error('User not found');

            // Filter groups based on client ID
            const filteredGroups = Object.fromEntries(
                Object.entries(allGroups)
                    .filter(([_, group]) => group.client_id === user.clientId)
            );

            // Prepare the user group select
            const userGroupSelect = UserGroupSelect.template({
                name: 'userGroup',
                required: true,
                groups: filteredGroups,
                currentGroupId: currentData.groupId,
                isTeamAdmin: currentData.isTeamAdmin,
                isNoGroup: !currentData.isTeamAdmin && !currentData.groupId,
                userData
            });

            // Show modal with current data
            const modalHtml = ChangeGroupModal.template({ 
                username, 
                userGroupSelect 
            });
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById('changeGroupModal');
            const form = document.getElementById('changeGroupForm');
            const modal = new bootstrap.Modal(modalElement);
            
            return new Promise((resolve) => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    form.classList.add('was-submitted');
                    const formData = new FormData(form);
                    
                    const result = UserGroupSelect.parseSelection(formData.get('userGroup'));
                    
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
            console.error('Error showing change group modal:', error);
            throw error;
        }
    }
}; 