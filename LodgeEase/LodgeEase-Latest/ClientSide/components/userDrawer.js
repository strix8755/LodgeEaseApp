import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function initializeUserDrawer(auth, db) {
    if (!auth || !db) {
        console.error('Auth or Firestore not initialized');
        return;
    }

    console.log('Initializing user drawer...');
    
    // Get elements
    const userIconBtn = document.getElementById('userIconBtn');
    const drawer = document.getElementById('userDrawer');
    
    console.log('Elements found:', { userIconBtn, drawer });

    if (!userIconBtn || !drawer) {
        console.error('Required elements not found');
        return;
    }

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
        if (!drawerContent) return;

        if (user) {
            try {
                console.log('Fetching user data for:', user.uid);
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    console.log('No user document found');
                    drawerContent.innerHTML = generateLoginContent();
                    return;
                }
                
                const userData = userDoc.data();
                console.log('User data fetched:', userData);
                
                drawerContent.innerHTML = generateDrawerContent(userData);

                // Add logout functionality
                document.getElementById('logoutBtn')?.addEventListener('click', async () => {
                    try {
                        await signOut(auth);
                        window.location.href = '../Login/index.html';
                    } catch (error) {
                        console.error('Error signing out:', error);
                    }
                });

                // Add close drawer functionality
                document.getElementById('closeDrawer')?.addEventListener('click', () => {
                    drawer.classList.add('translate-x-full');
                });
            } catch (error) {
                console.error('Error fetching user data:', error);
                drawerContent.innerHTML = generateErrorContent();
            }
        } else {
            drawerContent.innerHTML = generateLoginContent();
            
            // Add close drawer functionality
            document.getElementById('closeDrawer')?.addEventListener('click', () => {
                drawer.classList.add('translate-x-full');
            });
        }
    });
}

function generateDrawerContent(userData) {
    return `
        <div class="p-6">
            <div class="mb-6">
                <h2 class="text-xl font-semibold">Account</h2>
            </div>
            
            <div class="space-y-6">
                <!-- User Info -->
                <div class="flex items-center space-x-4">
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
                <button id="logoutBtn" class="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors">
                    Sign Out
                </button>
            </div>
        </div>
    `;
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