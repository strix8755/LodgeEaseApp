import { db, auth, addBooking } from '../../AdminSide/firebase.js';
import { doc, getDoc, collection, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Constants for pricing
const NIGHTLY_RATE = 6500; // ₱6,500 per night as shown in the HTML
const SERVICE_FEE_PERCENTAGE = 0.15; // 15% service fee

// Calendar Functionality
const calendarModal = document.getElementById('calendar-modal');
const calendarGrid = document.getElementById('calendar-grid');
const calendarMonth = document.getElementById('calendar-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const clearDatesBtn = document.getElementById('clear-dates');
const closeCalendarBtn = document.getElementById('close-calendar');
const checkInInput = document.getElementById('check-in-date');
const checkOutInput = document.getElementById('check-out-date');
const nightsSelected = document.getElementById('nights-selected');
const pricingDetails = document.getElementById('pricing-details');
const nightsCalculation = document.getElementById('nights-calculation');
const totalNightsPrice = document.getElementById('total-nights-price');
const totalPrice = document.getElementById('total-price');
let serviceFee = document.getElementById('service-fee');

let currentDate = new Date(); // Current date
let selectedCheckIn = null;
let selectedCheckOut = null;

function renderCalendar(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  calendarMonth.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
  calendarGrid.innerHTML = '';

  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.textContent = day;
    dayEl.className = 'text-xs font-medium text-gray-500';
    calendarGrid.appendChild(dayEl);
  });

  // Calculate first day of the month and previous month's last days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDay = firstDay.getDay();

  // Add previous month's days
  for (let i = 0; i < startingDay; i++) {
    const dayEl = document.createElement('div');
    dayEl.textContent = new Date(year, month, -startingDay + i + 1).getDate();
    dayEl.className = 'text-gray-300';
    calendarGrid.appendChild(dayEl);
  }

  // Add current month's days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayEl = document.createElement('div');
    dayEl.textContent = day;
    dayEl.className = 'hover-date text-gray-500 hover:bg-blue-50 rounded py-2';
    
    const currentDay = new Date(year, month, day);

    // Check if day is in range
    if (selectedCheckIn && selectedCheckOut && 
        currentDay > selectedCheckIn && 
        currentDay < selectedCheckOut) {
      dayEl.classList.add('in-range');
    }

    // Highlight selected dates
    if ((selectedCheckIn && currentDay.toDateString() === selectedCheckIn.toDateString()) ||
        (selectedCheckOut && currentDay.toDateString() === selectedCheckOut.toDateString())) {
      dayEl.classList.add('selected-date');
    }

    dayEl.addEventListener('click', () => handleDateSelection(currentDay));
    calendarGrid.appendChild(dayEl);
  }
}

function handleDateSelection(selectedDate) {
  if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) {
    // First selection or reset
    selectedCheckIn = selectedDate;
    selectedCheckOut = null;
    checkInInput.value = formatDate(selectedDate);
    checkOutInput.value = '';
  } else {
    // Second selection
    if (selectedDate > selectedCheckIn) {
      selectedCheckOut = selectedDate;
      checkOutInput.value = formatDate(selectedDate);

      // Calculate nights
      const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
      nightsSelected.textContent = `${nights} nights selected`;
      
      // Update pricing
      const nightlyRate = NIGHTLY_RATE;
      const totalNights = nights;
      const subtotal = nightlyRate * totalNights;
      const serviceFeeCalculation = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
      
      nightsCalculation.textContent = `₱${nightlyRate} x ${totalNights} nights`;
      totalNightsPrice.textContent = `₱${subtotal.toLocaleString()}`;
      serviceFee.textContent = `₱${(serviceFeeCalculation).toLocaleString()}`;
      pricingDetails.classList.remove('hidden');
      totalPrice.textContent = `₱${(subtotal + serviceFeeCalculation).toLocaleString()}`;
    } else {
      // If selected date is before check-in, reset and start over
      selectedCheckIn = selectedDate;
      selectedCheckOut = null;
      checkInInput.value = formatDate(selectedDate);
      checkOutInput.value = '';
    }
  }

  renderCalendar(currentDate);
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

// Event Listeners
checkInInput?.addEventListener('click', () => {
  calendarModal.classList.remove('hidden');
  calendarModal.classList.add('flex');
});

checkOutInput?.addEventListener('click', () => {
  if (selectedCheckIn) {
    calendarModal.classList.remove('hidden');
    calendarModal.classList.add('flex');
  }
});

closeCalendarBtn?.addEventListener('click', () => {
  calendarModal.classList.add('hidden');
  calendarModal.classList.remove('flex');
});

