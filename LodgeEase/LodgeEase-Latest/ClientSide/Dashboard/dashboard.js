import { auth, db } from '../js/firebase-helper.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeUserDrawer } from '../components/userDrawer.js';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded - Initializing dashboard...');
    
    // Verify elements exist
    const userIconBtn = document.getElementById('userIconBtn');
    const userDrawer = document.getElementById('userDrawer');
    
    if (!userIconBtn || !userDrawer) {
        console.error('Critical UI elements missing:', {
            userIconBtn: !!userIconBtn,
            userDrawer: !!userDrawer
        });
    } else {
        console.log('UI elements found successfully');
    }

    // Initialize user drawer
    try {
        console.log('Initializing user drawer with auth:', !!auth, 'db:', !!db);
        initializeUserDrawer(auth, db);
        console.log('User drawer initialized successfully');
    } catch (error) {
        console.error('Error initializing user drawer:', error);
    }

    // Check for booking confirmation from payment flow
    checkBookingConfirmation();

    auth.onAuthStateChanged(async (user) => {
        // Add this at the beginning of the auth state change handler
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.style.display = user ? 'none' : 'block';
        }

        if (user) {
            try {
                // Get user data
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data();

                // Update welcome message
                const guestNameElement = document.getElementById('guest-name');
                if (guestNameElement) {
                    guestNameElement.textContent = userData?.fullname || 'Guest';
                }

                // Get and display latest booking using new function
                const latestBooking = await getLatestBooking(user);
                if (latestBooking) {
                    displayBookingInfo(latestBooking);
                } else {
                    displayNoBookingInfo();
                }
            } catch (error) {
                console.error('Error loading dashboard:', error);
                const statusElement = document.getElementById('booking-status');
                if (statusElement) {
                    statusElement.textContent = 'Error loading booking information. Please try again.';
                }
            }
        } else {
            // Redirect to login if not authenticated
            window.location.href = '../Login/index.html';
        }
    });
});

let currentBookingData = null;

// Update getLatestBooking function
async function getLatestBooking(user) {
    try {
        // First check localStorage for current booking
        const currentBooking = localStorage.getItem('currentBooking');
        if (currentBooking) {
            const bookingData = JSON.parse(currentBooking);
            // Verify this booking belongs to current user
            if (bookingData.userId === user.uid) {
                console.log('Using booking from localStorage:', bookingData);
                return bookingData;
            }
        }

        // If no valid booking in localStorage, get from Firestore
        console.log('Fetching booking from Firestore...');
        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const latestBooking = {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
            };
            console.log('Found booking in Firestore:', latestBooking);
            
            // Update localStorage with latest booking
            localStorage.setItem('currentBooking', JSON.stringify(latestBooking));
            return latestBooking;
        }

        console.log('No booking found');
        return null;
    } catch (error) {
        console.error('Error getting latest booking:', error);
        throw error;
    }
}

// Add a new function to check booking confirmation from session storage
function checkBookingConfirmation() {
    const confirmationData = sessionStorage.getItem('bookingConfirmation');
    if (confirmationData) {
        console.log('Found booking confirmation in session storage');
        // Clear the confirmation from session storage to prevent showing it again on refresh
        sessionStorage.removeItem('bookingConfirmation');
        
        // Update the dashboard with this booking information
        // We'll need to fetch the complete booking details using the bookingId
        const bookingDetails = JSON.parse(confirmationData);
        if (bookingDetails && bookingDetails.bookingId) {
            fetchBookingById(bookingDetails.bookingId);
        }
    }
}

// Add a function to fetch booking by ID
async function fetchBookingById(bookingId) {
    try {
        console.log('Fetching booking by ID:', bookingId);
        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('bookingId', '==', bookingId)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const bookingData = {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
            };
            console.log('Retrieved booking by ID:', bookingData);
            
            // Store in localStorage for future reference
            localStorage.setItem('currentBooking', JSON.stringify(bookingData));
            
            // Display the booking
            displayBookingInfo(bookingData);
        }
    } catch (error) {
        console.error('Error fetching booking by ID:', error);
    }
}

