// Handle all API calls
export const API = {
    async get(endpoint) {
        const response = await fetch(`/api/${endpoint}`);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('auth_required');
            }
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }
}; 