import { auth, db } from '../../AdminSide/firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeUserDrawer } from '../components/userDrawer.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize user drawer
    initializeUserDrawer(auth, db);

    auth.onAuthStateChanged(async (user) => {
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

                // First check localStorage for current booking
                const currentBooking = localStorage.getItem('currentBooking');
                if (currentBooking) {
                    const bookingData = JSON.parse(currentBooking);
                    displayBookingInfo(bookingData);
                } else {
                    // If no booking in localStorage, check Firestore
                    const bookingsRef = collection(db, 'bookings');
                    const q = query(bookingsRef, where('userId', '==', user.uid));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        // Get the most recent booking
                        const bookings = [];
                        querySnapshot.forEach((doc) => {
                            bookings.push({ id: doc.id, ...doc.data() });
                        });
                        
                        // Sort by timestamp
                        bookings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        const latestBooking = bookings[0];
                        
                        displayBookingInfo(latestBooking);
                    } else {
                        displayNoBookingInfo();
                    }
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

function displayBookingInfo(booking) {
    // Format dates
    const formatDate = (dateInput) => {
        if (!dateInput) return '---';
        if (typeof dateInput === 'string') return new Date(dateInput).toLocaleDateString();
        if (dateInput.seconds) return new Date(dateInput.seconds * 1000).toLocaleDateString();
        return new Date(dateInput).toLocaleDateString();
    };

    // Update individual elements
    const elements = {
        'room-number': booking.propertyDetails?.roomNumber || '---',
        'check-in-date': formatDate(booking.checkIn),
        'check-out-date': formatDate(booking.checkOut),
        'guest-count': booking.guests || '---',
        'rate-per-night': booking.nightlyRate ? `₱${booking.nightlyRate.toLocaleString()}` : '---',
        'total-amount': booking.totalPrice ? `₱${booking.totalPrice.toLocaleString()}` : '---'
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