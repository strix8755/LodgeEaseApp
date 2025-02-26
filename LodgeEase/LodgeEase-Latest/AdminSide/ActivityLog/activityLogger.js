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

    async logActivity(actionType, description, module = '') {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            const activityData = {
                timestamp: serverTimestamp(),
                userId: user.uid,
                userEmail: user.email,
                userName: user.email,
                actionType: actionType,
                details: description,
                module: module,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(this.db, 'activityLogs'), activityData);
            console.log('Activity logged successfully:', {
                docId: docRef.id,
                ...activityData
            });
            return docRef;
        } catch (error) {
            console.error('Error logging activity:', error);
            throw error;
        }
    }

    // Specific method for room deletions
    async logRoomDeletion(roomDetails, module = 'Room Management') {
        return this.logActivity('room_deletion', `Room deleted: ${roomDetails}`, module);
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
