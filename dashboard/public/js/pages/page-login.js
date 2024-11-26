import { API } from '../modules/api.js';
import { render } from '../main.js';
import { showError } from '../modules/utils.js';

// Template for the login page
const template = Handlebars.compile(`
    <div class="container-tight py-4">
        <div class="card card-md">
            <div class="card-body">
                <h2 class="card-title text-center mb-4">Login to Fovea.Hosting</h2>
                <form id="login" autocomplete="off">
                    <div class="mb-3">
                        <label class="form-label">Username</label>
                        <div class="input-icon">
                            <span class="input-icon-addon">
                                <i class="ti ti-user"></i>
                            </span>
                            <input type="text" name="username" id="username" class="form-control" placeholder="Username" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Password</label>
                        <div class="input-icon">
                            <span class="input-icon-addon">
                                <i class="ti ti-lock"></i>
                            </span>
                            <input type="password" name="password" id="password" class="form-control" placeholder="Password" required>
                        </div>
                    </div>
                    <div class="form-footer">
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="ti ti-login me-2"></i>
                            Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
`);

// Handler for the login page
const handler = async () => {
    render(template);
    
    document.getElementById('login').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                throw new Error('Please enter both username and password');
            }

            const data = await API.post('login', { username, password });
            window.userData = data;
            window.router.navigate(data.isAdmin ? '/customers' : `/websites/${data.clientId}`);
        } catch (error) {
            showError(error, 'Login failed');
            // Clear password field on error
            document.getElementById('password').value = '';
        }
    });
};

export const LoginPage = {
    template,
    handler
}; 