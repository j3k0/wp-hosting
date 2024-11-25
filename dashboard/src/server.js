const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const auth = require('./auth');
const websites = require('./websites');

const app = express();
const port = process.env.PORT || 3000;
const bindAddress = process.env.BIND_ADDRESS || '0.0.0.0';

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

// Add error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
};

// Add route handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Auth routes
app.post('/api/login', asyncHandler(auth.login));
app.post('/api/logout', asyncHandler(auth.logout));
app.post('/api/users', auth.authenticateAdmin, asyncHandler(auth.createUser));

// Website routes
app.get('/api/websites', auth.authenticate, websites.listWebsites);
app.get('/api/customers', auth.authenticateAdmin, websites.listCustomers);
app.get('/api/websites/:customerId', auth.authenticate, websites.listWebsites);
app.get('/api/user', auth.authenticate, (req, res) => {
    res.json({
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        clientId: req.user.clientId,
    });
});
app.get('/api/websites/:siteName/info', auth.authenticate, websites.getWebsiteInfo);
app.get('/api/websites/:siteName/logs', auth.authenticate, websites.getWebsiteLogs);
app.post('/api/websites/:siteName/restart', auth.authenticate, websites.restartWebsite);
app.post('/api/websites/:siteName/stop', auth.authenticate, websites.stopWebsite);
app.post('/api/websites/:siteName/start', auth.authenticate, websites.startWebsite);
app.post('/api/websites/:siteName/enable', auth.authenticate, websites.enableWebsite);
app.post('/api/websites/:siteName/disable', auth.authenticate, websites.disableWebsite);
app.post('/api/websites/:siteName/backup', auth.authenticate, websites.startBackup);

// User routes
app.get('/api/users', auth.authenticateAdmin, auth.listUsers);
app.post('/api/users/:username/reset-password', auth.authenticateAdmin, auth.resetPassword);
app.delete('/api/users/:username', auth.authenticateAdmin, auth.deleteUser);

// Serve the frontend - must be last route
app.get('*', (req, res) => {
    // Send index.html for all routes to support client-side routing
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Add error handler last
app.use(errorHandler);

// HTTPS configuration
const httpsOptions = {
    key: fs.readFileSync('config/ssl/key.pem'),
    cert: fs.readFileSync('config/ssl/cert.pem')
};

https.createServer(httpsOptions, app).listen(port, bindAddress, () => {
    console.log(`Server running on https://${bindAddress}:${port}`);
}); 