import { auth, checkAdminAuth } from '../firebase.js';

// Check if user is authenticated
const checkAuth = () => {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            if (!user) {
                if (!window.location.href.includes('Login/index.html')) {
                    window.location.href = '../Login/index.html';
                }
                resolve(false);
            } else {
                resolve(user);
            }
        });
    });
};

async function checkAuthentication() {
    try {
        const user = await checkAdminAuth();
        if (!user) {
            window.location.href = '../Login/index.html';
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '../Login/index.html';
    }
}

// Run authentication check
checkAuthentication();

// Initialize auth check when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        if (!user) {
            window.location.href = '../Login/index.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '../Login/index.html';
    }
});

// Export for use in other modules
export { checkAuthentication, checkAuth };
