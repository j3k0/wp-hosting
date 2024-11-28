import { API } from '../modules/api.js';
import { UserGroupSelect } from '../components/user-group.js';

export const AddUserModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="addUserModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="addUserForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" name="username" required>
                            </div>
                            {{#if userData.isAdmin}}
                            <div class="mb-3">
                                <label class="form-label">Client ID</label>
                                <input type="text" class="form-control" name="clientId" required>
                                <small class="form-hint">This will be used to filter accessible websites</small>
                            </div>
                            {{/if}}
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" name="password" required>
                            </div>
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
                                <i class="ti ti-plus"></i>
                                Create user
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `),

    show: async (userData) => {
        try {
            // Load groups if needed
            let groups = {};
            if (!userData.isAdmin) {
                groups = await API.get('groups');
            }

            // Prepare the user group select
            const userGroupSelect = UserGroupSelect.template({
                name: 'userGroup',
                required: true,
                groups,
                isNoGroup: true
            });

            // Show modal with current data
            const modalHtml = AddUserModal.template({ userData, userGroupSelect });
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById('addUserModal');
            const form = document.getElementById('addUserForm');
            const modal = new bootstrap.Modal(modalElement);
            
            // For admin, add client ID change handler to load groups
            if (userData.isAdmin) {
                const clientIdInput = form.querySelector('input[name="clientId"]');
                const groupSelect = form.querySelector('select[name="userGroup"]');
                
                clientIdInput.addEventListener('change', async () => {
                    const clientId = clientIdInput.value.trim();
                    if (clientId) {
                        try {
                            const groups = await API.get('groups');
                            const filteredGroups = Object.fromEntries(
                                Object.entries(groups)
                                    .filter(([_, group]) => group.client_id === clientId)
                            );
                            
                            // Update select options
                            groupSelect.innerHTML = UserGroupSelect.template({
                                name: 'userGroup',
                                required: true,
                                groups: filteredGroups,
                                isNoGroup: true
                            });
                        } catch (error) {
                            console.error('Failed to load groups:', error);
                            groupSelect.innerHTML = UserGroupSelect.template({
                                name: 'userGroup',
                                required: true,
                                groups: {},
                                isNoGroup: true
                            });
                        }
                    }
                });
            }
            
            return new Promise((resolve) => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    form.classList.add('was-submitted');
                    const formData = new FormData(form);
                    
                    // Parse the group selection
                    const groupSelection = UserGroupSelect.parseSelection(formData.get('userGroup'));

                    const result = {
                        username: formData.get('username'),
                        password: formData.get('password'),
                        isTeamAdmin: groupSelection.isTeamAdmin,
                        groupId: groupSelection.groupId,
                        clientId: userData.isAdmin ? formData.get('clientId') : userData.clientId
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
            console.error('Error showing add user modal:', error);
            throw error;
        }
    }
}; 