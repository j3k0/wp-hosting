export const UserGroupSelect = {
    template: Handlebars.compile(`
        <select class="form-select" name="{{name}}" {{#if required}}required{{/if}}>
            <option value="none" {{#if isNoGroup}}selected{{/if}}>None</option>
            <option value="team-admin" {{#if isTeamAdmin}}selected{{/if}}>Team Admin</option>
            {{#each groups}}
                <option value="{{@key}}" {{#if (eq @key ../currentGroupId)}}selected{{/if}}>
                    {{#if ../userData.isAdmin}}
                        {{client_id}}:{{name}}
                    {{else}}
                        {{name}}
                    {{/if}}
                </option>
            {{/each}}
        </select>
    `),

    // Helper function to parse the selected value into group/role data
    parseSelection(value) {
        return {
            isTeamAdmin: value === 'team-admin',
            groupId: value !== 'team-admin' && value !== 'none' ? value : null
        };
    }
}; 