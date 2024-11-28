import { API } from './modules/api.js';
import { Handlers } from './modules/router.js';
import { Layout } from './components/layout.js';
import './modules/handlebars-helpers.js';  // Just import to register helpers

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
    // Only proceed if we have rendered content
    if (!app.firstChild) return;

    const header = document.getElementById('header');
    // If header is not found, it means the layout hasn't been rendered yet
    if (!header) return;

    const adminElements = document.querySelectorAll('.admin-only');
    const clientElements = document.querySelectorAll('.client-only');
    
    if (window.userData && window.location.pathname !== '/login') {
        // Show header
        header.classList.remove('d-none');
        
        // Show/hide admin elements
        adminElements.forEach(el => {
            el.classList.toggle('d-none', !window.userData.isAdmin);
        });
        
        // Show/hide client elements
        clientElements.forEach(el => {
            el.classList.toggle('d-none', window.userData.isAdmin);
        });

        // Debug log with all permissions
        console.log('Header visibility updated:', {
            isAdmin: window.userData.isAdmin,
            isTeamAdmin: window.userData.isTeamAdmin,
            canManageUsers: window.userData.isAdmin || window.userData.isTeamAdmin,
            adminElements: adminElements.length,
            clientElements: clientElements.length
        });
    } else {
        header.classList.add('d-none');
    }
}

// Render helper
export function render(template, data = {}) {
    const userData = window.userData || {};
    const templateData = {
        ...data,
        canManageUsers: userData.isAdmin || userData.isTeamAdmin,
        userData  // Pass the full userData to templates
    };
    
    // First render the page content with the template
    const content = template(templateData);
    
    // Then render the layout with the content
    const layoutData = {
        content,
        canManageUsers: templateData.canManageUsers,
        userData: templateData.userData  // Make sure we pass userData to layout
    };
    app.innerHTML = Layout.template(layoutData);
    
    updateHeaderVisibility();
    window.router.updatePageLinks();
}

// Setup routes
window.router
    .on('/', () => {
        // If not logged in, go to login page
        if (!window.userData) {
            window.router.navigate('/login');
            return;
        }
        
        // If logged in, redirect based on role
        if (window.userData.isAdmin) {
            window.router.navigate('/customers');
        } else {
            window.router.navigate(`/websites/${window.userData.clientId}`);
        }
    })
    .on('/login', Handlers.login)
    .on('/customers', Handlers.customers)
    .on('/websites/:customerId', Handlers.websites)
    .on('/websites/:customerId/info/:siteName', Handlers.websiteInfo)
    .on('/users', Handlers.users)
    .on('/websites/:customerId/logs/:siteName', Handlers.websiteLogs)
    .on('/account', Handlers.account)
    .notFound(() => {
        // For 404s, use same logic as root
        if (!window.userData) {
            window.router.navigate('/login');
        } else if (window.userData.isAdmin) {
            window.router.navigate('/customers');
        } else {
            window.router.navigate(`/websites/${window.userData.clientId}`);
        }
    });

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
  