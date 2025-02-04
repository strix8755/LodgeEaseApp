import { 
    auth,
    db,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp
} from '../firebase.js';

class ActivityLogger {
    constructor() {
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            this.logsRef = collection(db, 'activityLogs');
            this.initialized = true;
            await this.loadLogs();
        } catch (error) {
            console.error('Error initializing ActivityLogger:', error);
            document.getElementById('errorMessage').textContent = 'Error loading activity logs: ' + error.message;
            document.getElementById('errorState').classList.remove('hidden');
        }
    }

    async loadLogs() {
        if (!this.initialized) return;
        
        try {
            document.getElementById('loadingState').classList.remove('hidden');
            
            const q = query(
                this.logsRef,
                orderBy('timestamp', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate()
            }));
            
            this.updateTable(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
            document.getElementById('errorMessage').textContent = 'Error loading logs: ' + error.message;
            document.getElementById('errorState').classList.remove('hidden');
        } finally {
            document.getElementById('loadingState').classList.add('hidden');
        }
    }

    updateTable(logs) {
        const table = document.getElementById('activityLogTable');
        if (!table) return;

        table.innerHTML = logs.map(log => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${log.userName || 'Unknown User'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${log.actionType || 'Unknown Action'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${log.details || 'No details provided'}
                </td>
            </tr>
        `).join('');
    }
}

// Initialize the activity logger
const activityLogger = new ActivityLogger();
export default activityLogger;
