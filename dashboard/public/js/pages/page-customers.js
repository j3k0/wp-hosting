import { API } from '../modules/api.js';
import { render } from '../main.js';
import { handleAPIRequest } from '../modules/utils.js';

const template = Handlebars.compile(`
    <div class="page-header d-print-none">
        <div class="container-xl">
            <div class="row g-2 align-items-center">
                <div class="col">
                    <h2 class="page-title">
                        <i class="ti ti-users me-2"></i>
                        Customers
                    </h2>
                </div>
                <div class="col-auto">
                    <a href="/users" data-navigo class="btn btn-primary">
                        <i class="ti ti-settings me-2"></i>
                        Manage Users
                    </a>
                </div>
            </div>
        </div>
    </div>
    <div class="page-body">
        <div class="container-xl">
            <div class="row row-cards">
                {{#each customers}}
                <div class="col-md-6 col-lg-4">
                    <a href="/websites/{{this}}" data-navigo class="card card-link">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="font-weight-medium">
                                        <i class="ti ti-building me-2"></i>
                                        {{this}}
                                    </div>
                                    <div class="text-muted mt-1">
                                        Click to view websites
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="ti ti-chevron-right text-muted"></i>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
                {{/each}}
            </div>
        </div>
    </div>
`);

const handler = async () => {
    const { customers } = await handleAPIRequest(
        () => API.get('customers'),
        'Failed to load customers'
    );
    render(template, { customers });
};

export const CustomersPage = {
    template,
    handler
}; 