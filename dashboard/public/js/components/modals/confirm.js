export const ConfirmModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="confirmModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
                <div class="modal-content">
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    <div class="modal-status bg-{{type}}"></div>
                    <div class="modal-body text-center py-4">
                        <i class="ti ti-{{icon}} icon mb-3 icon-lg text-{{type}}"></i>
                        <h3>{{title}}</h3>
                        <div class="text-muted">{{message}}</div>
                    </div>
                    <div class="modal-footer">
                        <div class="w-100">
                            <div class="row">
                                <div class="col">
                                    <button class="btn w-100" data-bs-dismiss="modal">
                                        Cancel
                                    </button>
                                </div>
                                <div class="col">
                                    <button class="btn btn-{{type}} w-100" id="confirmModalAction">
                                        {{confirmText}}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `)
}; 