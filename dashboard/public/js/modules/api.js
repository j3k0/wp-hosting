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
                // For login errors, throw the specific error message
                if (endpoint === 'login') {
                    throw new Error(data.error || 'Login failed');
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
    }
}; 