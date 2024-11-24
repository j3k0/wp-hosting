# Fovea.Hosting Dashboard

A secure web dashboard for Fovea hosting customers to manage their WordPress websites.

## Features

- Secure HTTPS access with SSL/TLS encryption
- User authentication with JWT and secure cookie storage
- Role-based access control (Admin/Client)
- Client-specific website listing and management
- Integration with existing Fovea hosting scripts
- Real-time disk usage monitoring
- Website information viewer (URLs, phpMyAdmin, SFTP, DNS)
- Mobile-responsive interface using Tabler UI

## Prerequisites

- Node.js 14+ and npm
- OpenSSL for certificate generation
- Access to Fovea hosting scripts directory
- Linux/Unix environment for hosting scripts integration

## Quick Start

1. Clone the repository and navigate to the dashboard directory:
   ```bash
   cd dashboard
   ```

2. Run the setup script:
   ```bash
   npm run setup
   ```
   This will:
   - Configure binding address and port
   - Generate a secure JWT secret
   - Create the admin user account
   - Set up SSL certificates (self-signed or existing)
   - Create necessary configuration files

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Access the dashboard at `https://localhost:3000` (or your configured address)

## User Management

### Admin Users
- Can create and manage user accounts
- Have access to all customer websites
- Can reset user passwords
- Can view all customer information

### Client Users
- Can only see their associated websites
- Website access is determined by client ID
- Client ID matches the prefix in website names (e.g., 'goliath' for wp.goliath.*)
- Have access to website-specific information:
  - Website URLs
  - phpMyAdmin credentials
  - SFTP access details
  - DNS configuration
  - Disk usage statistics

## Development

For development purposes, you can use:
```bash
npm run dev
```

This will start the server with nodemon for automatic reloading during development.

## Security Notes

- All communication is encrypted using HTTPS
- Passwords are hashed using bcrypt
- JWT tokens are stored in HTTP-only secure cookies
- Role-based access control prevents unauthorized access
- Client isolation ensures users can only access their own resources

## Directory Structure

- `/config` - Configuration files and SSL certificates
- `/public` - Static frontend assets and client-side JavaScript
- `/src` - Server-side Node.js code
- `/src/commands.js` - Integration with hosting scripts