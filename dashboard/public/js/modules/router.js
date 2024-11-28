import { LoginPage } from '../pages/page-login.js';
import { CustomersPage } from '../pages/page-customers.js';
import { WebsitesPage } from '../pages/page-websites.js';
import { WebsiteInfoPage } from '../pages/page-website-info.js';
import { UsersPage } from '../pages/page-users.js';
import { WebsiteLogsPage } from '../pages/page-website-logs.js';
import { AccountPage } from '../pages/page-account.js';

export const Handlers = {
    login: LoginPage.handler,
    customers: CustomersPage.handler,
    websites: WebsitesPage.handler,
    websiteInfo: WebsiteInfoPage.handler,
    users: UsersPage.handler,
    websiteLogs: WebsiteLogsPage.handler,
    account: AccountPage.handler
}; 