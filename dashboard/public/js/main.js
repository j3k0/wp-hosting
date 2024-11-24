import { API } from './modules/api.js';
import { Templates } from './modules/templates.js';
import { Handlers } from './modules/handlers.js';

// Initialize router and make it globally available
window.router = new Navigo('/', { 
    linksSelector: "a[data-navigo]",
    hash: false,           // Don't use hash
    strategy: "ALL",       // Handle all routes, even on page reload
    noMatchWarning: true   // Show warnings for unmatched routes
});
const app = document.getElementById('app');

// State management - make it globally available
window.userData = null;

// Header management
function updateHeaderVisibility() {
    const header = document.getElementById('header');
    const adminControls = document.getElementById('adminControls');
    
    if (window.userData && window.location.pathname !== '/login') {
        header.classList.remove('d-none');
        adminControls.style.display = window.userData.isAdmin ? 'block' : 'none';
    } else {
        header.classList.add('d-none');
    }
}

// Render helper
export function render(template, data = {}) {
    // Render content
    app.innerHTML = template(data);
    // Update header visibility
    updateHeaderVisibility();
    // Update Navigo's data-navigo handling after content change
    window.router.updatePageLinks();
}

// Setup routes
window.router
    .on('/', () => window.router.navigate('/login'))
    .on('/login', Handlers.login)
    .on('/customers', Handlers.customers)
    .on('/websites/:customerId', Handlers.websites)
    .on('/websites/:customerId/info/:siteName', Handlers.websiteInfo)
    .on('/users', Handlers.users)
    .notFound(() => window.router.navigate('/login'));

// Global event handlers
document.addEventListener('click', (e) => {
    // Handle logout
    if (e.target.id === 'logout' || e.target.closest('#logout')) {
        e.preventDefault();
        API.post('logout').then(() => {
            window.userData = null;
            updateHeaderVisibility();
            window.router.navigate('/login');
        });
    }

    // Handle manage users button
    if (e.target.id === 'manageUsers' || e.target.closest('#manageUsers')) {
        e.preventDefault();
        window.router.navigate('/users');
    }
});

// Authentication middleware
window.router.hooks({
    before: async (done, match) => {
        if (match.url === '/login') {
            window.userData = null;
            updateHeaderVisibility();
            return done();
        }

        try {
            if (!window.userData) {
                window.userData = await API.get('user');
                updateHeaderVisibility();
            }
            done();
        } catch (error) {
            window.userData = null;
            updateHeaderVisibility();
            window.router.navigate('/login');
        }
    },
    after: (match) => {
        // Update page links after route changes
        window.router.updatePageLinks();
    }
});

// Initial setup
async function initializeApp() {
    try {
        // Try to get user data on initial load
        window.userData = await API.get('user');
        updateHeaderVisibility();
    } catch (error) {
        window.userData = null;
        updateHeaderVisibility();
    }
    // Start router
    window.router.resolve();
}

// Handle initial page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    window.router.resolve();
}); 