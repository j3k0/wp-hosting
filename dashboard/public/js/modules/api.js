// Handle all API calls
export const API = {
    // Common fetch handler to reduce duplication
    async fetchAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`/api/${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                // For 404s, include status code in error message for easier checking
                if (response.status === 404) {
                    throw new Error(`404: ${data.error || 'Not found'}`);
                }
                
                // For login errors, throw the specific error message
                if (endpoint === 'login') {
                    throw new Error(data.error || 'Login failed');
                }
                
                // For password change errors, throw the specific error message
                if (endpoint === 'account/password') {
                    throw new Error(data.error || 'Password change failed');
                }
                
                // For authentication errors
                if (response.status === 401 || response.status === 403) {
                    window.router.navigate('/login');
                    throw new Error('Authentication required. Please log in again.');
                }

                // For other errors
                throw new Error(data.error || `API Error: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    async get(endpoint) {
        return this.fetchAPI(endpoint);
    },

    async post(endpoint, data) {
        return this.fetchAPI(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, data) {
        return this.fetchAPI(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint) {
        return this.fetchAPI(endpoint, {
            method: 'DELETE'
        });
    },

    async restartWebsite(siteName) {
        return this.post(`websites/${siteName}/restart`);
    },

    async stopWebsite(siteName) {
        return this.post(`websites/${siteName}/stop`);
    },

    async startWebsite(siteName) {
        return this.post(`websites/${siteName}/start`);
    },

    async enableWebsite(siteName) {
        return this.post(`websites/${siteName}/enable`);
    },

    async disableWebsite(siteName) {
        return this.post(`websites/${siteName}/disable`);
    },

    async startBackup(siteName) {
        return this.post(`websites/${siteName}/backup`);
    },

    async restoreBackup(siteName, backupDate) {
        return this.post(`websites/${siteName}/restore`, { backupDate });
    },

    async getBackupSize(siteName, backupDate) {
        return this.get(`websites/${siteName}/backups/size?backupDate=${backupDate}`);
    },

    async deleteWebsite(siteName) {
        return this.delete(`websites/${siteName}`);
    },

    async deployWebsite(domain, siteName, type) {
        return this.post('websites/deploy', { domain, siteName, type });
    }
}; 