Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
}); 