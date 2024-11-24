import { API } from './api.js';
import { Templates } from './templates.js';
import { render } from '../main.js';

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Add utility functions at the top
const showError = (error, context) => {
    console.error(`${context}:`, error);
    alert(`${context}: ${error.message}`);
};

const handleAPIRequest = async (apiCall, errorContext) => {
    try {
        return await apiCall();
    } catch (error) {
        showError(error, errorContext);
        throw error;
    }
};

export const Handlers = {
    async login() {
        render(Templates.login);
        
        document.getElementById('login').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            await handleAPIRequest(async () => {
                const data = await API.post('login', {
                    username: formData.get('username'),
                    password: formData.get('password')
                });
                window.userData = data;
                window.router.navigate(data.isAdmin ? '/customers' : `/websites/${data.clientId}`);
            }, 'Login failed');
        });
    },

    async customers() {
        const { customers } = await handleAPIRequest(
            () => API.get('customers'),
            'Failed to load customers'
        );
        render(Templates.customers, { customers });
    },

    async websites({ data }) {
        const response = await handleAPIRequest(
            () => API.get(`websites/${data.customerId}`),
            'Failed to load websites'
        );

        const sites = response.sites.map(site => ({
            siteName: site.name.split('.').slice(2).join('.'),
            usage: formatBytes(site.usage)
        }));

        render(Templates.websites, { 
            customerId: data.customerId, 
            sites,
            userData: window.userData 
        });
    },

    async websiteInfo({ data }) {
        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
        const info = await handleAPIRequest(
            () => API.get(`websites/${fullSiteName}/info`),
            'Failed to load website information'
        );
        
        console.log('Frontend received info:', info);
        console.log('Info structure check:', {
            hasUrls: !!info.urls,
            hasPhpMyAdmin: !!info.phpmyadmin,
            hasSftp: !!info.sftp,
            hasDns: !!info.dns,
            hasRaw: !!info.raw
        });
        
        // If we have structured data, use it; otherwise use raw
        const templateData = {
            customerId: data.customerId,
            siteName: data.siteName,
            userData: window.userData
        };

        if (info.urls?.length || info.phpmyadmin?.url || info.sftp?.host || info.dns?.length) {
            // Use structured data
            Object.assign(templateData, {
                urls: info.urls,
                phpmyadmin: info.phpmyadmin,
                sftp: info.sftp,
                dns: info.dns
            });
        } else {
            // Use raw data
            templateData.raw = info.raw;
        }

        console.log('Template data being rendered:', templateData);
        render(Templates.websiteInfo, templateData);
    },

    async users() {
        const users = await handleAPIRequest(
            () => API.get('users'),
            'Failed to load users'
        );
        render(Templates.users, { users });

        // Setup form handlers
        this.setupUserFormHandlers();
    },

    // Extract user management handlers to separate methods
    setupUserFormHandlers() {
        const form = document.getElementById('addUserForm');
        if (form) {
            form.addEventListener('submit', this.handleAddUser);
        }

        // Add global handlers
        window.resetPassword = this.handleResetPassword;
        window.deleteUser = this.handleDeleteUser;
    },

    async handleAddUser(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const clientId = formData.get('clientId');

        await handleAPIRequest(async () => {
            await API.post('users', {
                username: clientId,
                password: formData.get('password'),
                clientId: clientId,
                isAdmin: false
            });

            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
            modal.hide();
            e.target.reset();
            
            // Refresh users list
            Handlers.users();
        }, 'Failed to create user');
    },

    async handleResetPassword(username) {
        const password = prompt('Enter new password for ' + username);
        if (password) {
            await handleAPIRequest(
                () => API.post(`users/${username}/reset-password`, { password }),
                'Failed to reset password'
            );
            alert('Password updated successfully');
        }
    },

    async handleDeleteUser(username) {
        if (confirm(`Are you sure you want to delete user "${username}"?`)) {
            await handleAPIRequest(async () => {
                await API.delete(`users/${username}`);
                Handlers.users();
            }, 'Failed to delete user');
        }
    },

    websiteLogs: async function({ data }) {
        const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
        const lines = document.getElementById('logLines')?.value || 100;
        
        await Handlers.loadLogs(fullSiteName, lines, data);
    },

    loadLogs: async function(fullSiteName, lines, data) {
        const { logs } = await handleAPIRequest(
            () => API.get(`websites/${fullSiteName}/logs?lines=${lines}`),
            'Failed to load logs'
        );

        render(Templates.websiteLogs, {
            customerId: data.customerId,
            siteName: data.siteName,
            logs,
            selectedLines: lines
        });

        // Re-attach event handlers after render
        this.setupLogHandlers(fullSiteName, data);
    },

    setupLogHandlers: function(fullSiteName, data) {
        const lineSelect = document.getElementById('logLines');
        const refreshBtn = document.getElementById('refreshLogs');

        if (lineSelect) {
            lineSelect.addEventListener('change', () => {
                this.loadLogs(fullSiteName, lineSelect.value, data);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const currentLines = document.getElementById('logLines')?.value || 100;
                this.loadLogs(fullSiteName, currentLines, data);
            });
        }
    }
}; 