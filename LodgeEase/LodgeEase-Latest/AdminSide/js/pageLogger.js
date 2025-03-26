import { auth, db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Utility class to log page navigation activities in the admin dashboard
 */
export class PageLogger {
  /**
   * Log a page navigation event
   * @param {string} pageName - The name of the page being accessed
   */
  static async logNavigation(pageName) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'pageNavigations'), {
        userId: user.uid,
        userEmail: user.email,
        pageName: pageName,
        timestamp: serverTimestamp(),
        userRole: 'admin',
        userAgent: navigator.userAgent
      });
      
      console.log(`Logged navigation to: ${pageName}`);
    } catch (error) {
      console.error('Error logging navigation:', error);
    }
  }
  
  /**
   * Log a specific user action
   * @param {string} actionType - Type of action performed
   * @param {Object} details - Additional details about the action
   */
  static async logAction(actionType, details = {}) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await addDoc(collection(db, 'activityLogs'), {
        userId: user.uid,
        userEmail: user.email,
        actionType,
        details,
        timestamp: serverTimestamp(),
        userRole: 'admin'
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }
}

// Initialize page logging when auth state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    // Get current page name from document title or path
    const pageName = document.title || window.location.pathname;
    PageLogger.logNavigation(pageName);
  }
});
