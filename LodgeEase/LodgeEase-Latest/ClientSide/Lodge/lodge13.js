import { db, auth, addBooking } from '../../AdminSide/firebase.js';
import { doc, getDoc, collection, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Constants for pricing - updated for Ever Lodge
const STANDARD_RATE = 1300; // ₱1,300 per night standard rate
const NIGHT_PROMO_RATE = 580; // ₱580 per night night promo rate
const SERVICE_FEE_PERCENTAGE = 0.14; // 14% service fee
const WEEKLY_DISCOUNT = 0.10; // 10% weekly discount

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
const promoDiscountRow = document.getElementById('promo-discount-row');
const promoDiscount = document.getElementById('promo-discount');
let serviceFee = document.getElementById('service-fee');
let checkInTime = document.getElementById('check-in-time');

let currentDate = new Date(); // Current date
let selectedCheckIn = null;
let selectedCheckOut = null;

// Initialize timeslot selection to determine rate
function initializeTimeSlotSelector() {
  if (checkInTime) {
    checkInTime.addEventListener('change', function() {
      updatePriceCalculation();
    });
  }
}

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

      // Calculate nights and update pricing
      updatePriceCalculation();
    } else {
      // If selected date is before check-in, reset and start over
      selectedCheckIn = selectedDate;
      selectedCheckOut = null;
      checkInInput.value = formatDate(selectedDate);
      checkOutInput.value = '';
    }
  }

  renderCalendar(currentDate);
  
  // Check if night promo is eligible after date selection
  if (selectedCheckIn && selectedCheckOut) {
    updatePromoEligibility();
  }
}

// Updated function to calculate pricing based on rate and nights
function updatePriceCalculation() {
  if (!selectedCheckIn || !selectedCheckOut) return;
  
  const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
  nightsSelected.textContent = `${nights} nights selected`;
  
  // Check if eligible for night promo - updated to allow any one-night stay
  // Night promo is valid for any 1-night stay
  const isPromoEligible = nights === 1;
  
  // Get the night promo option element
  const nightPromoOption = document.querySelector('option[value="night-promo"]');
  
  if (nightPromoOption) {
    if (isPromoEligible) {
      nightPromoOption.disabled = false;
      nightPromoOption.textContent = "Night Promo (10:00 PM - 8:00 AM) - Available!";
    } else {
      // If currently selected but not eligible, switch to standard
      if (checkInTime && checkInTime.value === 'night-promo') {
        checkInTime.value = 'standard';
      }
      nightPromoOption.disabled = true;
      nightPromoOption.textContent = "Night Promo (Not Available - Requires 1-night stay)";
    }
  }
  
  // Get rate based on check-in time selection
  const isPromoRate = isPromoEligible && checkInTime && checkInTime.value === 'night-promo';
  const nightlyRate = isPromoRate ? NIGHT_PROMO_RATE : STANDARD_RATE;

  // Update promo banner visibility
  const promoBanner = document.getElementById('promo-banner');
  if (promoBanner) {
    if (isPromoEligible) {
      promoBanner.classList.remove('hidden');
    } else {
      promoBanner.classList.add('hidden');
    }
  }
  
  // Apply weekly discount if applicable
  let subtotal = nightlyRate * nights;
  let discountAmount = 0;
  
  if (nights >= 7) {
    discountAmount = subtotal * WEEKLY_DISCOUNT;
    subtotal -= discountAmount;
  }
  
  const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
  const totalAmount = subtotal + serviceFeeAmount;
  
  // Update UI
  nightsCalculation.textContent = `₱${nightlyRate.toLocaleString()} x ${nights} nights`;
  totalNightsPrice.textContent = `₱${(nightlyRate * nights).toLocaleString()}`;
  
  // Show/hide discount row based on whether discount applies
  if (promoDiscountRow && promoDiscount) {
    if (nights >= 7 || isPromoRate) {
      promoDiscountRow.classList.remove('hidden');
      const description = nights >= 7 ? 'Weekly Discount' : 'Night Promo Discount';
      promoDiscountRow.querySelector('span:first-child').textContent = description;
      promoDiscount.textContent = `-₱${discountAmount.toLocaleString()}`;
    } else {
      promoDiscountRow.classList.add('hidden');
    }
  }
  
  serviceFee.textContent = `₱${serviceFeeAmount.toLocaleString()}`;
  pricingDetails.classList.remove('hidden');
  totalPrice.textContent = `₱${totalAmount.toLocaleString()}`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

// Event Listeners
function setupCalendarListeners() {
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

  // Close calendar when clicking outside
  calendarModal?.addEventListener('click', (e) => {
    if (e.target === calendarModal) {
      calendarModal.classList.add('hidden');
      calendarModal.classList.remove('flex');
    }
  });
}

// Add check for promo eligibility when the page loads or dates change
function updatePromoEligibility() {
  const promoBanner = document.getElementById('promo-banner');
  const nightPromoOption = document.querySelector('option[value="night-promo"]');
  
  if (promoBanner) {
    // By default, hide the promo banner until valid dates are selected
    promoBanner.classList.add('hidden');
  }
  
  if (nightPromoOption) {
    nightPromoOption.disabled = true;
    nightPromoOption.textContent = "Night Promo (Not Available - Requires 1-night stay)";
  }
  
  if (selectedCheckIn && selectedCheckOut) {
    const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
    
    // Updated to allow any one-night stay
    const isPromoEligible = nights === 1;
    
    if (isPromoEligible && promoBanner) {
      promoBanner.classList.remove('hidden');
    }
    
    if (nightPromoOption) {
      nightPromoOption.disabled = !isPromoEligible;
      if (isPromoEligible) {
        nightPromoOption.textContent = "Night Promo (10:00 PM - 8:00 AM) - Available!";
      }
    }
  }
}

function updateDateInputs() {
  if (checkInInput && selectedCheckIn) {
    checkInInput.value = formatDate(selectedCheckIn);
  }
  if (checkOutInput && selectedCheckOut) {
    checkOutInput.value = formatDate(selectedCheckOut);
  }
}

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

        // Check if user is logged in
        const user = auth.currentUser;
        
        // Validate contact number
        const contactNumber = document.getElementById('guest-contact').value.trim();
        if (!contactNumber) {
            alert('Please enter your contact number');
            return;
        }
        if (!/^[0-9]{11}$/.test(contactNumber)) {
            alert('Please enter a valid 11-digit contact number');
            return;
        }

        // Validate guests
        const guests = document.getElementById('guests').value;
        if (!guests || guests < 1 || guests > 4) {
            alert('Please select a valid number of guests');
            return;
        }

        // Validate dates
        if (!selectedCheckIn || !selectedCheckOut) {
            alert('Please select both check-in and check-out dates');
            return;
        }

        const nights = Math.round((selectedCheckOut - selectedCheckIn) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            alert('Check-out date must be after check-in date');
            return;
        }

        // If not logged in, save details and redirect
        if (!user) {
            const bookingDetails = {
                checkIn: selectedCheckIn,
                checkOut: selectedCheckOut,
                checkInTime: checkInTime ? checkInTime.value : 'standard',
                guests: guests,
                contactNumber: contactNumber
            };
            localStorage.setItem('pendingBooking', JSON.stringify(bookingDetails));
            
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `../Login/index.html?redirect=${returnUrl}`;
            return;
        }

        // Check if night promo is eligible - updated to allow any one-night stay
        const isPromoEligible = nights === 1;

        // Calculate costs based on selected rate and apply discounts
        const isPromoRate = isPromoEligible && checkInTime && checkInTime.value === 'night-promo';
        const nightlyRate = isPromoRate ? NIGHT_PROMO_RATE : STANDARD_RATE;
        let subtotal = nightlyRate * nights;
        let discountAmount = 0;
        
        // Apply weekly discount if applicable
        if (nights >= 7) {
            discountAmount = subtotal * WEEKLY_DISCOUNT;
            subtotal -= discountAmount;
        }
        
        const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
        const totalAmount = subtotal + serviceFeeAmount;

        // Create booking data object with all necessary details
        const bookingData = {
            checkIn: selectedCheckIn.toISOString(),
            checkOut: selectedCheckOut.toISOString(),
            checkInTime: checkInTime ? checkInTime.value : 'standard',
            guests: Number(guests),
            contactNumber: contactNumber,
            numberOfNights: nights,
            nightlyRate: nightlyRate,
            subtotal: subtotal,
            serviceFee: serviceFeeAmount,
            totalPrice: totalAmount,
            propertyDetails: {
                name: 'Ever Lodge',
                location: 'Baguio City, Philippines',
                roomType: 'Premium Suite',
                roomNumber: "205",
                floorLevel: "2"
            }
        };

        // Save to localStorage
        localStorage.setItem('bookingData', JSON.stringify(bookingData));

        // Redirect to payment page
        window.location.href = '../paymentProcess/pay.html';

    } catch (error) {
        console.error('Error in handleReserveClick:', error);
        alert('An error occurred while processing your reservation. Please try again.');
    }
}

