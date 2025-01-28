import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function initializeUserDrawer(auth, db) {
    console.log('Starting user drawer initialization with auth:', !!auth, 'db:', !!db);

    if (!auth || !db) {
        console.error('Auth or Firestore not initialized');
        return;
    }

    // Get elements
    const userIconBtn = document.getElementById('userIconBtn');
    const drawer = document.getElementById('userDrawer');
    
    if (!userIconBtn || !drawer) {
        console.error('Required elements not found:', { userIconBtn: !!userIconBtn, drawer: !!drawer });
        return;
    }

    console.log('Elements found:', { userIconBtn: !!userIconBtn, drawer: !!drawer });

    // Add click handler to user icon
    userIconBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('User icon clicked');
        drawer.classList.toggle('translate-x-full');
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (!drawer.contains(e.target) && !userIconBtn.contains(e.target)) {
            drawer.classList.add('translate-x-full');
        }
    });

    // Handle authentication state changes
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        const drawerContent = drawer.querySelector('.drawer-content');
        if (!drawerContent) {
            console.error('Drawer content element not found');
            return;
        }

        try {
            if (user) {
                console.log('Fetching user data for:', user.uid);
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    console.log('No user document found');
                    drawerContent.innerHTML = generateErrorContent();
                    return;
                }

                const userData = userDoc.data();
                // Fetch recent messages
                const recentMessages = await fetchRecentMessages(db, user.uid);
                drawerContent.innerHTML = generateUserDrawerContent(userData, recentMessages);

                // Add logout functionality
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async () => {
                        try {
                            await signOut(auth);
                            window.location.href = '../Login/index.html';
                        } catch (error) {
                            console.error('Error signing out:', error);
                        }
                    });
                }

                // Add close drawer functionality
                const closeDrawerBtn = document.getElementById('closeDrawer');
                if (closeDrawerBtn) {
                    closeDrawerBtn.addEventListener('click', () => {
                        drawer.classList.add('translate-x-full');
                    });
                }

                // Add messages tab toggle functionality
                setupMessagesTabToggle();
            } else {
                drawerContent.innerHTML = generateLoginContent();
                
                // Add close drawer functionality
                const closeDrawerBtn = document.getElementById('closeDrawer');
                if (closeDrawerBtn) {
                    closeDrawerBtn.addEventListener('click', () => {
                        drawer.classList.add('translate-x-full');
                    });
                }
            }
        } catch (error) {
            console.error('Error updating drawer content:', error);
            drawerContent.innerHTML = generateErrorContent();
        }
    });
}

// Fetch recent messages for the user
async function fetchRecentMessages(db, userId) {
    try {
        // First check if we can get messages without ordering
        const messagesRef = collection(db, 'messages');
        const q = query(
            messagesRef, 
            where('recipientId', '==', userId),
            limit(5)
        );

        const querySnapshot = await getDocs(q);
        const messages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort messages client-side as a temporary workaround
        return messages.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error fetching messages:', error);
        // Return empty array but don't throw error to prevent UI disruption
        return [];
    }
}

function setupMessagesTabToggle() {
    const messagesTab = document.getElementById('messagesTab');
    const navTab = document.getElementById('navTab');
    const messagesContent = document.getElementById('messagesContent');
    const navContent = document.getElementById('navContent');

    if (messagesTab && navTab && messagesContent && navContent) {
        messagesTab.addEventListener('click', () => {
            // Switch tabs
            messagesTab.classList.add('text-blue-600', 'border-blue-600');
            navTab.classList.remove('text-blue-600', 'border-blue-600');
            
            // Switch content
            messagesContent.classList.remove('hidden');
            navContent.classList.add('hidden');
        });

        navTab.addEventListener('click', () => {
            // Switch tabs
            navTab.classList.add('text-blue-600', 'border-blue-600');
            messagesTab.classList.remove('text-blue-600', 'border-blue-600');
            
            // Switch content
            navContent.classList.remove('hidden');
            messagesContent.classList.add('hidden');
        });
    }
}

function generateUserDrawerContent(userData, messages) {
    return `
        <div class="p-6">
            <div class="flex border-b mb-6">
                <button id="navTab" class="flex-1 text-center pb-2 text-blue-600 border-b-2 border-blue-600">
                    Account
                </button>
                <button id="messagesTab" class="flex-1 text-center pb-2 text-gray-500">
                    Messages
                </button>
            </div>
            
            <div id="navContent">
                <!-- User Info -->
                <div class="flex items-center space-x-4 mb-6">
                    <div class="bg-blue-100 rounded-full p-3">
                        <i class="ri-user-line text-2xl text-blue-600"></i>
                    </div>
                    <div>
                        <h3 class="font-medium">${userData.fullname || 'Guest'}</h3>
                        <p class="text-sm text-gray-500">${userData.email}</p>
                    </div>
                </div>
                
                <!-- Navigation -->
                <nav class="space-y-2">
                    <a href="../Dashboard/dashboard.html" class="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
                        <i class="ri-dashboard-line"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="../Profile/profile.html" class="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
                        <i class="ri-user-settings-line"></i>
                        <span>Profile Settings</span>
                    </a>
                    <a href="../Bookings/bookings.html" class="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
                        <i class="ri-hotel-line"></i>
                        <span>My Bookings</span>
                    </a>
                </nav>
                
                <!-- Logout Button -->
                <button id="logoutBtn" class="w-full mt-6 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors">
                    Sign Out
                </button>
            </div>

            <div id="messagesContent" class="hidden">
                <h3 class="text-lg font-semibold mb-4">Recent Messages</h3>
                ${messages.length > 0 ? messages.map(message => `
                    <div class="bg-gray-100 p-3 rounded-lg mb-3">
                        <div class="flex justify-between">
                            <span class="font-medium">${message.senderName || 'Unknown Sender'}</span>
                            <span class="text-xs text-gray-500">${formatTimestamp(message.timestamp)}</span>
                        </div>
                        <p class="text-sm text-gray-700 mt-1">${truncateMessage(message.content)}</p>
                    </div>
                `).join('') : `
                    <p class="text-gray-500 text-center">No recent messages</p>
                `}
                <a href="../Messages/messages.html" class="block w-full text-center mt-4 text-blue-600 hover:underline">
                    View All Messages
                </a>
            </div>
        </div>
    `;
}

// Helper function to truncate long messages
function truncateMessage(message, maxLength = 50) {
    return message.length > maxLength 
        ? message.substring(0, maxLength) + '...' 
        : message;
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

function generateLoginContent() {
    return `
        <div class="p-6">
            <div class="mb-6">
                <h2 class="text-xl font-semibold">Welcome</h2>
            </div>
            <p class="text-gray-600 mb-6">Please log in to access your account.</p>
            <a href="../Login/index.html" class="block w-full bg-blue-500 text-white text-center py-2 rounded-lg hover:bg-blue-600 transition-colors">
                Log In
            </a>
        </div>
    `;
}

function generateErrorContent() {
    return `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold">Error</h2>
                <button id="closeDrawer" class="text-gray-500 hover:text-gray-700">
                    <i class="ri-close-line text-2xl"></i>
                </button>
            </div>
            <p class="text-red-500">There was an error loading your account information. Please try again later.</p>
            <button id="logoutBtn" class="w-full mt-6 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors">
                Log Out
            </button>
        </div>
    `;
}