import { auth, db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Initialize auth check when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        if (user) {
            const pageName = document.title || window.location.pathname;
            try {
                await addDoc(collection(db, 'pageNavigations'), {
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
