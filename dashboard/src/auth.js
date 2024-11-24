const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET.slice(0, 64) : null;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

const USERS_FILE = path.join(__dirname, '../config/users.json');

async function getUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
}

async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

const auth = {
    async login(req, res) {
        const { username, password } = req.body;
        
        try {
            const users = await getUsers();
            
            if (!users[username]) {
                console.log('User not found:', username);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, users[username].password);
            console.log('Password validation result:', validPassword);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            console.log('JWT_SECRET type:', typeof JWT_SECRET);
            console.log('JWT_SECRET length:', JWT_SECRET.length);

            const token = jwt.sign(
                { 
                    username,
                    isAdmin: users[username].is_admin,
                    clientId: users[username].client_id
                },
                JWT_SECRET,
                {
                    expiresIn: '24h',
                    algorithm: 'HS256'
                }
            );

            res.cookie('token', token, { httpOnly: true, secure: true });
            res.json({ 
                username,
                isAdmin: users[username].is_admin,
                clientId: users[username].client_id
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error during login' });
        }
    },

    async createUser(req, res) {
        const { username, password, isAdmin, clientId } = req.body;
        const users = await getUsers();

        if (users[username]) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = {
            password: hashedPassword,
            is_admin: isAdmin || false,
            client_id: clientId
        };

        await saveUsers(users);
        res.json({ message: 'User created successfully' });
    },

    authenticate(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    authenticateAdmin(req, res, next) {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (!decoded.isAdmin) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    logout(req, res) {
        res.clearCookie('token');
        res.json({ message: 'Logged out successfully' });
    },

    async listUsers(req, res) {
        try {
            const users = await getUsers();
            const safeUsers = Object.entries(users).map(([username, data]) => ({
                username,
                isAdmin: data.is_admin,
                clientId: data.client_id
            }));
            res.json(safeUsers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to list users' });
        }
    },

    async resetPassword(req, res) {
        try {
            const { username } = req.params;
            const { password } = req.body;
            
            const users = await getUsers();
            if (!users[username]) {
                return res.status(404).json({ error: 'User not found' });
            }

            users[username].password = await bcrypt.hash(password, 10);
            await saveUsers(users);
            
            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }
};

module.exports = auth; 