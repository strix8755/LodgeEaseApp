import { auth } from '../firebase.js';

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

// Export the checkAuth function
export { checkAuth }; 