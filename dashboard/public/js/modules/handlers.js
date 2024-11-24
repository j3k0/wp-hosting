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

export const Handlers = {
    async login() {
        render(Templates.login);
        
        document.getElementById('login').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const data = await API.post('login', { username, password });
                window.userData = data;
                window.router.navigate(data.isAdmin ? '/customers' : `/websites/${data.clientId}`);
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
            }
        });
    },

    async customers() {
        try {
            const { customers } = await API.get('customers');
            render(Templates.customers, { customers });
        } catch (error) {
            console.error('Failed to load customers:', error);
            alert('Failed to load customers: ' + error.message);
        }
    },

    async websites({ data }) {
        try {
            const response = await API.get(`websites/${data.customerId}`);
            const sites = response.sites.map(site => ({
                siteName: site.name.split('.').slice(2).join('.'),
                usage: formatBytes(site.usage)
            }));
            render(Templates.websites, { 
                customerId: data.customerId, 
                sites,
                userData: window.userData 
            });
        } catch (error) {
            console.error('Failed to load websites:', error);
            alert('Failed to load websites: ' + error.message);
        }
    },

    async websiteInfo({ data }) {
        try {
            const fullSiteName = `wp.${data.customerId}.${data.siteName}`;
            const info = await API.get(`websites/${fullSiteName}/info`);
            
            const templateData = {
                customerId: data.customerId,
                siteName: data.siteName,
                userData: window.userData 
            };

            if (info.raw && !info.urls) {
                render(Templates.websiteInfo, { 
                    ...templateData,
                    raw: info.raw 
                });
                return;
            }

            render(Templates.websiteInfo, {
                ...templateData,
                urls: info.urls,
                phpmyadmin: info.phpmyadmin,
                sftp: info.sftp,
                dns: info.dns.join('\n')
            });
        } catch (error) {
            console.error('Error showing website info:', error);
            alert('Failed to load website information');
        }
    },

    async users() {
        try {
            const users = await API.get('users');
            render(Templates.users, { users });

            // Add user form handler
            const form = document.getElementById('addUserForm');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const formData = new FormData(form);
                    const clientId = formData.get('clientId');
                    const userData = {
                        username: clientId,
                        password: formData.get('password'),
                        clientId: clientId,
                        isAdmin: false
                    };

                    try {
                        await API.post('users', userData);
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                        modal.hide();
                        // Reset form
                        form.reset();
                        // Refresh users list
                        Handlers.users();
                    } catch (error) {
                        console.error('Failed to create user:', error);
                        alert('Failed to create user: ' + error.message);
                    }
                });
            }

            // Add password reset handler
            window.resetPassword = async (username) => {
                const password = prompt('Enter new password for ' + username);
                if (password) {
                    try {
                        await API.post(`users/${username}/reset-password`, { password });
                        alert('Password updated successfully');
                    } catch (error) {
                        console.error('Failed to reset password:', error);
                        alert('Failed to reset password: ' + error.message);
                    }
                }
            };

            // Add delete user handler
            window.deleteUser = async (username) => {
                if (confirm(`Are you sure you want to delete user "${username}"?`)) {
                    try {
                        await API.delete(`users/${username}`);
                        // Refresh users list
                        Handlers.users();
                    } catch (error) {
                        console.error('Failed to delete user:', error);
                        alert('Failed to delete user: ' + error.message);
                    }
                }
            };
        } catch (error) {
            console.error('Failed to load users:', error);
            alert('Failed to load users: ' + error.message);
        }
    }
}; 