import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy, 
    limit, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export class ActivityLogger {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
    }

    async logActivity(actionType, description) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                console.warn('No user logged in, waiting for auth...');
                // Wait for a short time to see if auth completes
                await new Promise(resolve => setTimeout(resolve, 1000));
                const retryUser = this.auth.currentUser;
                if (!retryUser) {
                    throw new Error('User not authenticated');
                }
            }

            const activityData = {
                timestamp: serverTimestamp(),
                userId: user.uid,
                userEmail: user.email,
                userName: user.email, // Add this line to ensure userName is set
                actionType: actionType,
                details: description  // Keep the description exactly as passed
            };

            await addDoc(collection(this.db, 'activityLogs'), activityData);
            console.log('Activity logged successfully:', activityData);
        } catch (error) {
            console.error('Error logging activity:', error);
            throw error; // Propagate error for handling
        }
    }
}

// Create and export singleton instance
export const activityLogger = new ActivityLogger();

// Export the logActivity function
export const logActivity = (actionType, description) => {
    return activityLogger.logActivity(actionType, description);
};

// Add default export
export default ActivityLogger;
