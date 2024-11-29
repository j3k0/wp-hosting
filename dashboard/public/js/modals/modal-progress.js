export const ProgressModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur" id="progressModal" tabindex="-1" role="dialog" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="ti ti-{{icon}} me-2"></i>
                            {{title}}
                        </h5>
                    </div>
                    <div class="modal-body">
                        <div class="progress mb-3">
                            <div class="progress-bar progress-bar-indeterminate bg-{{color}}"></div>
                        </div>
                        <p class="text-muted mb-0">{{message}}</p>
                    </div>
                </div>
            </div>
        </div>
    `),

    show(options = {}) {
        const existingModal = document.getElementById('progressModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = this.template({
            title: options.title || 'Processing...',
            message: options.message || 'Please wait while we process your request.',
            icon: options.icon || 'loader',
            color: options.color || 'primary'
        });

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById('progressModal');
        return new bootstrap.Modal(modalElement);
    }
}; 