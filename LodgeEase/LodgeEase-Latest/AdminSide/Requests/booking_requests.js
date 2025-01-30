import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    getDoc,  // Add this import
    updateDoc, 
    doc, 
    Timestamp,
    orderBy,
    onSnapshot // Add this import
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

// Initialize Firebase with your config
const firebaseConfig = {
    apiKey: "AIzaSyBAJr0JQgWRfGTmSXTK6P7Yn8fkHXG2YeE",
    authDomain: "lms-app-2b903.firebaseapp.com",
    projectId: "lms-app-2b903",
    storageBucket: "lms-app-2b903.appspot.com",
    messagingSenderId: "1046108373013",
    appId: "1:1046108373013:web:fc366db1d92b9c4b860e1c",
    measurementId: "G-WRMW9Z8867"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to LOCAL (this keeps the user logged in)
setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
        console.error("Auth persistence error:", error);
    });

// Function declarations moved outside DOMContentLoaded
async function loadModificationRequests() {
    try {
        const requestsRef = collection(db, 'modificationRequests');
        const q = query(
            requestsRef,
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const container = document.getElementById('modificationRequests');
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Loading requests...</p>';

        try {
            const snapshot = await getDocs(q);
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No pending modification requests</p>';
                return;
            }

            snapshot.forEach(doc => {
                const request = doc.data();
                container.appendChild(createModificationRequestCard(doc.id, request));
            });
        } catch (error) {
            if (error.code === 'failed-precondition' || error.message.includes('requires an index')) {
                container.innerHTML = `
                    <div class="text-red-500 text-center py-4">
                        <p>Index not ready. Please wait a few moments and refresh the page.</p>
                        <p class="text-sm">If the problem persists, ask an administrator to check the Firebase indexes.</p>
                    </div>
                `;
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error loading modification requests:', error);
        alert('Failed to load modification requests. Please try again later.');
    }
}

async function loadCancellationRequests() {
    try {
        const requestsRef = collection(db, 'cancellationRequests');
        console.log('Starting to load cancellation requests...');

        const snapshot = await getDocs(requestsRef);
        console.log('Total cancellation requests found:', snapshot.size);
        
        snapshot.forEach(doc => {
            console.log('Request:', {
                id: doc.id,
                status: doc.data().status,
                booking: doc.data().booking?.id,
                createdAt: doc.data().createdAt?.toDate()
            });
        });

        const container = document.getElementById('cancellationRequests');
        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No cancellation requests found</p>';
            return;
        }

        const pendingRequests = snapshot.docs.filter(doc => doc.data().status === 'pending');
        console.log('Pending cancellation requests:', pendingRequests.length);

        if (pendingRequests.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No pending cancellation requests</p>';
            return;
        }

        pendingRequests.forEach(doc => {
            const request = doc.data();
            console.log('Creating card for request:', doc.id, request);
            container.appendChild(createCancellationRequestCard(doc.id, request));
        });

    } catch (error) {
        console.error('Detailed error loading cancellation requests:', error);
        const container = document.getElementById('cancellationRequests');
        container.innerHTML = `
            <div class="bg-red-100 text-red-700 p-4 rounded">
                <p>Error loading requests: ${error.message}</p>
                <p class="text-sm mt-2">Error code: ${error.code || 'unknown'}</p>
            </div>
        `;
    }
}

// Set up real-time listeners for both request types
function setupRequestListeners() {
    // Listen for cancellation requests
    const unsubscribeCancellations = onSnapshot(collection(db, 'cancellationRequests'), (snapshot) => {
        console.log('Cancellation requests updated:', snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })));
        loadCancellationRequests(); // Now this function is in scope
    });

    // Listen for modification requests
    const unsubscribeModifications = onSnapshot(collection(db, 'modificationRequests'), (snapshot) => {
        console.log('Modification requests updated:', snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })));
        loadModificationRequests(); // Now this function is in scope
    });

    // Clean up listeners on page unload
    window.addEventListener('unload', () => {
        unsubscribeCancellations();
        unsubscribeModifications();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    let unsubscribeAuth = null;
    let authInitialized = false;

    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active', 'border-blue-500', 'text-blue-600'));
            tab.classList.add('active', 'border-blue-500', 'text-blue-600');

            tabContents.forEach(content => content.classList.add('hidden'));
            const targetContent = document.getElementById(`${tab.dataset.tab}Tab`);
            targetContent.classList.remove('hidden');
        });
    });

    // Replace the auth state management code
    try {
        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            try {
                console.log("Auth state changed:", user ? "User exists" : "No user");
                
                // Skip if auth is already initialized and user exists
                if (authInitialized && user) {
                    console.log("Auth already initialized, skipping checks");
                    return;
                }

                if (user) {
                    authInitialized = true;
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    console.log("User document:", userDoc.exists() ? "exists" : "does not exist");

                    if (userDoc.exists()) {
                        // Store user data in sessionStorage
                        sessionStorage.setItem('userAuthenticated', 'true');
                        sessionStorage.setItem('userId', user.uid);
                        
                        console.log("Setting up listeners and loading requests");
                        setupRequestListeners();
                        await loadRequests();
                    } else {
                        console.error('User document not found');
                        sessionStorage.clear();
                        if (!window.location.href.includes('Login/index.html')) {
                            window.location.href = '../Login/index.html';
                        }
                    }
                } else if (sessionStorage.getItem('userAuthenticated')) {
                    // User was previously authenticated in this session
                    console.log("Session exists but no user, waiting for auth...");
                    // Don't redirect immediately, wait for a moment
                    setTimeout(() => {
                        if (!auth.currentUser) {
                            console.log("No user after delay, redirecting");
                            sessionStorage.clear();
                            window.location.href = '../Login/index.html';
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('Auth state error:', error);
                // Only redirect on critical errors
                if (error.code === 'permission-denied') {
                    sessionStorage.clear();
                    window.location.href = '../Login/index.html';
                }
            }
        });
    } catch (error) {
        console.error('Auth setup error:', error);
    }

    // Add page visibility change handler
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && auth.currentUser) {
            console.log('Page became visible, refreshing data...');
            try {
                await loadRequests();
            } catch (error) {
                console.error('Error refreshing data:', error);
            }
        }
    });

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        if (unsubscribeAuth) {
            unsubscribeAuth();
        }
    });

    async function loadRequests() {
        try {
            await Promise.all([
                loadModificationRequests(),
                loadCancellationRequests()
            ]);
        } catch (error) {
            console.error('Error loading requests:', error);
            handleLoadError(error);
        }
    }

    function handleLoadError(error) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4';
        
        if (error.code === 'failed-precondition' || error.message.includes('requires an index')) {
            errorMessage.textContent = 'Database index not ready. Please wait a few moments and refresh the page.';
        } else if (error.code === 'permission-denied') {
            errorMessage.textContent = 'You do not have permission to view these requests.';
            setTimeout(() => window.location.href = '../Login/index.html', 2000);
        } else {
            errorMessage.textContent = 'Failed to load requests. Please refresh the page or try again later.';
        }

        document.querySelector('.tab-content:not(.hidden)').appendChild(errorMessage);
    }

    async function loadModificationRequests() {
        try {
            const requestsRef = collection(db, 'modificationRequests');
            const q = query(
                requestsRef,
                where('status', '==', 'pending'),
                orderBy('createdAt', 'desc')
            );

            // Add loading indicator
            const container = document.getElementById('modificationRequests');
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Loading requests...</p>';

            try {
                const snapshot = await getDocs(q);
                container.innerHTML = '';

                if (snapshot.empty) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-4">No pending modification requests</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const request = doc.data();
                    container.appendChild(createModificationRequestCard(doc.id, request));
                });
            } catch (error) {
                if (error.code === 'failed-precondition' || error.message.includes('requires an index')) {
                    container.innerHTML = `
                        <div class="text-red-500 text-center py-4">
                            <p>Index not ready. Please wait a few moments and refresh the page.</p>
                            <p class="text-sm">If the problem persists, ask an administrator to check the Firebase indexes.</p>
                        </div>
                    `;
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error loading modification requests:', error);
            alert('Failed to load modification requests. Please try again later.');
        }
    }

    async function loadCancellationRequests() {
        try {
            const requestsRef = collection(db, 'cancellationRequests');
            console.log('Starting to load cancellation requests...');

            // Get all requests and filter in memory for debugging
            const snapshot = await getDocs(requestsRef);
            
            console.log('Total cancellation requests found:', snapshot.size);
            
            // Debug log all requests
            snapshot.forEach(doc => {
                console.log('Request:', {
                    id: doc.id,
                    status: doc.data().status,
                    booking: doc.data().booking?.id,
                    createdAt: doc.data().createdAt?.toDate()
                });
            });

            const container = document.getElementById('cancellationRequests');
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No cancellation requests found</p>';
                return;
            }

            // Filter pending requests
            const pendingRequests = snapshot.docs.filter(doc => doc.data().status === 'pending');
            console.log('Pending cancellation requests:', pendingRequests.length);

            if (pendingRequests.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No pending cancellation requests</p>';
                return;
            }

            pendingRequests.forEach(doc => {
                const request = doc.data();
                console.log('Creating card for request:', doc.id, request);
                container.appendChild(createCancellationRequestCard(doc.id, request));
            });

        } catch (error) {
            console.error('Detailed error loading cancellation requests:', error);
            const container = document.getElementById('cancellationRequests');
            container.innerHTML = `
                <div class="bg-red-100 text-red-700 p-4 rounded">
                    <p>Error loading requests: ${error.message}</p>
                    <p class="text-sm mt-2">Error code: ${error.code || 'unknown'}</p>
                </div>
            `;
        }
    }

    function createModificationRequestCard(requestId, request) {
        if (!request || !request.currentBooking || !request.requestedChanges) {
            console.error('Invalid request data:', request);
            return document.createElement('div');
        }
        
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 shadow-sm mb-4';
        
        const booking = request.currentBooking;
        const changes = request.requestedChanges;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-semibold text-lg">${booking.propertyDetails?.name || booking.propertyName || 'Unnamed Property'}</h4>
                    <p class="text-sm text-gray-500">Request ID: ${requestId}</p>
                    <p class="text-sm text-gray-500">Booking ID: ${booking.id || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Created: ${request.createdAt ? new Date(request.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
                </div>
                <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Pending
                </span>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Current Booking Dates</p>
                <p class="font-medium">Check-in: ${formatDate(booking.checkIn.toDate())}</p>
                <p class="font-medium">Check-out: ${formatDate(booking.checkOut.toDate())}</p>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Requested Booking Dates</p>
                <p class="font-medium">Check-in: ${formatDate(changes.checkIn.toDate())}</p>
                <p class="font-medium">Check-out: ${formatDate(changes.checkOut.toDate())}</p>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Reason for Modification</p>
                <p class="mt-1">${request.reason || 'No reason provided'}</p>
            </div>
            <div class="flex justify-end space-x-3">
                <button class="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 reject-btn">
                    Reject
                </button>
                <button class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 approve-btn">
                    Approve
                </button>
            </div>
        `;

        // Add event listeners
        const approveBtn = card.querySelector('.approve-btn');
        const rejectBtn = card.querySelector('.reject-btn');

        approveBtn.addEventListener('click', () => handleApproveModification(requestId));
        rejectBtn.addEventListener('click', () => handleRejectModification(requestId));

        return card;
    }

    function createCancellationRequestCard(requestId, request) {
        if (!request || !request.booking) {
            console.error('Invalid request data:', request);
            return document.createElement('div');
        }
        
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 shadow-sm mb-4';
        
        const booking = request.booking;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-semibold text-lg">${booking.propertyDetails?.name || booking.propertyName || 'Unnamed Property'}</h4>
                    <p class="text-sm text-gray-500">Request ID: ${requestId}</p>
                    <p class="text-sm text-gray-500">Booking ID: ${booking.id || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Created: ${request.createdAt ? new Date(request.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
                </div>
                <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Pending
                </span>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Booking Details</p>
                <p class="font-medium">Guest: ${booking.guestName || 'N/A'}</p>
                <p class="font-medium">Check-in: ${booking.checkIn ? formatDate(booking.checkIn.toDate()) : 'N/A'}</p>
                <p class="font-medium">Check-out: ${booking.checkOut ? formatDate(booking.checkOut.toDate()) : 'N/A'}</p>
                <p class="font-medium">Room: ${booking.propertyDetails?.roomType || booking.roomType || 'N/A'}</p>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Reason for Cancellation</p>
                <p class="mt-1">${request.reason || 'No reason provided'}</p>
            </div>
            <div class="flex justify-end space-x-3">
                <button class="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 reject-btn">
                    Reject
                </button>
                <button class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 approve-btn">
                    Approve
                </button>
            </div>
        `;

        // Add event listeners
        const approveBtn = card.querySelector('.approve-btn');
        const rejectBtn = card.querySelector('.reject-btn');

        approveBtn.addEventListener('click', () => handleApproveCancellation(requestId));
        rejectBtn.addEventListener('click', () => handleRejectCancellation(requestId));

        return card;
    }

    // Handle modification approval
    window.handleApproveModification = async function(requestId) {
        const approveBtn = document.querySelector(`button[onclick="handleApproveModification('${requestId}')"]`);
        approveBtn.disabled = true;
        approveBtn.textContent = 'Processing...';
        
        try {
            const requestRef = doc(db, 'modificationRequests', requestId);
            const requestDoc = await getDoc(requestRef);
            const request = requestDoc.data();

            // Update the booking with new dates
            const bookingRef = doc(db, 'bookings', request.bookingId);
            await updateDoc(bookingRef, {
                checkIn: request.requestedChanges.checkIn,
                checkOut: request.requestedChanges.checkOut,
                modificationRequested: false,
                lastModified: Timestamp.fromDate(new Date()),
                modificationStatus: 'approved'
            });

            // Update request status
            await updateDoc(requestRef, {
                status: 'approved',
                processedAt: Timestamp.fromDate(new Date()),
                processedBy: auth.currentUser.uid
            });

            alert('Modification request approved successfully');
            await loadRequests();
        } catch (error) {
            console.error('Error approving modification:', error);
            alert('Failed to approve modification request');
        } finally {
            approveBtn.disabled = false;
            approveBtn.textContent = 'Approve';
        }
    };

    // Handle modification rejection
    window.handleRejectModification = async function(requestId) {
        try {
            const requestRef = doc(db, 'modificationRequests', requestId);
            const requestDoc = await getDoc(requestRef);
            const request = requestDoc.data();
            const bookingRef = doc(db, 'bookings', request.bookingId);

            // Update the booking status
            await updateDoc(bookingRef, {
                modificationRequested: false,
                modificationStatus: 'rejected'
            });

            // Update request status
            await updateDoc(requestRef, {
                status: 'rejected',
                processedAt: Timestamp.fromDate(new Date()),
                processedBy: auth.currentUser.uid
            });

            alert('Modification request rejected');
            await loadRequests();
        } catch (error) {
            console.error('Error rejecting modification:', error);
            alert('Failed to reject modification request');
        }
    };

    // Handle cancellation approval
    window.handleApproveCancellation = async function(requestId) {
        try {
            const requestRef = doc(db, 'cancellationRequests', requestId);
            const requestDoc = await getDoc(requestRef);
            const request = requestDoc.data();

            // Update the booking status
            const bookingRef = doc(db, 'bookings', request.bookingId);
            await updateDoc(bookingRef, {
                status: 'cancelled',
                cancellationRequested: false,
                cancelledAt: Timestamp.fromDate(new Date()),
                cancellationStatus: 'approved'
            });

            // Update request status
            await updateDoc(requestRef, {
                status: 'approved',
                processedAt: Timestamp.fromDate(new Date()),
                processedBy: auth.currentUser.uid
            });

            alert('Cancellation request approved successfully');
            await loadRequests();
        } catch (error) {
            console.error('Error approving cancellation:', error);
            alert('Failed to approve cancellation request');
        }
    };

    // Handle cancellation rejection
    window.handleRejectCancellation = async function(requestId) {
        try {
            const requestRef = doc(db, 'cancellationRequests', requestId);
            const requestDoc = await getDoc(requestRef);
            const request = requestDoc.data();

            // Update the booking status
            const bookingRef = doc(db, 'bookings', request.bookingId);
            await updateDoc(bookingRef, {
                cancellationRequested: false,
                cancellationStatus: 'rejected'
            });

            // Update request status
            await updateDoc(requestRef, {
                status: 'rejected',
                processedAt: Timestamp.fromDate(new Date()),
                processedBy: auth.currentUser.uid
            });

            alert('Cancellation request rejected');
            await loadRequests();
        } catch (error) {
            console.error('Error rejecting cancellation:', error);
            alert('Failed to reject cancellation request');
        }
    };

    function formatDate(date) {
        try {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }
});