export const ServiceStatusCard = {
    template: Handlebars.compile(`
        <div class="col-sm-6 col-lg">
            <div class="card card-sm">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <span class="status-indicator status-{{statusColor}} {{#if isAnimated}}status-indicator-animated{{/if}}">
                                <span class="status-indicator-circle"></span>
                                <span class="status-indicator-circle"></span>
                                <span class="status-indicator-circle"></span>
                            </span>
                        </div>
                        <div class="col">
                            <div class="font-weight-medium">
                                {{name}}
                                {{#unless isUp}}
                                    <div class="text-muted small">
                                        ({{status}})
                                    </div>
                                {{/unless}}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `),
    
    getStatusData: (service, status) => ({
        name: service,
        status: status,
        isUp: status === 'Up',
        isDisabled: status === 'Disabled',
        statusColor: status === 'Up' ? 'green' : 
                    status === 'Disabled' ? 'dark' : 'red',
        isAnimated: status !== 'Disabled'
    }),

    init: () => {
        // Register the partial
        Handlebars.registerPartial('serviceStatusCard', ServiceStatusCard.template);

        // Register service-related helpers
        Handlebars.registerHelper('serviceStatus', function(service, status) {
            return ServiceStatusCard.getStatusData(service, status);
        });

        Handlebars.registerHelper('allServicesDisabled', function(services) {
            return Object.values(services).every(status => status === 'Disabled');
        });

        Handlebars.registerHelper('allServicesUp', function(services) {
            return Object.values(services).every(status => status === 'Up');
        });

        Handlebars.registerHelper('allServicesDown', function(services) {
            return Object.values(services).every(status => status === 'Down' || status === 'Disabled');
        });
    }
};

ServiceStatusCard.init(); 