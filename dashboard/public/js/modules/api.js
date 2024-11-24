// Handle all API calls
export const API = {
    // Common fetch handler to reduce duplication
    async fetchAPI(endpoint, options = {}) {
        const response = await fetch(`/api/${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('auth_required');
            }
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
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
    }
}; 