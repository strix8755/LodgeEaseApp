import { db, auth, addBooking } from '../../AdminSide/firebase.js';
import { doc, getDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

// Constants for pricing
const NIGHTLY_RATE = 6500; // ₱6,500 per night as shown in the HTML
const SERVICE_FEE_PERCENTAGE = 0.14; // 14% service fee

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
      const nightlyRate = 6500;
      const totalNights = nights;
      const subtotal = nightlyRate * totalNights;
      const serviceFeeCalculation = Math.round(subtotal * 0.14);
      
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
checkInInput.addEventListener('click', () => {
  calendarModal.classList.remove('hidden');
  calendarModal.classList.add('flex');
});

checkOutInput.addEventListener('click', () => {
  if (selectedCheckIn) {
    calendarModal.classList.remove('hidden');
    calendarModal.classList.add('flex');
  }
});

closeCalendarBtn.addEventListener('click', () => {
  calendarModal.classList.add('hidden');
  calendarModal.classList.remove('flex');
});

clearDatesBtn.addEventListener('click', () => {
  selectedCheckIn = null;
  selectedCheckOut = null;
  checkInInput.value = '';
  checkOutInput.value = '';
  nightsSelected.textContent = '';
  pricingDetails.classList.add('hidden');
  renderCalendar(currentDate);
});

prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

// Initial calendar render
renderCalendar(currentDate);

// Close calendar when clicking outside
calendarModal.addEventListener('click', (e) => {
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
            window.location.href = '../Login/index.html';
            throw new Error('User not logged in');
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            throw new Error('User data not found');
        }
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
}

async function saveBooking() {
    try {
        // Get current user data
        const userData = await getCurrentUserData();
        if (!userData) {
            throw new Error('Unable to get user data');
        }

        // Verify user is logged in
        if (!auth.currentUser) {
            window.location.href = '../Login/index.html';
            throw new Error('Please log in to make a booking');
        }

        // Get contact number
        const contactNumber = document.getElementById('guest-contact')?.value;
        if (!contactNumber) {
            throw new Error('Please enter your contact number');
        }

        // Calculate booking details
        const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
        const subtotal = NIGHTLY_RATE * nights;
        const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
        const total = subtotal + serviceFeeAmount;

        // Create booking data
        const bookingData = {
            // Guest Information
            guestName: userData.fullname,
            email: userData.email,
            contactNumber: contactNumber,
            
            // Dates
            checkIn: Timestamp.fromDate(selectedCheckIn),
            checkOut: Timestamp.fromDate(selectedCheckOut),
            createdAt: Timestamp.fromDate(new Date()),
            
            // Property Details
            propertyDetails: {
                name: 'Pine Haven Lodge',
                location: 'Baguio City, Philippines',
                roomNumber: 'A101',
                roomType: 'Deluxe Suite',
                floorLevel: '1st Floor'
            },
            
            // Booking Details
            guests: document.querySelector('select').value,
            numberOfNights: nights,
            nightlyRate: NIGHTLY_RATE,
            
            // Payment Information
            subtotal: subtotal,
            serviceFee: serviceFeeAmount,
            totalPrice: total,
            paymentStatus: 'pending',
            
            // Status
            status: 'pending'
        };

        // Save booking using firebase.js addBooking function
        const bookingId = await addBooking(bookingData);
        if (!bookingId) {
            throw new Error('Failed to save booking');
        }

        // Store booking data for payment page
        localStorage.setItem('bookingData', JSON.stringify(bookingData));
        localStorage.setItem('currentBookingId', bookingId);

        return bookingId;

    } catch (error) {
        console.error('Error in saveBooking:', error);
        if (error.message.includes('permissions')) {
            window.location.href = '../Login/index.html';
            throw new Error('Please log in to make a booking');
        }
        throw error;
    }
}

export async function handleReserveClick(event) {
    event.preventDefault();
    console.log('handleReserveClick called');

    const reserveBtn = document.getElementById('reserve-btn');
    if (!reserveBtn) {
        console.error('Reserve button not found');
        return;
    }

    const buttonText = reserveBtn.textContent;
    
    try {
        // Check if user is logged in first
        if (!auth.currentUser) {
            window.location.href = '../Login/index.html';
            return;
        }

        // Show loading state
        reserveBtn.textContent = 'Processing...';
        reserveBtn.disabled = true;

        console.log('Validating dates...');
        // Validate dates
        if (!selectedCheckIn || !selectedCheckOut) {
            throw new Error('Please select check-in and check-out dates');
        }

        console.log('Validating contact number...');
        // Validate contact number
        const contactNumber = document.getElementById('guest-contact')?.value;
        if (!contactNumber) {
            throw new Error('Please enter your contact number');
        }

        console.log('Attempting to save booking...');
        console.log('Selected dates:', { checkIn: selectedCheckIn, checkOut: selectedCheckOut });
        console.log('Contact number:', contactNumber);

        const bookingId = await saveBooking();
        console.log('Booking saved with ID:', bookingId);
        
        if (bookingId) {
            console.log('Redirecting to payment page...');
            window.location.href = `pay.html?bookingId=${encodeURIComponent(bookingId)}`;
        } else {
            throw new Error('Failed to create booking');
        }

    } catch (error) {
        console.error('Booking error:', error);
        if (error.message.includes('permissions') || error.message.includes('log in')) {
            window.location.href = '../Login/index.html';
            return;
        }
        alert(error.message || 'There was an error processing your booking. Please try again.');
        
        // Reset button state
        reserveBtn.textContent = buttonText;
        reserveBtn.disabled = false;
    }
}

// Update the event listener setup
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

function initializeEventListeners() {
  // Initialize calendar
  renderCalendar(currentDate);

  // Direct event listener for reserve button
  const reserveBtn = document.getElementById('reserve-btn');
  if (reserveBtn) {
    console.log('Found reserve button, adding click listener');
    reserveBtn.onclick = async (event) => {
      console.log('Reserve button clicked');
      try {
        await handleReserveClick(event);
      } catch (error) {
        console.error('Error in reserve button click handler:', error);
      }
    };
  } else {
    console.error('Reserve button not found');
  }

  // Auth state observer
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = '../Login/index.html';
    }
  });

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

// Add error checking function
function validateBookingData(bookingData) {
    const required = ['checkIn', 'checkOut', 'guests', 'nightlyRate', 'numberOfNights', 
                     'subtotal', 'serviceFee', 'totalPrice', 'status', 'createdAt'];
    
    for (const field of required) {
        if (!bookingData[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    return true;
}
