import { API } from '../modules/api.js';
import { render } from '../main.js';
import { showError, Notifications } from '../modules/utils.js';

const template = Handlebars.compile(`
    <div class="page-header d-print-none">
        <div class="container-xl">
            <div class="row g-2 align-items-center">
                <div class="col">
                    <h2 class="page-title">
                        <i class="ti ti-user me-2"></i>
                        Account Settings
                    </h2>
                </div>
            </div>
        </div>
    </div>
    <div class="page-body">
        <div class="container-xl">
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Account Information</h3>
                        </div>
                        <div class="card-body">
                            <div class="datagrid">
                                <div class="datagrid-item">
                                    <div class="datagrid-title">Username</div>
                                    <div class="datagrid-content">{{userData.username}}</div>
                                </div>
                                <div class="datagrid-item">
                                    <div class="datagrid-title">Role</div>
                                    <div class="datagrid-content">
                                        {{#if userData.isAdmin}}
                                            Administrator
                                        {{else if userData.isTeamAdmin}}
                                            Team Administrator
                                        {{else}}
                                            Team Member
                                        {{/if}}
                                    </div>
                                </div>
                                {{#if userData.groupId}}
                                <div class="datagrid-item">
                                    <div class="datagrid-title">Group</div>
                                    <div class="datagrid-content">{{groupName}}</div>
                                </div>
                                {{/if}}
                            </div>
                        </div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header">
                            <h3 class="card-title">Change Password</h3>
                        </div>
                        <div class="card-body">
                            <form id="changePasswordForm">
                                <div class="mb-3">
                                    <label class="form-label">Current Password</label>
                                    <input type="password" class="form-control" name="currentPassword" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">New Password</label>
                                    <input type="password" class="form-control" name="newPassword" required>
                                    <div class="form-text text-muted">
                                        Password must be at least 8 characters long and contain at least one uppercase letter and one number.
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-control" name="confirmPassword" required>
                                </div>
                                <div class="form-footer">
                                    <button type="submit" class="btn btn-primary">
                                        Change Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`);

const handler = async () => {
    try {
        // Get group information if user is in a group
        let groupName = '';
        if (window.userData.groupId) {
            const groups = await API.get('groups');
            groupName = groups[window.userData.groupId]?.name || 'Unknown Group';
        }

        render(template, { groupName });

        // Handle password change form
        const form = document.getElementById('changePasswordForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const currentPassword = formData.get('currentPassword');
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            if (newPassword !== confirmPassword) {
                showError(new Error('Passwords do not match'), 'Password Validation');
                return;
            }

            // Add client-side password validation
            if (newPassword.length < 8) {
                showError(new Error('Password must be at least 8 characters long'), 'Password Validation');
                return;
            }

            if (!/[A-Z]/.test(newPassword)) {
                showError(new Error('Password must contain at least one uppercase letter'), 'Password Validation');
                return;
            }

            if (!/\d/.test(newPassword)) {
                showError(new Error('Password must contain at least one number'), 'Password Validation');
                return;
            }

            try {
                await API.post('account/password', {
                    currentPassword,
                    newPassword
                });
                
                Notifications.success('Password changed successfully');
                form.reset();
            } catch (error) {
                showError(error, 'Failed to change password');
            }
        });
    } catch (error) {
        showError(error, 'Failed to load account information');
    }
};

export const AccountPage = {
    template,
    handler
}; 