export const Notifications = {
    show(message, type = 'success') {
        const icons = {
            success: 'ti ti-check',
            error: 'ti ti-x',
            warning: 'ti ti-alert-triangle',
            info: 'ti ti-info-circle'
        };

        // Different positions for different types
        const positions = {
            error: 'top-0 start-50 translate-middle-x mt-3',  // Top center for errors
            default: 'bottom-0 end-0 p-3'                     // Bottom right for others
        };

        const toast = document.createElement('div');
        
        // Special styling for errors
        if (type === 'danger') {
            toast.className = 'toast align-items-center text-white bg-danger border-0 show';
        } else {
            toast.className = `toast align-items-center border-0 border-${type} show`;
        }
        
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="${icons[type]} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close ${type === 'danger' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        // Get or create container based on type
        const containerId = type === 'danger' ? 'error-toast-container' : 'toast-container';
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = `toast-container position-fixed ${positions[type === 'danger' ? 'error' : 'default']}`;
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Initialize Bootstrap toast with longer duration for errors
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: type === 'danger' ? 6000 : 3000  // Errors show for 6 seconds
        });

        bsToast.show();

        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
            // Remove container if empty
            if (!container.hasChildNodes()) {
                container.remove();
            }
        });
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'danger');
    },

    warning(message) {
        this.show(message, 'warning');
    },

    info(message) {
        this.show(message, 'info');
    }
};

export const showConfirmation = (options) => {
    return new Promise((resolve) => {
        const existingModal = document.getElementById('confirmModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = Templates.confirmModal({
            type: options.type || 'danger',
            icon: options.icon || 'alert-triangle',
            title: options.title || 'Are you sure?',
            message: options.message || 'This action cannot be undone.',
            confirmText: options.confirmText || 'Confirm'
        });

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById('confirmModal');
        const modal = new bootstrap.Modal(modalElement);
        
        const confirmBtn = document.getElementById('confirmModalAction');
        confirmBtn.addEventListener('click', () => {
            modal.hide();
            resolve(true);
        });

        modalElement.addEventListener('hidden.bs.modal', () => {
            resolve(false);
            modalElement.remove();
        });

        modal.show();
    });
}; 