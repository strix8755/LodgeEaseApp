import { auth, db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Check if user is authenticated
const checkAuth = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Unsubscribe immediately after first check
            if (!user) {
                // If not on login page, redirect to login
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        if (user) {
            // Log page navigation is now handled internally
            const pageName = document.title || window.location.pathname;
            try {
                const navigationRef = collection(db, 'pageNavigations');
                await addDoc(navigationRef, {
                    userId: user.uid,
                    pageName: pageName,
                    timestamp: serverTimestamp()
                });
            } catch (error) {
                console.error('Error logging navigation:', error);
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '../Login/index.html';
    }
});

export { checkAuth };