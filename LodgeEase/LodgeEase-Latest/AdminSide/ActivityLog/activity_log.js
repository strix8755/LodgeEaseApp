import { 
    auth, 
    db, 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy,
    Timestamp,
    onSnapshot,
    getDoc,
    doc,
    addDoc,
    signOut 
} from '../firebase.js';
import { ActivityLogger, activityLogger } from './activityLogger.js';
import { checkAuthentication } from '../js/auth-check.js';
import { PageLogger } from '../js/pageLogger.js'; // Update import to use PageLogger instead of logPageView
import { roomActivityLogger } from './roomActivityLogger.js';

// Use the existing Firebase instance
// const auth = getAuth(app); // This line is no longer needed

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

// Add createActivityLog function at the top
async function createActivityLog(actionType, details, userId = null, userName = null) {
    try {
        const user = auth.currentUser;
        const logEntry = {
            actionType,
            details,
            timestamp: Timestamp.now(),
            userId: userId || user?.uid || 'system',
            userName: userName || user?.email || 'Unknown User',
            userRole: 'admin' // Since this is admin side
        };

        await addDoc(collection(db, 'activityLogs'), logEntry);
        console.log('Activity logged:', logEntry);
    } catch (error) {
        console.error('Error logging activity:', error);
        throw error; // Propagate error for handling
    }
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
    } catch (error) {
        console.error('Error checking activity logs collection:', error);
    }
}

// Update Vue instance to use PageLogger
new Vue({
    el: '#app',
    data: {
        isAuthenticated: false,
        currentUser: null
    },
    async created() {
        // Check authentication status only
        auth.onAuthStateChanged((user) => {
            this.isAuthenticated = !!user;
            this.currentUser = user;
        });
    },
    methods: {
        async handleLogout() {
            try {
                await signOut();
                window.location.href = '../Login/index.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    }
});

// Update the auth state checking to remove duplicate navigation logging
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Activity log page loaded');
    
    let unsubscribe = null;

    auth.onAuthStateChanged(async (user) => {
        try {
            if (!user) {
                console.log('No user detected, redirecting to login...');
                if (unsubscribe) unsubscribe();
                window.location.href = '../Login/index.html';
                return;
            }

            // Remove the createActivityLog call since PageLogger will handle navigation logging

            // Verify admin status
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists() || userDoc.data().role !== 'admin') {
                console.log('User is not an admin, redirecting...');
                if (unsubscribe) unsubscribe();
                window.location.href = '../Login/index.html';
                return;
            }

            // Initialize filters
            await setupFilters();

            // Setup real-time listener
            unsubscribe = setupActivityLogListener();

            // Add filter change event listeners
            ['userFilter', 'actionFilter', 'dateFilter'].forEach(filterId => {
                document.getElementById(filterId)?.addEventListener('change', () => {
                    if (unsubscribe) unsubscribe();
                    unsubscribe = setupActivityLogListener();
                });
            });

        } catch (error) {
            console.error('Error in auth state change:', error);
        }
    });

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        if (unsubscribe) unsubscribe();
    });

    // Update the action filter options in activity_log.html
    const actionFilter = document.getElementById('actionFilter');
    if (actionFilter) {
        const roomOption = document.createElement('option');
        roomOption.value = 'room_deletion';
        roomOption.textContent = 'Room Deletions';
        actionFilter.appendChild(roomOption);
    }

    // Update the action filter options in activity_log.html
    const actionFilter = document.getElementById('actionFilter');
    if (actionFilter) {
        const roomOption = document.createElement('option');
        roomOption.value = 'room_deletion';
        roomOption.textContent = 'Room Deletions';
        actionFilter.appendChild(roomOption);
    }
});

async function setupFilters() {
    try {
        const userFilter = document.getElementById('userFilter');
        if (!userFilter) {
            console.error('User filter element not found');
            return;
        }

        userFilter.innerHTML = '<option value="">All Users</option>';
        
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const sortedUsers = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            sortedUsers.push({
                id: doc.id,
                name: userData.fullname || userData.username || 'Unknown User'
            });
        });

        // Sort users alphabetically
        sortedUsers.sort((a, b) => a.name.localeCompare(b.name));

        sortedUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            userFilter.appendChild(option);
        });

    } catch (error) {
        console.error('Error setting up filters:', error);
        // Show error in UI if needed
        const userFilter = document.getElementById('userFilter');
        if (userFilter) {
            userFilter.innerHTML = '<option value="">Error loading users</option>';
        }
    }
}

