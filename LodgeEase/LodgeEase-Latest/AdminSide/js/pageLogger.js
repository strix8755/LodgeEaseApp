import { auth, logPageNavigation } from '../firebase.js';

// Single global flag to prevent duplicate logging
let hasLoggedNavigation = false;

class PageLogger {
    static async logNavigation(pageName = null) {
        if (hasLoggedNavigation) {
            console.log('Navigation already logged, skipping...');
            return;
        }
        
        try {
            const user = auth.currentUser;
            if (!user) return;

            const pageTitle = pageName || this.getPageName();
            await logPageNavigation(user.uid, pageTitle);
            hasLoggedNavigation = true;
            console.log('Navigation logged:', pageTitle);
        } catch (error) {
            console.error('PageLogger error:', error);
        }
    }

    static getPageName() {
        return document.title || 
               document.querySelector('h1')?.textContent || 
               window.location.pathname.split('/').pop().replace('.html', '') || 
               'Unknown Page';
    }

    static resetNavigationFlag() {
        hasLoggedNavigation = false;
    }
}

// Initialize logging when auth state changes
auth.onAuthStateChanged((user) => {
    if (user && !hasLoggedNavigation) {
        PageLogger.logNavigation();
    }
});

// Reset navigation flag when page changes
window.addEventListener('beforeunload', () => {
    PageLogger.resetNavigationFlag();
});

export { PageLogger };
