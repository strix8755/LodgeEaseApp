import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
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
    orderBy
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

document.addEventListener('DOMContentLoaded', () => {
    let unsubscribeAuth = null;

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

    // Improved auth state management
    try {
        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    const adminDoc = await getDoc(doc(db, "admin_users", user.uid));
                    if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                        await loadRequests();
                    } else {
                        window.location.href = '../Login/index.html';
                    }
                } else {
                    window.location.href = '../Login/index.html';
                }
            } catch (error) {
                console.error('Auth state error:', error);
                alert('Authentication error. Please try logging in again.');
                window.location.href = '../Login/index.html';
            }
        });
    } catch (error) {
        console.error('Auth setup error:', error);
        alert('Failed to initialize authentication. Please refresh the page.');
    }

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
            const q = query(
                requestsRef,
                where('status', '==', 'pending'),
                orderBy('createdAt', 'desc')
            );

            // Add loading indicator
            const container = document.getElementById('cancellationRequests');
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Loading requests...</p>';

            try {
                const snapshot = await getDocs(q);
                container.innerHTML = '';

                if (snapshot.empty) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-4">No pending cancellation requests</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const request = doc.data();
                    container.appendChild(createCancellationRequestCard(doc.id, request));
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
            console.error('Error loading cancellation requests:', error);
            alert('Failed to load cancellation requests. Please try again later.');
        }
    }

    function createModificationRequestCard(requestId, request) {
        if (!request || !request.currentBooking || !request.requestedChanges) {
            console.error('Invalid request data:', request);
            return document.createElement('div');
        }
        
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 shadow-sm';
        
        const booking = request.currentBooking;
        const changes = request.requestedChanges;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-semibold text-lg">${booking.propertyDetails?.name || booking.propertyName}</h4>
                    <p class="text-sm text-gray-500">Request ID: ${requestId}</p>
                </div>
                <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Pending
                </span>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p class="text-sm text-gray-500">Current Dates</p>
                    <p class="font-medium">Check-in: ${formatDate(booking.checkIn.toDate())}</p>
                    <p class="font-medium">Check-out: ${formatDate(booking.checkOut.toDate())}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Requested Dates</p>
                    <p class="font-medium">Check-in: ${formatDate(changes.checkIn.toDate())}</p>
                    <p class="font-medium">Check-out: ${formatDate(changes.checkOut.toDate())}</p>
                </div>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Reason for Modification</p>
                <p class="mt-1">${request.reason}</p>
            </div>
            <div class="flex justify-end space-x-3">
                <button onclick="handleRejectModification('${requestId}')" class="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
                    Reject
                </button>
                <button onclick="handleApproveModification('${requestId}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Approve
                </button>
            </div>
        `;

        return card;
    }

    function createCancellationRequestCard(requestId, request) {
        if (!request || !request.booking) {
            console.error('Invalid request data:', request);
            return document.createElement('div');
        }
        
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 shadow-sm';
        
        const booking = request.booking;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-semibold text-lg">${booking.propertyDetails?.name || booking.propertyName}</h4>
                    <p class="text-sm text-gray-500">Request ID: ${requestId}</p>
                </div>
                <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Pending
                </span>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Booking Details</p>
                <p class="font-medium">Check-in: ${formatDate(booking.checkIn.toDate())}</p>
                <p class="font-medium">Check-out: ${formatDate(booking.checkOut.toDate())}</p>
                <p class="font-medium">Room: ${booking.propertyDetails?.roomType || booking.roomType}</p>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-500">Reason for Cancellation</p>
                <p class="mt-1">${request.reason}</p>
            </div>
            <div class="flex justify-end space-x-3">
                <button onclick="handleRejectCancellation('${requestId}')" class="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
                    Reject
                </button>
                <button onclick="handleApproveCancellation('${requestId}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Approve
                </button>
            </div>
        `;

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