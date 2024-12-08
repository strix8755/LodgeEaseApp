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

let currentDate = new Date(2025, 0, 1); // January 2025
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

function redirectToPay() {
  // Get the check-in and check-out dates
  const checkInDate = document.getElementById('check-in-date').value;
  const checkOutDate = document.getElementById('check-out-date').value;
  
  // Get the number of guests
  const guestsSelect = document.querySelector('select');
  const guests = guestsSelect.options[guestsSelect.selectedIndex].text;
  
  // Get the total price
  const totalPrice = document.getElementById('total-price').textContent;
  
  // Create a URL with query parameters
  const payUrl = `pay.html?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}&guests=${encodeURIComponent(guests)}&total=${encodeURIComponent(totalPrice)}`;
  
  // Redirect to pay page
  window.location.href = payUrl;
}

document.addEventListener('DOMContentLoaded', function() {
  const userIcon = document.querySelector('.ri-user-line');
  const userDrawer = document.getElementById('userDrawer');
  const closeDrawer = document.getElementById('closeDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');

  // Open drawer
  userIcon.addEventListener('click', function() {
    userDrawer.classList.remove('translate-x-full');
    drawerOverlay.classList.remove('hidden');
  });

  // Close drawer
  closeDrawer.addEventListener('click', closeUserDrawer);
  drawerOverlay.addEventListener('click', closeUserDrawer);

  function closeUserDrawer() {
    userDrawer.classList.add('translate-x-full');
    drawerOverlay.classList.add('hidden');
  }
});