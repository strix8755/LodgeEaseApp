import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

export function initializeUserDrawer(auth, db) {
    console.log('Initializing user drawer...');
    
    // Get elements
    const userIcon = document.querySelector('.ri-user-line')?.parentElement;
    const drawer = document.getElementById('userDrawer');
    
    console.log('Elements found:', { userIcon, drawer });

    if (!userIcon || !drawer) {
        console.error('Required elements not found');
        return;
    }

    // Add click handler to user icon
    userIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('User icon clicked');
        drawer.classList.remove('translate-x-full');
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (!drawer.contains(e.target) && !userIcon.contains(e.target)) {
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
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.data();
                drawerContent.innerHTML = `
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-xl font-bold text-gray-800">My Account</h2>
                            <button id="closeDrawer" class="text-gray-500 hover:text-gray-700">
                                <i class="ri-close-line text-2xl"></i>
                            </button>
                        </div>
                        <div class="space-y-4">
                            <div class="flex items-center space-x-4 bg-gray-100 p-4 rounded-lg">
                                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    ${user.photoURL 
                                        ? `<img src="${user.photoURL}" alt="${userData?.name}" class="w-full h-full rounded-full object-cover">` 
                                        : `<i class="ri-user-line text-blue-600"></i>`}
                                </div>
                                <div>
                                    <h3 class="font-semibold">${userData?.name || 'Guest User'}</h3>
                                    <p class="text-sm text-gray-500">${user.email}</p>
                                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${userData?.role || 'User'}</span>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <a href="../Dashboard/Dashboard.html" class="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition">
                                    <i class="ri-dashboard-3-line text-green-600"></i>
                                    <span>Dashboard</span>
                                </a>
                                <a href="#" class="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition">
                                    <i class="ri-heart-line text-gray-600"></i>
                                    <span>Saved Lodges</span>
                                </a>
                                <a href="#" class="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition">
                                    <i class="ri-book-line text-gray-600"></i>
                                    <span>My Bookings</span>
                                </a>
                                <a href="../Extend/Extend.html" class="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition">
                                    <i class="ri-building-3-line text-gray-600"></i>
                                    <span>Extend Stay</span>
                                </a>
                                <a href="../Bill/bill.html" class="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition">
                                    <i class="ri-bill-line text-purple-600"></i>
                                    <span>Bill Checkout</span>
                                </a>
                                <button id="logoutBtn" class="w-full flex items-center space-x-3 p-3 hover:bg-red-50 rounded-lg transition">
                                    <i class="ri-logout-box-r-line text-red-600"></i>
                                    <span class="text-red-600">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

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
            }
        } else {
            drawerContent.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-gray-800">Welcome</h2>
                        <button id="closeDrawer" class="text-gray-500 hover:text-gray-700">
                            <i class="ri-close-line text-2xl"></i>
                        </button>
                    </div>
                    <div class="space-y-4">
                        <p class="text-gray-600">Please log in to access your account</p>
                        <a href="../Login/index.html" 
                           class="block w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700 transition">
                            Log In
                        </a>
                    </div>
                </div>
            `;

            // Add close drawer functionality
            document.getElementById('closeDrawer')?.addEventListener('click', () => {
                drawer.classList.add('translate-x-full');
            });
        }
    });
} 