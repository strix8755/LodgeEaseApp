import { auth } from '../firebase.js';

async function checkAuth() {
    // Check if already on login page to prevent redirect loop
    const currentPage = window.location.pathname;
    if (currentPage.includes('Login')) {
        return;
    }

    return new Promise((resolve) => {
        // Set up listener for auth state changes
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // Unsubscribe immediately after first check
            
            if (!user) {
                const proceed = confirm('Please log in to access this page. Click OK to go to login page.');
                if (proceed) {
                    window.location.href = '../Login/index.html';
                } else {
                    // If user clicks Cancel, go back to previous page
                    window.history.back();
                }
            }
            resolve(!!user);
        });
    });
}

// Wait for DOM to be fully loaded before checking auth
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Block page content until auth check is complete
document.body.style.display = 'none';
checkAuth().then(() => {
    document.body.style.display = '';
});

export { checkAuth }; 