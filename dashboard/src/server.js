const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { logger, stream } = require('./utils/logger');
const auth = require('./auth');
const websites = require('./websites');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;
const bindAddress = process.env.BIND_ADDRESS || '0.0.0.0';

// Request logging middleware using Morgan with our custom stream
app.use(morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
    { stream }
));

// Request context logging middleware
const logRequest = (req, res, next) => {
    // Create request context
    const requestContext = {
        requestId: req.headers['x-request-id'] || Date.now().toString(),
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        ip: req.ip,
        userId: req.user?.username || 'anonymous'
    };

    // Add request context to res.locals for access in other middleware/routes
    res.locals.requestContext = requestContext;

    // Log request
    logger.info('Incoming request', { 
        ...requestContext,
        timestamp: new Date().toISOString()
    });

    // Capture and log response
    const originalSend = res.send;
    res.send = function(body) {
        const responseContext = {
            ...requestContext,
            statusCode: res.statusCode,
            responseHeaders: res.getHeaders(),
            responseTime: Date.now() - new Date(requestContext.timestamp),
            responseSize: Buffer.byteLength(body)
        };

        // Log response
        logger.info('Outgoing response', responseContext);
        
        return originalSend.call(this, body);
    };

    next();
};

// Error handling middleware (single declaration)
const errorHandler = (err, req, res, next) => {
    const errorContext = {
        ...res.locals.requestContext,
        error: {
            message: err.message,
            stack: err.stack,
            code: err.code,
            status: err.status || 500
        }
    };

    logger.error('API Error', errorContext);

    // Don't expose stack traces in production
    const response = process.env.NODE_ENV === 'production' 
        ? { error: err.message || 'Internal server error' }
        : { error: err.message, stack: err.stack };

    res.status(err.status || 500).json(response);
};

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.use(logRequest);  // Add logging middleware

// Add route handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Auth routes
app.post('/api/login', asyncHandler(auth.login));
app.post('/api/logout', asyncHandler(auth.logout));
app.post('/api/users', auth.authenticateTeamAdmin, asyncHandler(auth.createUser));
app.post('/api/account/password', auth.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const username = req.user.username;
        
        logger.info('Password change initiated', {
            username,
            ip: req.ip
        });

        const users = await auth.getUsers();
        const user = users[username];
        
        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            logger.warn('Password change failed - invalid current password', {
                username,
                ip: req.ip
            });
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        await auth.saveUsers(users);
        
        logger.info('Password changed successfully', {
            username,
            ip: req.ip
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        logger.error('Failed to update password', {
            error: {
                message: error.message,
                stack: error.stack
            },
            username: req.user.username,
            ip: req.ip
        });
        res.status(500).json({ error: 'Failed to update password' });
    }
});

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
app.delete('/api/websites/:siteName', auth.authenticate, websites.deleteWebsite);

// User routes
app.get('/api/users', auth.authenticateTeamAdmin, auth.listUsers);
app.post('/api/users/:username/reset-password', auth.authenticateAdmin, auth.resetPassword);
app.delete('/api/users/:username', auth.authenticateTeamAdmin, auth.deleteUser);
app.put('/api/users/:username/role', auth.authenticateTeamAdmin, asyncHandler(auth.updateUserRole));
app.put('/api/users/:username/group', auth.authenticateTeamAdmin, asyncHandler(auth.updateUserGroup));
app.put('/api/users/:username/password', auth.authenticateTeamAdmin, asyncHandler(auth.resetPassword));

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

// HTTPS configuration and server startup
const httpsOptions = {
    key: fs.readFileSync('config/ssl/key.pem'),
    cert: fs.readFileSync('config/ssl/cert.pem')
};

const server = https.createServer(httpsOptions, app);

server.listen(port, bindAddress, () => {
    logger.info(`Server started`, {
        port,
        bindAddress,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: {
            message: error.message,
            stack: error.stack,
            code: error.code
        }
    });
    // Give logger time to write before exiting
    setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
        reason,
        promise
    });
}); 