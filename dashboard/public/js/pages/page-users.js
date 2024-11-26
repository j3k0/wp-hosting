import { API } from '../modules/api.js';
import { render } from '../main.js';
import { showConfirmation, Notifications, showError, handleAPIRequest } from '../modules/utils.js';

const template = Handlebars.compile(`
    <div class="page-header d-print-none">
        <div class="container-xl">
            <div class="row g-2 align-items-center">
                <div class="col">
                    <div class="page-pretitle">
                        <a href="/customers" data-navigo class="text-muted">
                            <i class="ti ti-arrow-left"></i> Back to Dashboard
                        </a>
                    </div>
                    <h2 class="page-title">
                        <i class="ti ti-users me-2"></i>
                        User Management
                    </h2>
                </div>
                <div class="col-auto">
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addUserModal">
                        <i class="ti ti-plus"></i> Add User
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class="page-body">
        <div class="container-xl">
            <div class="row justify-content-center">
                <div class="col-12 col-lg-10 col-xl-8">
                    <div class="card">
                        <div class="table-responsive">
                            <table class="table table-vcenter table-hover card-table">
                                <thead>
                                    <tr>
                                        <th>Client ID</th>
                                        <th>Role</th>
                                        <th class="w-1">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {{#each users}}
                                    <tr>
                                        <td>{{username}}</td>
                                        <td>{{#if isAdmin}}Admin{{else}}User{{/if}}</td>
                                        <td>
                                            <div class="btn-list">
                                                <button class="btn btn-ghost-secondary" 
                                                        data-action="reset-password"
                                                        data-username="{{username}}"
                                                        title="Reset Password">
                                                    <i class="ti ti-key me-1"></i>
                                                    Reset Password
                                                </button>
                                                {{#unless isAdmin}}
                                                <button class="btn btn-ghost-danger" 
                                                        data-action="delete-user"
                                                        data-username="{{username}}"
                                                        title="Delete User">
                                                    <i class="ti ti-trash me-1"></i>
                                                    Delete
                                                </button>
                                                {{/unless}}
                                            </div>
                                        </td>
                                    </tr>
                                    {{/each}}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Add User Modal -->
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
                            <label class="form-label">Client ID</label>
                            <input type="text" class="form-control" name="clientId" required>
                            <small class="form-hint">This will be used as both username and website filter</small>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-control" name="password" required>
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
`);

const setupFormHandlers = () => {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const clientId = formData.get('clientId');

            try {
                await API.post('users', {
                    username: clientId,
                    password: formData.get('password'),
                    clientId: clientId,
                    isAdmin: false
                });

                // Close modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
                form.reset();
                
                // Refresh users list by reloading the page
                await handler();
                
                Notifications.success('User created successfully');
            } catch (error) {
                showError(error, 'Failed to create user');
            }
        });
    }
};

const handleResetPassword = async (username) => {
    try {
        const confirmed = await showConfirmation({
            type: 'warning',
            icon: 'key',
            title: 'Reset Password',
            message: `Are you sure you want to reset the password for ${username}?`,
            confirmText: 'Reset Password'
        });

        if (confirmed) {
            const password = prompt('Enter new password for ' + username);
            if (password) {
                await API.post(`users/${username}/reset-password`, { password });
                Notifications.success('Password updated successfully');
            }
        }
    } catch (error) {
        showError(error, 'Failed to reset password');
    }
};

const handleDeleteUser = async (username) => {
    try {
        const confirmed = await showConfirmation({
            type: 'danger',
            icon: 'trash',
            title: 'Delete User',
            message: `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
            confirmText: 'Delete'
        });

        if (confirmed) {
            await API.delete(`users/${username}`);
            Notifications.success('User deleted successfully');
            await handler();
        }
    } catch (error) {
        showError(error, 'Failed to delete user');
    }
};

const handler = async () => {
    const users = await handleAPIRequest(
        () => API.get('users'),
        'Failed to load users'
    );
    render(template, { users });

    setupFormHandlers();

    // Add event handlers for reset password and delete buttons
    document.addEventListener('click', async (e) => {
        const resetBtn = e.target.closest('[data-action="reset-password"]');
        const deleteBtn = e.target.closest('[data-action="delete-user"]');

        if (resetBtn) {
            const username = resetBtn.dataset.username;
            await handleResetPassword(username);
        }
        else if (deleteBtn) {
            const username = deleteBtn.dataset.username;
            await handleDeleteUser(username);
        }
    });
};

export const UsersPage = {
    template,
    handler
}; 