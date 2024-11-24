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

// Auth routes
app.post('/api/login', auth.login);
app.post('/api/logout', auth.logout);
app.post('/api/users', auth.authenticateAdmin, auth.createUser);

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

// User routes
app.get('/api/users', auth.authenticateAdmin, auth.listUsers);
app.post('/api/users/:username/reset-password', auth.authenticateAdmin, auth.resetPassword);

// Serve the frontend - must be last route
app.get('*', (req, res) => {
    // Send index.html for all routes to support client-side routing
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// HTTPS configuration
const httpsOptions = {
    key: fs.readFileSync('config/ssl/key.pem'),
    cert: fs.readFileSync('config/ssl/cert.pem')
};

https.createServer(httpsOptions, app).listen(port, bindAddress, () => {
    console.log(`Server running on https://${bindAddress}:${port}`);
}); 