clearDatesBtn?.addEventListener('click', () => {
  selectedCheckIn = null;
  selectedCheckOut = null;
  checkInInput.value = '';
  checkOutInput.value = '';
  nightsSelected.textContent = '';
  pricingDetails.classList.add('hidden');
  renderCalendar(currentDate);
});

prevMonthBtn?.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

nextMonthBtn?.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

// Initial calendar render
renderCalendar(currentDate);

// Close calendar when clicking outside
calendarModal?.addEventListener('click', (e) => {
  if (e.target === calendarModal) {
    calendarModal.classList.add('hidden');
    calendarModal.classList.remove('flex');
  }
});

// Get current user data
async function getCurrentUserData() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user is signed in');
            return null;
        }

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            console.log('No user data found');
            return null;
        }
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
}

async function saveBooking(bookingData) {
    try {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        // Validate booking data
        const validationResult = validateBookingData(bookingData);
        if (!validationResult.isValid) {
            throw new Error(`Booking validation failed: ${validationResult.error}`);
        }

        // Add to Firestore
        const bookingsRef = collection(db, 'bookings');
        const docRef = await addDoc(bookingsRef, bookingData);
        
        console.log('Booking saved successfully with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error in saveBooking:', error);
        throw error;
    }
}

// Add error checking function
function validateBookingData(data) {
    try {
        const requiredFields = [
            'guestName',
            'email',
            'contactNumber',
            'userId',
            'checkIn',
            'checkOut',
            'createdAt',
            'propertyDetails',
            'guests',
            'numberOfNights',
            'nightlyRate',
            'subtotal',
            'serviceFee',
            'totalPrice',
            'paymentStatus',
            'status'
        ];

        for (const field of requiredFields) {
            if (!data[field]) {
                return {
                    isValid: false,
                    error: `Missing required field: ${field}`
                };
            }
        }

        // Validate property details
        const requiredPropertyFields = ['name', 'location', 'roomNumber', 'roomType', 'floorLevel'];
        for (const field of requiredPropertyFields) {
            if (!data.propertyDetails[field]) {
                return {
                    isValid: false,
                    error: `Missing required property field: ${field}`
                };
            }
        }

        // Validate dates
        if (!(data.checkIn instanceof Timestamp)) {
            return {
                isValid: false,
                error: 'Invalid checkIn date format'
            };
        }
        if (!(data.checkOut instanceof Timestamp)) {
            return {
                isValid: false,
                error: 'Invalid checkOut date format'
            };
        }
        if (!(data.createdAt instanceof Timestamp)) {
            return {
                isValid: false,
                error: 'Invalid createdAt date format'
            };
        }

        // Validate numeric fields
        if (typeof data.numberOfNights !== 'number' || data.numberOfNights <= 0) {
            return {
                isValid: false,
                error: 'Invalid number of nights'
            };
        }
        if (typeof data.nightlyRate !== 'number' || data.nightlyRate <= 0) {
            return {
                isValid: false,
                error: 'Invalid nightly rate'
            };
        }
        if (typeof data.subtotal !== 'number' || data.subtotal <= 0) {
            return {
                isValid: false,
                error: 'Invalid subtotal'
            };
        }
        if (typeof data.serviceFee !== 'number' || data.serviceFee < 0) {
            return {
                isValid: false,
                error: 'Invalid service fee'
            };
        }
        if (typeof data.totalPrice !== 'number' || data.totalPrice <= 0) {
            return {
                isValid: false,
                error: 'Invalid total price'
            };
        }

        // All validations passed
        return {
            isValid: true,
            error: null
        };
    } catch (error) {
        console.error('Error in validateBookingData:', error);
        return {
            isValid: false,
            error: 'Validation error: ' + error.message
        };
    }
}