// Update displayBookingInfo function to log data
function displayBookingInfo(booking) {
    console.log('Displaying booking info:', booking);
    currentBookingData = booking; // Store booking data for modal use
    // Format dates
    const formatDate = (dateInput) => {
        if (!dateInput) return '---';
        if (typeof dateInput === 'string') return new Date(dateInput).toLocaleDateString();
        if (dateInput.seconds) return new Date(dateInput.seconds * 1000).toLocaleDateString();
        return new Date(dateInput).toLocaleDateString();
    };

    // Use the exact totalPrice from the booking data without any modifications
    const elements = {
        'room-number': booking.propertyDetails?.roomNumber || '---',
        'check-in-date': formatDate(booking.checkIn),
        'check-out-date': formatDate(booking.checkOut),
        'guest-count': booking.guests || '---',
        'rate-per-night': booking.nightlyRate ? `₱${booking.nightlyRate.toLocaleString()}` : '---',
        // Don't recalculate, just use the stored totalPrice
        'total-amount': `₱${parseFloat(booking.totalPrice || 0).toLocaleString()}`
    };

    // Update each element if it exists
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    // Update booking status
    const statusElement = document.getElementById('booking-status');
    if (statusElement) {
        const now = new Date();
        const checkIn = booking.checkIn.seconds ? 
            new Date(booking.checkIn.seconds * 1000) : 
            new Date(booking.checkIn);
        const checkOut = booking.checkOut.seconds ? 
            new Date(booking.checkOut.seconds * 1000) : 
            new Date(booking.checkOut);

        let status = '';
        if (now < checkIn) {
            const daysToCheckIn = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));
            status = `Your stay begins in ${daysToCheckIn} days`;
        } else if (now >= checkIn && now <= checkOut) {
            const daysLeft = Math.ceil((checkOut - now) / (1000 * 60 * 60 * 24));
            status = `Currently staying - ${daysLeft} days remaining`;
        } else {
            status = 'Stay completed';
        }
        
        statusElement.textContent = status;
    }

    // Update modal content to use the same total price logic
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    viewDetailsBtn?.addEventListener('click', () => {
        if (currentBookingData) {
            const modalContent = document.getElementById('modalContent');
            const formatDate = (dateInput) => {
                if (!dateInput) return '---';
                if (typeof dateInput === 'string') return new Date(dateInput).toLocaleDateString();
                if (dateInput.seconds) return new Date(dateInput.seconds * 1000).toLocaleDateString();
                return new Date(dateInput).toLocaleDateString();
            };

            // Use the exact totalPrice value without modification
            const totalAmount = parseFloat(currentBookingData.totalPrice || 0);

            modalContent.innerHTML = `
                <div class="text-center mb-4">
                    <img src="../components/lodgeeaselogo.png" alt="LodgeEase Logo" class="h-12 w-12 mx-auto mb-2">
                    <h1 class="text-xl font-bold text-blue-600 mb-1">LodgeEase</h1>
                    <p class="text-sm text-gray-600">Booking Confirmation</p>
                </div>

                <div class="border-b border-gray-200 pb-3 mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-gray-600">Booking Reference:</span>
                        <span class="font-mono font-bold">${currentBookingData.id || '---'}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-600">Booking Status:</span>
                        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Confirmed</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <h3 class="font-semibold mb-2">Guest Information</h3>
                        <p class="text-gray-600">${currentBookingData.guestName || '---'}</p>
                        <p class="text-gray-600">${currentBookingData.email || '---'}</p>
                        <p class="text-gray-600">Guests: ${currentBookingData.guests || '---'}</p>
                    </div>
                    <div>
                        <h3 class="font-semibold mb-2">Hotel Information</h3>
                        <p class="text-gray-600">LodgeEase Hotel</p>
                        <p class="text-gray-600">Aspiras Palispis Highway</p>
                        <p class="text-gray-600">Baguio City, 2600</p>
                    </div>
                </div>

                <div class="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                    <h3 class="font-semibold mb-3">Stay Details</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-600">Check-in</p>
                            <p class="font-medium">${formatDate(currentBookingData.checkIn)}</p>
                            <p class="text-sm text-gray-500">After 2:00 PM</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Check-out</p>
                            <p class="font-medium">${formatDate(currentBookingData.checkOut)}</p>
                            <p class="text-sm text-gray-500">Before 12:00 PM</p>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                    <h3 class="font-semibold mb-3">Room Details</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Room Number</span>
                            <span class="font-medium">${currentBookingData.propertyDetails?.roomNumber || '---'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Room Type</span>
                            <span class="font-medium">${currentBookingData.propertyDetails?.roomType || '---'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Rate per Night</span>
                            <span class="font-medium">₱${currentBookingData.nightlyRate?.toLocaleString() || '---'}</span>
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-3">
                    <div class="flex justify-between items-center text-lg font-bold">
                        <span>Total Amount</span>
                        <span>₱${totalAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div class="mt-4 text-center text-xs text-gray-500">
                    <p>Please present this booking confirmation upon check-in</p>
                    <p>For inquiries, contact: +63 912 991 2658</p>
                </div>
            `;
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

function displayNoBookingInfo() {
    // Clear all booking fields
    const elements = [
        'room-number',
        'check-in-date',
        'check-out-date',
        'guest-count',
        'rate-per-night',
        'total-amount'
    ];

    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '---';
        }
    });

    // Update status
    const statusElement = document.getElementById('booking-status');
    if (statusElement) {
        statusElement.textContent = 'No active bookings found. Browse our available rooms to make a reservation.';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('bookingModal');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const closeModal = document.getElementById('closeModal');
    const downloadPDF = document.getElementById('downloadPDF');
    const printBooking = document.getElementById('printBooking');

    viewDetailsBtn?.addEventListener('click', () => {
        if (currentBookingData) {
            const modalContent = document.getElementById('modalContent');
            const formatDate = (dateInput) => {
                if (!dateInput) return '---';
                if (typeof dateInput === 'string') return new Date(dateInput).toLocaleDateString();
                if (dateInput.seconds) return new Date(dateInput.seconds * 1000).toLocaleDateString();
                return new Date(dateInput).toLocaleDateString();
            };

            // Use the exact totalPrice value without modification
            const totalAmount = parseFloat(currentBookingData.totalPrice || 0);

            modalContent.innerHTML = `
                <div class="text-center mb-4">
                    <img src="../components/lodgeeaselogo.png" alt="LodgeEase Logo" class="h-12 w-12 mx-auto mb-2">
                    <h1 class="text-xl font-bold text-blue-600 mb-1">LodgeEase</h1>
                    <p class="text-sm text-gray-600">Booking Confirmation</p>
                </div>

                <div class="border-b border-gray-200 pb-3 mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-gray-600">Booking Reference:</span>
                        <span class="font-mono font-bold">${currentBookingData.id || '---'}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-600">Booking Status:</span>
                        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Confirmed</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <h3 class="font-semibold mb-2">Guest Information</h3>
                        <p class="text-gray-600">${currentBookingData.guestName || '---'}</p>
                        <p class="text-gray-600">${currentBookingData.email || '---'}</p>
                        <p class="text-gray-600">Guests: ${currentBookingData.guests || '---'}</p>
                    </div>
                    <div>
                        <h3 class="font-semibold mb-2">Hotel Information</h3>
                        <p class="text-gray-600">LodgeEase Hotel</p>
                        <p class="text-gray-600">Aspiras Palispis Highway</p>
                        <p class="text-gray-600">Baguio City, 2600</p>
                    </div>
                </div>

                <div class="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                    <h3 class="font-semibold mb-3">Stay Details</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-600">Check-in</p>
                            <p class="font-medium">${formatDate(currentBookingData.checkIn)}</p>
                            <p class="text-sm text-gray-500">After 2:00 PM</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Check-out</p>
                            <p class="font-medium">${formatDate(currentBookingData.checkOut)}</p>
                            <p class="text-sm text-gray-500">Before 12:00 PM</p>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                    <h3 class="font-semibold mb-3">Room Details</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Room Number</span>
                            <span class="font-medium">${currentBookingData.propertyDetails?.roomNumber || '---'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Room Type</span>
                            <span class="font-medium">${currentBookingData.propertyDetails?.roomType || '---'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Rate per Night</span>
                            <span class="font-medium">₱${currentBookingData.nightlyRate?.toLocaleString() || '---'}</span>
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-3">
                    <div class="flex justify-between items-center text-lg font-bold">
                        <span>Total Amount</span>
                        <span>₱${totalAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div class="mt-4 text-center text-xs text-gray-500">
                    <p>Please present this booking confirmation upon check-in</p>
                    <p>For inquiries, contact: +63 912 991 2658</p>
                </div>
            `;
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    closeModal?.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    // Close modal when clicking outside
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    // Print functionality
    printBooking?.addEventListener('click', () => {
        const modalContent = document.getElementById('modalContent');
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Booking Confirmation</title>
                    <link href="https://cdn.tailwindcss.com" rel="stylesheet">
                </head>
                <body class="p-8">
                    ${modalContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    });

    // Download PDF functionality
    downloadPDF?.addEventListener('click', () => {
        const modalContent = document.getElementById('modalContent');
        const filename = `booking-confirmation-${currentBookingData.id || 'default'}.pdf`;
        
        // Create temporary element for PDF content
        const element = document.createElement('div');
        element.innerHTML = modalContent.innerHTML;
        element.style.padding = '20px';

        const opt = {
            margin: 1,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Generate PDF using html2pdf
        window.html2pdf().set(opt).from(element).save().catch(err => {
            console.error('Error generating PDF:', err);
        });
    });

    // Add modal scroll functionality
    const modalContent = document.getElementById('modalContent');
    if (modalContent) {
        modalContent.addEventListener('scroll', () => {
            const isAtTop = modalContent.scrollTop === 0;
            const isAtBottom = 
                modalContent.scrollHeight - modalContent.scrollTop === modalContent.clientHeight;
            
            // Optional: Add visual indicators for scroll position
            modalContent.style.borderTop = isAtTop ? 'none' : '1px solid #e5e7eb';
            modalContent.style.borderBottom = isAtBottom ? 'none' : '1px solid #e5e7eb';
        });
    }
});