import { API } from '../modules/api.js';
import { render } from '../main.js';
import { showConfirmation, Notifications, showError, handleAPIRequest } from '../modules/utils.js';
import { ChangeGroupModal } from '../modals/modal-change-group.js';
import { AddGroupModal } from '../modals/modal-add-group.js';
import { AddUserModal } from '../modals/modal-add-user.js';
import { EditGroupModal } from '../modals/modal-edit-group.js';

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
            </div>
        </div>
    </div>
    <div class="page-body">
        <div class="container-xl">
            <div class="row">
                <!-- Groups Column -->
                <div class="col-12 col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Groups</h3>
                            <div class="card-actions">
                                <button class="btn btn-primary" id="addGroupBtn">
                                    <i class="ti ti-plus"></i> Add Group
                                </button>
                            </div>
                        </div>
                        <div class="list-group list-group-flush">
                            {{#each groups}}
                            <div class="list-group-item">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <div class="d-flex align-items-center">
                                            <i class="ti ti-users-group me-2"></i>
                                            <strong>
                                                {{#if ../userData.isAdmin}}
                                                    {{client_id}}:{{name}}
                                                {{else}}
                                                    {{name}}
                                                {{/if}}
                                            </strong>
                                        </div>
                                        <div class="text-muted small">
                                            {{#if allowed_sites.length}}
                                                {{allowed_sites.length}} sites
                                            {{else}}
                                                No sites
                                            {{/if}}
                                            {{#with (countGroupMembers @key ../users)}}
                                                • {{this}} member{{#unless (eq this 1)}}s{{/unless}}
                                            {{/with}}
                                        </div>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-ghost-secondary btn-sm"
                                                data-action="edit-group"
                                                data-group-id="{{@key}}"
                                                title="Edit Group">
                                            <i class="ti ti-edit"></i>
                                        </button>
                                        <button class="btn btn-ghost-danger btn-sm"
                                                data-action="delete-group"
                                                data-group-id="{{@key}}"
                                                data-group-name="{{name}}"
                                                data-member-count="{{countGroupMembers @key ../users}}"
                                                title="Delete Group">
                                            <i class="ti ti-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {{/each}}
                        </div>
                    </div>
                </div>

                <!-- Users Column -->
                <div class="col-12 col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Users</h3>
                            <div class="card-actions">
                                <button class="btn btn-primary" id="addUserBtn">
                                    <i class="ti ti-plus"></i> Add User
                                </button>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-vcenter table-hover card-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Client ID</th>
                                        <th>Group</th>
                                        <th class="w-1">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {{#each users}}
                                    <tr>
                                        <td>{{username}}</td>
                                        <td>{{clientId}}</td>
                                        <td>
                                            <div class="d-flex align-items-center gap-2">
                                                {{#if isAdmin}}
                                                    <span class="badge">Admin</span>
                                                {{else}}
                                                    <span class="badge">
                                                        {{#if isTeamAdmin}}
                                                            Team Admin
                                                        {{else if groupId}}
                                                            {{#with (lookup ../groups groupId)}}
                                                                {{#if ../../userData.isAdmin}}
                                                                    {{client_id}}:{{name}}
                                                                {{else}}
                                                                    {{name}}
                                                                {{/if}}
                                                            {{/with}}
                                                        {{else}}
                                                            None
                                                        {{/if}}
                                                    </span>
                                                    {{#unless (eq username ../userData.username)}}
                                                        <button class="btn btn-sm btn-ghost-secondary" 
                                                                data-action="change-group"
                                                                data-username="{{username}}"
                                                                data-is-team-admin="{{isTeamAdmin}}"
                                                                data-group-id="{{groupId}}"
                                                                title="Change Group">
                                                                <i class="ti ti-edit"></i>
                                                            </button>
                                                    {{/unless}}
                                                {{/if}}
                                            </div>
                                        </td>
                                        <td>
                                            {{#unless isAdmin}}
                                                {{#unless (eq username ../userData.username)}}
                                                    <div class="btn-list">
                                                        <button class="btn btn-ghost-secondary" 
                                                                data-action="reset-password"
                                                                data-username="{{username}}"
                                                                title="Reset Password">
                                                            <i class="ti ti-key me-1"></i>
                                                            Reset Password
                                                        </button>
                                                        <button class="btn btn-ghost-danger" 
                                                                data-action="delete-user"
                                                                data-username="{{username}}"
                                                                title="Delete User">
                                                            <i class="ti ti-trash me-1"></i>
                                                            Delete
                                                        </button>
                                                    </div>
                                                {{/unless}}
                                            {{/unless}}
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
`);

const setupFormHandlers = () => {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            try {
                await API.post('users', {
                    username: formData.get('username'),
                    password: formData.get('password'),
                    isTeamAdmin: formData.get('isTeamAdmin') === 'on',
                    // For team admins, use their own clientId
                    clientId: window.userData.isAdmin ? formData.get('clientId') : window.userData.clientId
                });

                // Close modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
                form.reset();
                
                // Refresh page
                await UsersPage.handler();
                
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

export const UsersPage = {
    template,

    setupEventHandlers() {
        document.removeEventListener('click', this.handleUserActions);
        document.addEventListener('click', this.handleUserActions);
    },

    handleUserActions: async (e) => {
        const resetBtn = e.target.closest('[data-action="reset-password"]');
        const deleteBtn = e.target.closest('[data-action="delete-user"]');
        const changeGroupBtn = e.target.closest('[data-action="change-group"]');
        const addUserBtn = e.target.closest('#addUserBtn');
        const addGroupBtn = e.target.closest('#addGroupBtn');
        const deleteGroupBtn = e.target.closest('[data-action="delete-group"]');
        const editGroupBtn = e.target.closest('[data-action="edit-group"]');

        if (resetBtn) {
            const username = resetBtn.dataset.username;
            await handleResetPassword(username);
        }
        else if (deleteBtn) {
            const username = deleteBtn.dataset.username;
            await handleDeleteUser(username);
        }
        else if (changeGroupBtn) {
            const username = changeGroupBtn.dataset.username;
            const currentData = {
                isTeamAdmin: changeGroupBtn.dataset.isTeamAdmin === 'true',
                groupId: changeGroupBtn.dataset.groupId || null
            };
            await UsersPage.handleChangeGroup(username, currentData);
        }
        else if (addUserBtn) {
            try {
                const result = await AddUserModal.show(window.userData);
                if (!result) return; // Modal was cancelled

                await API.post('users', result);
                Notifications.success('User created successfully');
                await UsersPage.handler();
            } catch (error) {
                showError(error, 'Failed to create user');
            }
        }
        else if (addGroupBtn) {
            try {
                console.log('Opening add group modal...');
                const result = await AddGroupModal.show(window.userData);
                if (!result) return; // Modal was cancelled

                await API.post('groups', result);
                Notifications.success('Group created successfully');
                await UsersPage.handler();
            } catch (error) {
                showError(error, 'Failed to create group');
            }
        }
        else if (deleteGroupBtn) {
            const groupId = deleteGroupBtn.dataset.groupId;
            const groupName = deleteGroupBtn.dataset.groupName;
            const memberCount = parseInt(deleteGroupBtn.dataset.memberCount, 10);

            let message = `Are you sure you want to delete group "${groupName}"?`;
            if (memberCount > 0) {
                message = `Warning: ${memberCount} user${memberCount === 1 ? ' is' : 's are'} currently member${memberCount === 1 ? '' : 's'} of this group.\n\n${message}\n\nAll members will be moved to "None" group.`;
            }

            try {
                const confirmed = await showConfirmation({
                    type: 'danger',
                    icon: 'trash',
                    title: 'Delete Group',
                    message,
                    confirmText: 'Delete'
                });

                if (confirmed) {
                    await API.delete(`groups/${groupId}`);
                    Notifications.success('Group deleted successfully');
                    await UsersPage.handler();
                }
            } catch (error) {
                showError(error, 'Failed to delete group');
            }
        }
        else if (editGroupBtn) {
            const groupId = editGroupBtn.dataset.groupId;
            try {
                const result = await EditGroupModal.show(groupId, window.userData);
                if (!result) return; // Modal was cancelled

                await API.put(`groups/${groupId}`, result);
                Notifications.success('Group updated successfully');
                await UsersPage.handler();
            } catch (error) {
                showError(error, 'Failed to update group');
            }
        }
    },

    async handleChangeGroup(username, currentData) {
        try {
            const groupsData = await API.get('groups');
            
            const result = await ChangeGroupModal.show(username, currentData, groupsData, window.userData);
            if (!result) return; // Modal was cancelled
            
            // Update the user's role and/or group
            if (result.isTeamAdmin !== currentData.isTeamAdmin) {
                await API.put(`users/${username}/role`, { isTeamAdmin: result.isTeamAdmin });
            }
            
            if (result.groupId !== currentData.groupId) {
                await API.put(`users/${username}/group`, { groupId: result.groupId });
            }
            
            Notifications.success('User group updated successfully');
            await UsersPage.handler();
        } catch (error) {
            showError(error, 'Failed to update user group');
        }
    },

    setupGroupFormHandlers() {
        const addGroupBtn = document.getElementById('addGroupBtn');
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    console.log('Opening add group modal...');
                    const result = await AddGroupModal.show(window.userData);
                    console.log('Modal result:', result);
                    
                    if (!result) {
                        console.log('Modal was cancelled');
                        return;
                    }

                    console.log('Creating group with data:', result);
                    await API.post('groups', result);
                    
                    Notifications.success('Group created successfully');
                    await UsersPage.handler();
                } catch (error) {
                    showError(error, 'Failed to create group');
                }
            });
        }
    },

    setupFormHandlers() {
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const result = await AddUserModal.show(window.userData);
                    if (!result) return; // Modal was cancelled

                    await API.post('users', result);
                    Notifications.success('User created successfully');
                    await UsersPage.handler();
                } catch (error) {
                    showError(error, 'Failed to create user');
                }
            });
        }
    },

    handler: async () => {
        try {
            const [users, groupsData] = await Promise.all([
                handleAPIRequest(
                    () => API.get('users'),
                    'Failed to load users'
                ),
                handleAPIRequest(
                    () => API.get('groups'),
                    'Failed to load groups'
                )
            ]);

            const groupsMap = Object.entries(groupsData).reduce((acc, [id, group]) => {
                acc[id] = group.name;
                return acc;
            }, {});

            render(template, { 
                users, 
                groups: groupsData,
                groupsMap,
                userData: window.userData
            });

            UsersPage.setupEventHandlers();
        } catch (error) {
            showError(error, 'Failed to load page data');
        }
    },

    // Add helper function to count group members
    countGroupMembers(groupId, users) {
        return users.filter(user => user.groupId === groupId).length;
    }
};

const handleToggleRole = (username, makeTeamAdmin) => {
    return UsersPage.handleToggleRole(username, makeTeamAdmin);
};

// Register the countGroupMembers helper with Handlebars
Handlebars.registerHelper('countGroupMembers', function(groupId, users) {
    return UsersPage.countGroupMembers(groupId, users);
});
 