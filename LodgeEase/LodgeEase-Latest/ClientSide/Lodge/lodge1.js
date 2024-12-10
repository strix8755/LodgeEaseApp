// Import the addBooking function from firebase.js
import { addBooking } from '../../AdminSide/firebase.js'; // Adjust the path if needed
import { Timestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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

async function saveBooking() {
  try {
    const guestsSelect = document.querySelector('select');
    const guests = guestsSelect.options[guestsSelect.selectedIndex].text;
    const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
    const subtotal = NIGHTLY_RATE * nights;
    const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
    const total = subtotal + serviceFeeAmount;

    // Add more booking details
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
        name: 'Pine Haven Lodge',
        location: 'Tagaytay, Philippines'
      },
      // Add these new fields
      roomNumber: 'A101',
      roomType: 'Deluxe Suite',
      floorLevel: '1st Floor',
      guestName: 'Guest' // This should be replaced with actual user data when authentication is implemented
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
  event.preventDefault(); // Prevent default form submission

  try {
    // Validate required fields
    if (!selectedCheckIn || !selectedCheckOut) {
      alert('Please select check-in and check-out dates');
      return;
    }

    // Save the booking
    const bookingId = await saveBooking();

    if (bookingId) {
      // Redirect to payment page with booking ID
      window.location.href = `pay.html?bookingId=${encodeURIComponent(bookingId)}`;
    } else {
      throw new Error('Failed to create booking');
    }
  } catch (error) {
    console.error('Error handling reserve click:', error);
    alert('There was an error processing your booking. Please try again.');
  }
}

// Add event listener to reserve button
document.addEventListener('DOMContentLoaded', () => {
  const reserveBtn = document.getElementById('reserve-btn');
  if (reserveBtn) {
    reserveBtn.addEventListener('click', handleReserveClick);
  } else {
    console.error('Reserve button not found');
  }
});