export async function handleReserveClick(event) {
    try {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Starting reservation process...');

        // Get form elements
        const contactNumberInput = document.getElementById('guest-contact');
        const guestsSelect = document.getElementById('guests');

        // Basic validation
        if (!contactNumberInput || !guestsSelect) {
            console.error('Form elements missing');
            alert('Please fill in all required fields');
            return false; // Prevent default and stop propagation
        }

        if (!selectedCheckIn || !selectedCheckOut) {
            alert('Please select check-in and check-out dates');
            return false;
        }

        // Check if user is logged in
        const user = auth.currentUser;
        if (!user) {
            console.log('User not logged in, redirecting to login...');
            window.location.href = '../Login/index.html';
            return false;
        }

        // Calculate booking details
        const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
        const subtotal = NIGHTLY_RATE * nights;
        const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
        const total = subtotal + serviceFeeAmount;

        const bookingData = {
            userId: user.uid,
            userEmail: user.email,
            guests: parseInt(guestsSelect.value),
            contactNumber: contactNumberInput.value.trim(),
            checkIn: selectedCheckIn.toISOString(),
            checkOut: selectedCheckOut.toISOString(),
            numberOfNights: nights,
            nightlyRate: NIGHTLY_RATE,
            subtotal: subtotal,
            serviceFee: serviceFeeAmount,
            total: total,
            propertyDetails: {
                name: 'Mountain Breeze Lodge',
                location: 'Baguio City',
                roomType: 'Deluxe Suite',
                roomNumber: '304'
            },
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        console.log('Booking data prepared:', bookingData);

        // Store in sessionStorage
        sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
        console.log('Booking data saved to sessionStorage');

        // Redirect to payment page
        console.log('Redirecting to payment page...');
        
        // Use replace to prevent going back to this page
        window.location.replace('../paymentProcess/pay.html'); // Changed from /ClientSide/paymentProcess/pay.html
        return false;

    } catch (error) {
        console.error('Error in handleReserveClick:', error);
        alert('An error occurred. Please try again.');
        return false;
    }
}

// Remove duplicate event listeners and keep only the essential ones
document.addEventListener('DOMContentLoaded', () => {
    console.log('lodge2.js loaded');
    renderCalendar(currentDate);
    setupCalendarListeners();
});

// Clean up initializeEventListeners function
function initializeEventListeners() {
    // Initialize calendar
    renderCalendar(currentDate);
    
    // Set up calendar event listeners
    setupCalendarListeners();
    
    // Auth state observer
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'logged in' : 'logged out');
        if (!user) {
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = '../Login/index.html';
        }
    });
}

// Update the event listener setup
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if there's a pending booking after login
        const pendingBooking = sessionStorage.getItem('pendingBooking');
        if (pendingBooking && auth.currentUser) {
            const bookingDetails = JSON.parse(pendingBooking);
            
            // Restore the booking details
            selectedCheckIn = new Date(bookingDetails.checkIn);
            selectedCheckOut = new Date(bookingDetails.checkOut);
            document.querySelector('select').value = bookingDetails.guests;
            document.getElementById('guest-contact').value = bookingDetails.contactNumber;
            
            // Update the display
            updateDateInputs();
            updatePricingDetails();
        }
    } catch (error) {
        console.error('Error restoring pending booking:', error);
    }
});

// Add event listener for page load to check for pending bookings
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  // Initialize all event listeners
  initializeEventListeners();

  // Auth state observer
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = '../Login/index.html';
    }
  });
});

function setupCalendarListeners() {
  // Calendar event listeners
  checkInInput?.addEventListener('click', () => {
    calendarModal.classList.remove('hidden');
    calendarModal.classList.add('flex');
  });

  checkOutInput?.addEventListener('click', () => {
    if (selectedCheckIn) {
      calendarModal.classList.remove('hidden');
      calendarModal.classList.add('flex');
    }
  });

  closeCalendarBtn?.addEventListener('click', () => {
    calendarModal.classList.add('hidden');
    calendarModal.classList.remove('flex');
  });

  clearDatesBtn?.addEventListener('click', () => {
    selectedCheckIn = null;
    selectedCheckOut = null;
    checkInInput.value = '';
    checkOutInput.value = '';
    nightsSelected.textContent = '';
    pricingDetails.classList.add('hidden');
    renderCalendar(currentDate);
  });

  prevMonthBtn?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });

  nextMonthBtn?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });

  // Calendar modal outside click
  calendarModal?.addEventListener('click', (e) => {
    if (e.target === calendarModal) {
      calendarModal.classList.add('hidden');
      calendarModal.classList.remove('flex');
    }
  });
}

function updateDateInputs() {
  checkInInput.value = formatDate(selectedCheckIn);
  checkOutInput.value = formatDate(selectedCheckOut);
}

function updatePricingDetails() {
  const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
  nightsSelected.textContent = `${nights} nights selected`;
  
  // Update pricing
  const nightlyRate = NIGHTLY_RATE;
  const totalNights = nights;
  const subtotal = nightlyRate * totalNights;
  const serviceFeeCalculation = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
  
  nightsCalculation.textContent = `₱${nightlyRate} x ${totalNights} nights`;
  totalNightsPrice.textContent = `₱${subtotal.toLocaleString()}`;
  serviceFee.textContent = `₱${(serviceFeeCalculation).toLocaleString()}`;
  pricingDetails.classList.remove('hidden');
  totalPrice.textContent = `₱${(subtotal + serviceFeeCalculation).toLocaleString()}`;
}

import { initializeUserDrawer } from '../components/userDrawer.js';
document.addEventListener('DOMContentLoaded', () => initializeUserDrawer(auth, db));