// Update the setupActivityLogListener function to include room deletions
// Update the setupActivityLogListener function to include room deletions
function setupActivityLogListener() {
    const logsContainer = document.getElementById('activityLogTable');
    const loadingState = document.getElementById('loadingState');
    
    
    if (!logsContainer || !loadingState) {
        console.error('Required DOM elements not found');
        return;
    }

    try {
        loadingState.classList.remove('hidden');
        
        
        const logsRef = collection(db, 'activityLogs');
        // Create base query
        let baseQuery = [orderBy('timestamp', 'desc')];
        // Create base query
        let baseQuery = [orderBy('timestamp', 'desc')];

        // Add filters
        const userFilter = document.getElementById('userFilter')?.value;
        const actionFilter = document.getElementById('actionFilter')?.value;
        const dateFilter = document.getElementById('dateFilter')?.value;

        if (userFilter) {
            baseQuery.push(where('userId', '==', userFilter));
        }

        if (actionFilter) {
            baseQuery.push(where('actionType', '==', actionFilter));
        }

        // Create the query with all conditions
        let logsQuery = query(logsRef, ...baseQuery);

        // Add filters
        const userFilter = document.getElementById('userFilter')?.value;
        const actionFilter = document.getElementById('actionFilter')?.value;
        const dateFilter = document.getElementById('dateFilter')?.value;

        if (userFilter) {
            baseQuery.push(where('userId', '==', userFilter));
        }

        if (actionFilter) {
            baseQuery.push(where('actionType', '==', actionFilter));
        }

        // Create the query with all conditions
        let logsQuery = query(logsRef, ...baseQuery);

        return onSnapshot(logsQuery, (snapshot) => {
            loadingState.classList.add('hidden');
            
            if (snapshot.empty) {
                logsContainer.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                            No activity logs found
                        </td>
                    </tr>
                `;
                return;
            }
            loadingState.classList.add('hidden');
            
            if (snapshot.empty) {
                logsContainer.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                            No activity logs found
                        </td>
                    </tr>
                `;
                return;
            }

            const logsHtml = [];
            const logsHtml = [];

            snapshot.forEach(doc => {
                const log = doc.data();
                const timestamp = log.timestamp?.toDate() || new Date();

                // Date filter handling
                if (dateFilter) {
                    const logDate = timestamp.toISOString().split('T')[0];
                    if (logDate !== dateFilter) return;
                }
            snapshot.forEach(doc => {
                const log = doc.data();
                const timestamp = log.timestamp?.toDate() || new Date();

                // Date filter handling
                if (dateFilter) {
                    const logDate = timestamp.toISOString().split('T')[0];
                    if (logDate !== dateFilter) return;
                }

                // Enhanced styling for room deletions
                let actionClass = getActionColor(log.actionType);
                let actionDetails = log.details || 'No details';

                // Special handling for room deletions
                if (log.actionType === 'room_deletion') {
                    actionClass = 'bg-red-100 text-red-800';
                    actionDetails = `🗑️ ${actionDetails}`; // Add deletion icon
                }

                logsHtml.push(`
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${timestamp.toLocaleString()}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${log.userName || 'Unknown User'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${actionClass}">
                                ${(log.actionType || 'UNKNOWN').toUpperCase()}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                            ${actionDetails}
                            ${log.module ? `<br><span class="text-xs text-gray-400">(${log.module})</span>` : ''}
                        </td>
                    </tr>
                `);
            });
                // Enhanced styling for room deletions
                let actionClass = getActionColor(log.actionType);
                let actionDetails = log.details || 'No details';

                // Special handling for room deletions
                if (log.actionType === 'room_deletion') {
                    actionClass = 'bg-red-100 text-red-800';
                    actionDetails = `🗑️ ${actionDetails}`; // Add deletion icon
                }

                logsHtml.push(`
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${timestamp.toLocaleString()}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${log.userName || 'Unknown User'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${actionClass}">
                                ${(log.actionType || 'UNKNOWN').toUpperCase()}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                            ${actionDetails}
                            ${log.module ? `<br><span class="text-xs text-gray-400">(${log.module})</span>` : ''}
                        </td>
                    </tr>
                `);
            });

            logsContainer.innerHTML = logsHtml.join('');
            logsContainer.innerHTML = logsHtml.join('');
        }, (error) => {
            console.error('Error in activity log listener:', error);
            console.error('Error in activity log listener:', error);
            handleError(error, logsContainer, loadingState);
        });


    } catch (error) {
        console.error('Error setting up activity log listener:', error);
        console.error('Error setting up activity log listener:', error);
        handleError(error, logsContainer, loadingState);
    }
}

// Add this helper function for error handling
function handleError(error, container, loadingState) {
    loadingState?.classList.add('hidden');
    if (container) {
        container.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                    Error: ${error.message}
                    ${error.code ? `(Code: ${error.code})` : ''} 
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

// Update the getActionColor function to include room_deletion
// Update the getActionColor function to include room_deletion
function getActionColor(actionType) {
    const colors = {
        login: 'bg-green-100 text-green-800',
        logout: 'bg-red-100 text-red-800',
        navigation: 'bg-blue-100 text-blue-800',
        booking: 'bg-purple-100 text-purple-800',
        room: 'bg-indigo-100 text-indigo-800',
        room_deletion: 'bg-red-100 text-red-800', // Add this line
        room_add: 'bg-green-100 text-green-800',
        room_update: 'bg-yellow-100 text-yellow-800',
        room_deletion: 'bg-red-100 text-red-800', // Add this line
        room_add: 'bg-green-100 text-green-800',
        room_update: 'bg-yellow-100 text-yellow-800',
        request: 'bg-yellow-100 text-yellow-800'
    };
    return colors[actionType?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

// Add the action filter dropdown
const actionFilterContainer = document.getElementById('actionFilterContainer');
if (actionFilterContainer) {
    actionFilterContainer.innerHTML = `
        <select id="actionFilter" class="w-full border rounded px-3 py-2">
            <option value="">All Activities</option>
            <option value="login">Logins</option>
            <option value="logout">Logouts</option>
            <option value="navigation">Navigation</option>
            <option value="booking">Booking</option>
            <option value="room">Room Management</option>
            <option value="room_deletion">Room Deletions</option>
            <option value="request">Requests</option>
        </select>
    `;
}

// Add to room_management.js
console.log('Activity logger initialized:', activityLogger);
console.log('Room activity logger initialized:', roomActivityLogger);

// Example of proper usage (only add this if you're testing)
// roomActivityLogger.logRoomDeletion({ 
//   propertyDetails: { 
//     roomNumber: 'Test101', 
//     roomType: 'Standard' 
//   } 
// });