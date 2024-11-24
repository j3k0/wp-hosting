const readline = require('readline');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const net = require('net');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Function to check if a port is available
async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
    });
}

// Function to find first available port in range
async function findAvailablePort(startPort = 10000, endPort = 10999) {
    for (let port = startPort; port <= endPort; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error('No available ports found in range');
}

async function setup() {
    console.log('\n=== Fovea Hosting Dashboard Setup ===\n');

    try {
        // Create config directory if it doesn't exist
        await fs.mkdir(path.join(__dirname, 'config'), { recursive: true });

        // Get binding address
        const bindAddress = await question('Enter binding address (default: 0.0.0.0): ') || '0.0.0.0';
        
        // Validate IP address format
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(bindAddress)) {
            throw new Error('Invalid IP address format');
        }

        // Find available port and ask for confirmation
        const suggestedPort = await findAvailablePort();
        const port = await question(`Enter listening port (suggested: ${suggestedPort}): `) || suggestedPort;

        if (!(await isPortAvailable(port))) {
            throw new Error(`Port ${port} is not available`);
        }

        // Generate JWT secret
        const jwtSecret = crypto.randomBytes(64).toString('hex');
        const envContent = `JWT_SECRET=${jwtSecret}\nPORT=${port}\nBIND_ADDRESS=${bindAddress}\n`;
        await fs.writeFile(path.join(__dirname, '.env'), envContent);
        console.log('✓ Generated JWT secret');
        console.log(`✓ Configured to listen on ${bindAddress}:${port}`);

        // Get admin credentials
        const username = await question('Enter admin username (default: admin): ') || 'admin';
        const password = await question('Enter admin password: ');

        if (!password) {
            throw new Error('Password cannot be empty');
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash(password, 10);
        const users = {
            [username]: {
                password: hashedPassword,
                is_admin: true,
                client_id: null
            }
        };

        await fs.writeFile(
            path.join(__dirname, 'config/users.json'),
            JSON.stringify(users, null, 2)
        );
        console.log('✓ Created admin user');

        // SSL certificate check
        console.log('\nSSL Certificate setup:');
        console.log('1. Use existing certificates');
        console.log('2. Generate self-signed certificates (for development)');
        const sslChoice = await question('\nChoose an option (1-2): ');

        if (sslChoice === '2') {
            // Generate self-signed certificates
            const certDir = path.join(__dirname, 'config/ssl');
            await fs.mkdir(certDir, { recursive: true });

            console.log('\nGenerating self-signed certificates...');
            const { execSync } = require('child_process');
            execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${certDir}/key.pem -out ${certDir}/cert.pem -days 365 -nodes -subj "/CN=localhost"`);
            console.log('✓ Generated self-signed certificates');

            // Update server.js SSL paths
            let serverContent = await fs.readFile(path.join(__dirname, 'src/server.js'), 'utf8');
            serverContent = serverContent.replace(
                /key: fs\.readFileSync\('.*?'\)/,
                `key: fs.readFileSync('config/ssl/key.pem')`
            );
            serverContent = serverContent.replace(
                /cert: fs\.readFileSync\('.*?'\)/,
                `cert: fs.readFileSync('config/ssl/cert.pem')`
            );
            await fs.writeFile(path.join(__dirname, 'src/server.js'), serverContent);
        } else {
            console.log('\nPlease ensure your SSL certificates are properly configured in src/server.js');
        }

        console.log('\n✓ Setup completed successfully!');
        console.log('\nYou can now:');
        console.log('1. Run "npm install" to install dependencies');
        console.log('2. Start the server with "npm start"');
        console.log(`3. Access the dashboard at https://${bindAddress === '0.0.0.0' ? 'localhost' : bindAddress}:${port}\n`);

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
    } finally {
        rl.close();
    }
}

setup(); 