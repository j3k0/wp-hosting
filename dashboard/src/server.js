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

// Request logging middleware
const logRequest = (req, res, next) => {
    // Log request
    const requestLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        ip: req.ip
    };
    console.log('Request:', JSON.stringify(requestLog, null, 2));

    // Capture and log response
    const originalSend = res.send;
    res.send = function(body) {
        const responseLog = {
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            headers: res.getHeaders(),
            body: body
        };
        console.log('Response:', JSON.stringify(responseLog, null, 2));
        
        return originalSend.call(this, body);
    };

    next();
};

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.use(logRequest);  // Add logging middleware

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
app.post('/api/users', auth.authenticateTeamAdmin, asyncHandler(auth.createUser));

// Website routes
app.get('/api/websites', auth.authenticate, websites.listWebsites);
app.get('/api/customers', auth.authenticateAdmin, websites.listCustomers);
app.get('/api/websites/:customerId', auth.authenticate, websites.listWebsites);
app.get('/api/user', auth.authenticate, (req, res) => {
    res.json({
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        isTeamAdmin: req.user.isTeamAdmin,
        clientId: req.user.clientId,
        groupId: req.user.groupId
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
app.get('/api/websites/:siteName/backups', auth.authenticate, websites.listBackups);
app.post('/api/websites/:siteName/restore', auth.authenticate, websites.restoreBackup);
app.get('/api/websites/:siteName/backups/size', auth.authenticate, websites.getBackupSize);

// User routes
app.get('/api/users', auth.authenticateTeamAdmin, auth.listUsers);
app.post('/api/users/:username/reset-password', auth.authenticateAdmin, auth.resetPassword);
app.delete('/api/users/:username', auth.authenticateAdmin, auth.deleteUser);
app.put('/api/users/:username/role', auth.authenticateAdmin, asyncHandler(auth.updateUserRole));
app.put('/api/users/:username/group', auth.authenticateTeamAdmin, asyncHandler(auth.updateUserGroup));

// Group routes
app.post('/api/groups', auth.authenticateTeamAdmin, asyncHandler(auth.createGroup));
app.get('/api/groups', auth.authenticate, asyncHandler(auth.listGroups));
app.put('/api/groups/:groupId', auth.authenticateTeamAdmin, asyncHandler(auth.updateGroup));
app.delete('/api/groups/:groupId', auth.authenticateTeamAdmin, asyncHandler(auth.deleteGroup));

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