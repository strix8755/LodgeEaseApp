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

// Replace loadActivityLogs function with real-time listener
function setupActivityLogListener() {
    console.log('Setting up real-time activity log listener...');
    
    const logsContainer = document.getElementById('activityLogTable');
    const loadingState = document.getElementById('loadingState');
    if (!logsContainer || !loadingState) {
        console.error('Required DOM elements not found');
        return;
    }

    try {
        // Show loading state
        loadingState.classList.remove('hidden');
        logsContainer.innerHTML = '';

        const logsRef = collection(db, 'activityLogs');
        let logsQuery = query(logsRef, orderBy('timestamp', 'desc'));

        // Set up real-time listener with error boundary
        return onSnapshot(logsQuery, (snapshot) => {
            try {
                // Hide loading state
                loadingState.classList.add('hidden');

                if (snapshot.empty) {
                    logsContainer.innerHTML = `
                        <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No activity logs found</td></tr>
                    `;
                    return;
                }

                const logsHtml = [];
                let filteredCount = 0;

                snapshot.forEach(doc => {
                    try {
                        const log = doc.data();
                        const timestamp = log.timestamp?.toDate() || new Date();
                        
                        // Improved filter handling
                        const userFilter = document.getElementById('userFilter')?.value;
                        const actionFilter = document.getElementById('actionFilter')?.value;
                        const dateFilter = document.getElementById('dateFilter')?.value;

                        // Debug logging
                        console.debug('Filtering log:', {
                            userFilter,
                            actionFilter,
                            dateFilter,
                            logUserId: log.userId,
                            logUserName: log.userName,
                            logActionType: log.actionType,
                            logTimestamp: timestamp
                        });

                        // Apply filters with null checks
                        if (userFilter && (log.userId !== userFilter && log.userName !== userFilter)) return;
                        if (actionFilter && log.actionType?.toLowerCase() !== actionFilter.toLowerCase()) return;
                        if (dateFilter) {
                            const logDate = timestamp.toISOString().split('T')[0];
                            if (logDate !== dateFilter) return;
                        }

                        filteredCount++;
                        logsHtml.push(`
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${timestamp.toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.userName || 'Unknown User'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.actionType)}">
                                        ${log.actionType?.toUpperCase() || 'UNKNOWN'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-500">${log.details || 'No details'}</td>
                            </tr>
                        `);
                    } catch (err) {
                        console.error('Error processing log entry:', err);
                    }
                });

                if (filteredCount === 0) {
                    logsContainer.innerHTML = `
                        <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No matching logs found</td></tr>
                    `;
                } else {
                    logsContainer.innerHTML = logsHtml.join('');
                }

                console.log(`Displayed ${filteredCount} logs after filtering`);

            } catch (err) {
                console.error('Error in snapshot handler:', err);
                handleError(err, logsContainer, loadingState);
            }
        }, (error) => {
            console.error('Snapshot listener error:', error);
            handleError(error, logsContainer, loadingState);
        });
    } catch (error) {
        console.error('Setup error:', error);
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
