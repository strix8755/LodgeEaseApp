import { getAuth } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy,
    Timestamp,
    onSnapshot,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { app } from '../firebase.js';  // Import the existing Firebase instance

// Use the existing Firebase instance
const auth = getAuth(app);
const db = getFirestore(app);

// Add this helper function at the top
async function verifyAdminAuth() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Not authenticated');
    }
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        throw new Error('Not authorized as admin');
    }
    return true;
}

// Move this function to the top level for better visibility
async function checkActivityLogsCollection() {
    console.log('Checking activity logs collection...');
    try {
        // Verify admin authentication first
        await verifyAdminAuth();
        
        const logsRef = collection(db, 'activityLogs');
        const snapshot = await getDocs(logsRef);
        
        // Detailed logging
        console.log('Activity Logs Collection Check:', {
            collectionPath: logsRef.path,
            exists: !snapshot.empty,
            count: snapshot.size,
            currentUser: auth.currentUser?.uid
        });

        if (snapshot.empty) {
            console.log('No logs found in collection');
        } else {
            snapshot.forEach(doc => {
                console.log('Log entry:', {
                    id: doc.id,
                    timestamp: doc.data().timestamp?.toDate?.(),
                    actionType: doc.data().actionType,
                    userName: doc.data().userName,
                    details: doc.data().details
                });
            });
        }

        return snapshot;
    } catch (error) {
        console.error('Error checking activity logs:', error);
        throw error;
    }
}

// Add Vue instance to handle auth state
new Vue({
    el: '#app',
    data: {
        isAuthenticated: false
    },
    methods: {
        async handleLogout() {
            try {
                await auth.signOut();
                window.location.href = '../Login/index.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        },
        async checkAuthState() {
            this.isAuthenticated = !!auth.currentUser;
        }
    },
    created() {
        // Set up auth state listener
        auth.onAuthStateChanged(async (user) => {
            this.isAuthenticated = !!user;
            if (!user) {
                window.location.href = '../Login/index.html';
                return;
            }
        });
    }
});

// Update the auth state checking
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Activity log page loaded');
    
    // Set up auth state listener
    auth.onAuthStateChanged(async (user) => {
        try {
            if (!user) {
                console.log('No user detected, redirecting to login...');
                window.location.href = '../Login/index.html';
                return;
            }

            console.log('User authenticated:', user.email);
            
            // Verify admin status
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists() || userDoc.data().role !== 'admin') {
                console.log('User is not an admin, redirecting...');
                window.location.href = '../Login/index.html';
                return;
            }

            // Initialize filters
            await setupFilters();

            // Add event listeners
            document.getElementById('userFilter').addEventListener('change', loadActivityLogs);
            document.getElementById('actionFilter').addEventListener('change', loadActivityLogs);
            document.getElementById('dateFilter').addEventListener('change', loadActivityLogs);

            // Load initial data
            await loadActivityLogs();

        } catch (error) {
            console.error('Error in auth state change:', error);
            const logsContainer = document.getElementById('activityLogTable');
            if (logsContainer) {
                logsContainer.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-6 py-4 text-center text-red-500">
                            Error: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    });
});

async function setupFilters() {
    // Populate user filter
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const userFilter = document.getElementById('userFilter');

    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = userData.fullname || userData.username;
        userFilter.appendChild(option);
    });
}

async function loadActivityLogs() {
    console.log('Loading activity logs...'); // Debug log
    
    const logsContainer = document.getElementById('activityLogTable');
    if (!logsContainer) return;

    try {
        await verifyAdminAuth();

        // Show loading state
        logsContainer.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center">
                    <div class="animate-spin inline-block w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                    <span class="ml-2">Loading logs...</span>
                </td>
            </tr>
        `;

        // Check if collection exists and has documents
        const logsRef = collection(db, 'activityLogs');
        console.log('Checking activityLogs collection...'); // Debug log

        // Get all logs ordered by timestamp
        const querySnapshot = await getDocs(query(logsRef, orderBy('timestamp', 'desc')));
        
        console.log('Found logs:', querySnapshot.size); // Debug log

        if (querySnapshot.empty) {
            console.log('No logs found'); // Debug log
            logsContainer.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                        No activity logs found
                    </td>
                </tr>
            `;
            return;
        }

        // Generate table rows
        const logsHtml = [];
        querySnapshot.forEach(doc => {
            const log = doc.data();
            console.log('Processing log:', log); // Debug log
            
            const timestamp = log.timestamp?.toDate() || new Date();
            
            logsHtml.push(`
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">${timestamp.toLocaleString()}</td>
                    <td class="px-6 py-4">${log.userName || 'Unknown User'}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.actionType)}">
                            ${log.actionType?.toUpperCase() || 'UNKNOWN'}
                        </span>
                    </td>
                    <td class="px-6 py-4">${log.details || 'No details'}</td>
                </tr>
            `);
        });

        logsContainer.innerHTML = logsHtml.join('');

    } catch (error) {
        console.error('Error loading logs:', error);
        logsContainer.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                    Error: ${error.message}
                </td>
            </tr>
        `;
    }
}

function createLogRow(log) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    let timestampStr = 'Invalid Date';
    try {
        const timestamp = log.timestamp instanceof Timestamp 
            ? log.timestamp.toDate() 
            : new Date(log.timestamp);
        
        timestampStr = timestamp.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        console.error('Error formatting timestamp:', e, log.timestamp);
    }

    // Enhanced log details display
    const details = log.details || 'No details provided';
    const actionType = log.actionType || 'Unknown Action';
    const userName = log.userName || 'Unknown User';

    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">${timestampStr}</td>
        <td class="px-6 py-4 whitespace-nowrap">${userName}</td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(actionType)}">
                ${actionType.toUpperCase()}
            </span>
        </td>
        <td class="px-6 py-4">${details}</td>
    `;
    
    return row;
}

function getActionColor(actionType) {
    const colors = {
        login: 'bg-green-100 text-green-800',
        logout: 'bg-red-100 text-red-800',
        navigation: 'bg-blue-100 text-blue-800',
        booking: 'bg-purple-100 text-purple-800',
        room: 'bg-indigo-100 text-indigo-800',
        request: 'bg-yellow-100 text-yellow-800'
    };
    return colors[actionType?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
