# WordPress Hosting Dashboard

A secure web dashboard for WordPress hosting customers to manage their websites.

## Features

- Secure HTTPS access
- User authentication with JWT
- Admin interface for user management
- Client-specific website listing
- Integration with existing WordPress hosting tools

## Prerequisites

- Node.js 14+ and npm
- OpenSSL for certificate generation (if using self-signed certificates)
- Access to WordPress hosting scripts

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
   - Generate a secure JWT secret
   - Create the admin user
   - Set up SSL certificates
   - Configure the application

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Access the dashboard at `https://localhost:3000`

## User Management

### Admin Users
- Can create new user accounts
- Have access to all websites
- Can manage user permissions

### Client Users
- Can only see their associated websites
- Website access is determined by client ID
- Client ID matches the prefix in website names (e.g., 'goliath' for wp.goliath.*)

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/users` - Create new user (admin only)

### Websites
- `GET /api/websites` - List websites (filtered by client ID for non-admin users)

## Development

Start the server with auto-reload:
```bash
npm run dev
```

## Security


- All communication is encrypted via HTTPS
- Passwords are hashed using bcrypt
- JWT tokens are used for session management
- Cookies are secure and HTTP-only
- Client-specific data isolation

## Directory Structure

dashboard/
├── config/ # Configuration files
│ ├── users.json # User database
│ └── ssl/ # SSL certificates
├── public/ # Static files
│ ├── index.html
│ ├── css/
│ └── js/
├── src/ # Server-side code
│ ├── server.js # Express server
│ ├── auth.js # Authentication logic
│ └── websites.js # Website management
├── setup.js # Setup script
└── package.json

## Environment Variables

The following environment variables can be configured in `.env`:

- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret for JWT tokens (generated during setup)

## Integration with Hosting Tools

The dashboard integrates with existing WordPress hosting scripts:

- Uses `ls.sh` to list available websites
- Filters websites based on client ID
- Supports both enabled and disabled website states

## Troubleshooting

1. SSL Certificate Issues
   - For development: Use the self-signed certificate option in setup
   - For production: Use proper SSL certificates and update paths in `src/server.js`

2. Permission Issues
   - Ensure the Node.js process has access to the WordPress hosting scripts
   - Check file permissions on config directory

3. Website Listing Issues
   - Verify `ls.sh` is accessible and executable
   - Check client ID configuration in user account

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.