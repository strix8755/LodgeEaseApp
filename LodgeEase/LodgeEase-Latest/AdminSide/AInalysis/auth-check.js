import { auth, logPageNavigation } from '../firebase.js';

// Check if user is authenticated
const checkAuth = () => {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(user => {
            if (!user) {
                // If not on login page, redirect to login
                if (!window.location.href.includes('Login/index.html')) {
                    window.location.href = '../Login/index.html';
                }
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        if (user) {
            // Log page navigation
            const pageName = document.title || window.location.pathname;
            await logPageNavigation(user.uid, pageName);
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '../Login/index.html';
    }
});

// Export the checkAuth function
export { checkAuth };