import { API } from './api.js';
import { Templates } from './templates.js';
import { render } from '../main.js';
import { Notifications, showConfirmation, formatBytes } from './utils.js';
import { LoginPage } from '../pages/page-login.js';
import { CustomersPage } from '../pages/page-customers.js';
import { WebsitesPage } from '../pages/page-websites.js';
import { WebsiteInfoPage } from '../pages/page-website-info.js';
import { UsersPage } from '../pages/page-users.js';
import { WebsiteLogsPage } from '../pages/page-website-logs.js';

// Add utility functions at the top
const showError = (error, context) => {
    console.error(`${context}:`, error);
    Notifications.error(`${context}: ${error.message}`);
};

const handleAPIRequest = async (apiCall, errorContext) => {
    try {
        return await apiCall();
    } catch (error) {
        showError(error, errorContext);
        throw error;
    }
};

export const Handlers = {
    login: LoginPage.handler,
    customers: CustomersPage.handler,
    websites: WebsitesPage.handler,
    websiteInfo: WebsiteInfoPage.handler,
    users: UsersPage.handler,
    websiteLogs: WebsiteLogsPage.handler
}; 