// Add subtle animation to promo banner
function addPromoBannerAnimation() {
  const promoBanner = document.querySelector('#promo-banner');
  if (promoBanner) {
    // Add a subtle pulse animation
    setInterval(() => {
      promoBanner.classList.add('scale-105');
      setTimeout(() => {
        promoBanner.classList.remove('scale-105');
      }, 1000);
    }, 5000);
  }
}

// Update the event listener setup
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded for Ever Lodge');
        
        // Initialize time slot selector
        initializeTimeSlotSelector();
        updatePromoEligibility();
        
        // Initialize calendar on page load
        if (calendarGrid) {
            renderCalendar(currentDate);
        }
        
        // Set up calendar event listeners
        setupCalendarListeners();
        
        // Check if there's a pending booking after login
        const pendingBooking = localStorage.getItem('pendingBooking');
        if (pendingBooking && auth.currentUser) {
            const bookingDetails = JSON.parse(pendingBooking);
            
            // Restore the booking details
            selectedCheckIn = new Date(bookingDetails.checkIn);
            selectedCheckOut = new Date(bookingDetails.checkOut);
            document.querySelector('select#guests').value = bookingDetails.guests;
            document.getElementById('guest-contact').value = bookingDetails.contactNumber;
            
            // Restore check-in time selection if it exists
            if (bookingDetails.checkInTime && checkInTime) {
                checkInTime.value = bookingDetails.checkInTime;
            }
            
            // Update the display
            updateDateInputs();
            updatePriceCalculation();
            
            // Clear the pending booking
            localStorage.removeItem('pendingBooking');
        }
        
        // Add animation for promo banner
        addPromoBannerAnimation();
    } catch (error) {
        console.error('Error during initialization:', error);
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

  // Add auth state observer to handle login button visibility
  auth.onAuthStateChanged((user) => {
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
      if (user) {
        loginButton.classList.add('hidden'); // Hide login button if user is logged in
      } else {
        loginButton.classList.remove('hidden'); // Show login button if user is logged out
      }
    }
  });
});

