// Imports
import { addBooking } from '../../AdminSide/firebase.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

// DOM Elements
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
const serviceFee = document.getElementById('service-fee');

// Constants
const NIGHTLY_RATE = 3200;
const SERVICE_FEE_PERCENTAGE = 0.14;

// State
let currentDate = new Date();
let selectedCheckIn = null;
let selectedCheckOut = null;

// Calendar Functions
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
    dayEl.className = 'text-gray-300 cursor-not-allowed';
    calendarGrid.appendChild(dayEl);
  }

  // Add current month's days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayEl = document.createElement('div');
    dayEl.textContent = day;
    dayEl.className = 'cursor-pointer text-center p-2 hover:bg-blue-50 rounded transition-colors duration-200';
    
    const currentDay = new Date(year, month, day);
    const today = new Date();
    
    // Disable past dates
    if (currentDay < today) {
      dayEl.className = 'text-gray-300 cursor-not-allowed';
    } else {
      // Check if day is in range
      if (selectedCheckIn && selectedCheckOut && 
          currentDay > selectedCheckIn && 
          currentDay < selectedCheckOut) {
        dayEl.classList.add('bg-blue-100');
      }

      // Highlight selected dates
      if ((selectedCheckIn && currentDay.toDateString() === selectedCheckIn.toDateString()) ||
          (selectedCheckOut && currentDay.toDateString() === selectedCheckOut.toDateString())) {
        dayEl.classList.add('bg-blue-500', 'text-white');
      }

      dayEl.addEventListener('click', () => handleDateSelection(currentDay));
    }
    
    calendarGrid.appendChild(dayEl);
  }
}

function handleDateSelection(selectedDate) {
  const today = new Date();
  if (selectedDate < today) {
    return; // Don't allow selection of past dates
  }

  if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) {
    // First selection or reset
    selectedCheckIn = selectedDate;
    selectedCheckOut = null;
    checkInInput.value = formatDate(selectedDate);
    checkOutInput.value = '';
    nightsSelected.textContent = '';
    pricingDetails.classList.add('hidden');
  } else {
    // Second selection
    if (selectedDate > selectedCheckIn) {
      selectedCheckOut = selectedDate;
      checkOutInput.value = formatDate(selectedDate);

      // Calculate nights
      const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
      nightsSelected.textContent = `${nights} nights selected`;
      
      // Update pricing
      const totalNights = nights;
      const subtotal = NIGHTLY_RATE * totalNights;
      const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
      
      nightsCalculation.textContent = `₱${NIGHTLY_RATE.toLocaleString()} x ${totalNights} nights`;
      totalNightsPrice.textContent = `₱${subtotal.toLocaleString()}`;
      serviceFee.textContent = `₱${serviceFeeAmount.toLocaleString()}`;
      pricingDetails.classList.remove('hidden');
      totalPrice.textContent = `₱${(subtotal + serviceFeeAmount).toLocaleString()}`;

      // Close calendar after selection is complete
      setTimeout(() => {
        calendarModal.classList.add('hidden');
        calendarModal.classList.remove('flex');
      }, 500);
    } else {
      // If selected date is before check-in, reset and start over
      selectedCheckIn = selectedDate;
      selectedCheckOut = null;
      checkInInput.value = formatDate(selectedDate);
      checkOutInput.value = '';
      nightsSelected.textContent = '';
      pricingDetails.classList.add('hidden');
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

// Booking Functions
async function saveBooking() {
  try {
    const guestsSelect = document.querySelector('select');
    const guests = guestsSelect.options[guestsSelect.selectedIndex].text;
    const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
    const subtotal = NIGHTLY_RATE * nights;
    const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
    const total = subtotal + serviceFeeAmount;

    const bookingData = {
      checkIn: Timestamp.fromDate(selectedCheckIn),
      checkOut: Timestamp.fromDate(selectedCheckOut),
      guests,
      nightlyRate: NIGHTLY_RATE,
      numberOfNights: nights,
      subtotal,
      serviceFee: serviceFeeAmount,
      totalPrice: total,
      status: 'pending',
      createdAt: Timestamp.fromDate(new Date()),
      propertyDetails: {
        name: 'Mountain View Lodge',
        location: 'Tagaytay, Philippines'
      }
    };

    console.log('Attempting to save booking with data:', bookingData);
    
    const bookingId = await addBooking(bookingData);
    if (!bookingId) throw new Error('Failed to get booking ID');
    
    console.log('Booking saved successfully with ID:', bookingId);
    localStorage.setItem('currentBookingId', bookingId);
    
    return bookingId;
  } catch (error) {
    console.error('Error in saveBooking:', error);
    throw error;
  }
}

async function handleReserveClick(event) {
  event.preventDefault();

  try {
    if (!selectedCheckIn || !selectedCheckOut) {
      alert('Please select check-in and check-out dates');
      return;
    }

    const bookingId = await saveBooking();
    if (bookingId) {
      window.location.href = `pay.html?bookingId=${encodeURIComponent(bookingId)}`;
    } else {
      throw new Error('Failed to create booking');
    }
  } catch (error) {
    console.error('Error handling reserve click:', error);
    alert('There was an error processing your booking. Please try again.');
  }
}

// User Drawer Functions
function initializeUserDrawer() {
  const userIcon = document.querySelector('.ri-user-line');
  const userDrawer = document.getElementById('userDrawer');
  const closeDrawer = document.getElementById('closeDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');

  // Only initialize if all required elements are present
  if (userIcon && userDrawer && closeDrawer && drawerOverlay) {
    function closeUserDrawer() {
      userDrawer.classList.add('translate-x-full');
      drawerOverlay.classList.add('hidden');
    }

    userIcon.addEventListener('click', () => {
      userDrawer.classList.remove('translate-x-full');
      drawerOverlay.classList.remove('hidden');
    });

    closeDrawer.addEventListener('click', closeUserDrawer);
    drawerOverlay.addEventListener('click', closeUserDrawer);
  } else {
    console.warn('User drawer elements not found, skipping initialization');
  }
}

// Event Listeners
function initializeEventListeners() {
  // Calendar related listeners
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

  calendarModal.addEventListener('click', (e) => {
    if (e.target === calendarModal) {
      calendarModal.classList.add('hidden');
      calendarModal.classList.remove('flex');
    }
  });

  // Reserve button listener
  const reserveBtn = document.getElementById('reserve-btn');
  if (reserveBtn) {
    reserveBtn.addEventListener('click', handleReserveClick);
  } else {
    console.error('Reserve button not found');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  initializeUserDrawer();
  renderCalendar(currentDate);
});