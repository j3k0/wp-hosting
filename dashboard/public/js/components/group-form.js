import { API } from '../modules/api.js';

export const GroupForm = {
    template: Handlebars.compile(`
        <form id="{{formId}}">
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">Group Name</label>
                    <input type="text" class="form-control" name="name" value="{{group.name}}" required>
                </div>
                {{#if userData.isAdmin}}
                <div class="mb-3">
                    <label class="form-label">Client ID</label>
                    <input type="text" class="form-control" name="clientId" value="{{group.client_id}}" required {{#if group}}disabled{{/if}}>
                    <small class="form-hint">The client this group belongs to</small>
                </div>
                {{/if}}
                <div class="mb-3">
                    <label class="form-label">Allowed Sites</label>
                    <select class="form-select" name="allowedSites" multiple size="8">
                        {{#each websites}}
                            <option value="{{this}}" {{#if (includes ../group.allowed_sites this)}}selected{{/if}}>{{this}}</option>
                        {{/each}}
                    </select>
                    <small class="form-hint">Hold Ctrl/Cmd to select multiple sites. Leave empty for no access.</small>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-link link-secondary" data-bs-dismiss="modal">
                    Cancel
                </button>
                <button type="submit" class="btn btn-primary ms-auto">
                    <i class="ti ti-{{submitIcon}}"></i>
                    {{submitText}}
                </button>
            </div>
        </form>
    `),

    async loadWebsites(clientId) {
        const response = await API.get(`websites/${clientId}`);
        return response.sites.map(site => site.name);
    },

    async setupClientIdHandler(form, userData) {
        if (!userData.isAdmin) return;

        const clientIdInput = form.querySelector('input[name="clientId"]');
        const sitesSelect = form.querySelector('select[name="allowedSites"]');
        
        clientIdInput.addEventListener('change', async () => {
            const clientId = clientIdInput.value.trim();
            if (clientId) {
                sitesSelect.disabled = true;
                sitesSelect.innerHTML = '<option>Loading...</option>';
                
                try {
                    const websites = await this.loadWebsites(clientId);
                    console.log('Loaded websites for client:', websites);
                    
                    sitesSelect.innerHTML = websites
                        .map(site => `<option value="${site}">${site}</option>`)
                        .join('');
                } catch (error) {
                    console.error('Failed to load websites:', error);
                    sitesSelect.innerHTML = '';
                } finally {
                    sitesSelect.disabled = false;
                }
            }
        });
    },

    getFormData(form) {
        const formData = new FormData(form);
        return {
            name: formData.get('name'),
            clientId: formData.get('clientId'),
            allowedSites: Array.from(
                form.querySelector('select[name="allowedSites"]').selectedOptions
            ).map(option => option.value)
        };
    }
};

// Register the includes helper for Handlebars if not already registered
if (!Handlebars.helpers.includes) {
    Handlebars.registerHelper('includes', function(array, value) {
        return Array.isArray(array) && array.includes(value);
    });
} 