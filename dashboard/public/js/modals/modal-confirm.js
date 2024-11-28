export const ConfirmModal = {
    template: Handlebars.compile(`
        <div class="modal modal-blur fade" id="confirmModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-status bg-{{type}}"></div>
                    <div class="modal-body text-center py-4">
                        <i class="ti ti-{{icon}} mb-2 text-{{type}}" style="font-size: 3rem;"></i>
                        <h3>{{title}}</h3>
                        <div class="text-muted">{{{message}}}</div>
                    </div>
                    <div class="modal-footer">
                        <div class="w-100">
                            <div class="row">
                                <div class="col">
                                    <button type="button" class="btn w-100" data-bs-dismiss="modal">
                                        Cancel
                                    </button>
                                </div>
                                <div class="col">
                                    <button type="button" class="btn btn-{{type}} w-100" id="confirmModalAction">
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