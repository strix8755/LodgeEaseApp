import { auth, db, addBooking } from '../../AdminSide/firebase.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { generateEmailTemplate } from './emailTemplate.js';

const paymentTypeInputs = document.querySelectorAll('input[name="payment_type"]');
const paymentMethodInputs = document.querySelectorAll('input[name="payment_method"]');
const confirmButton = document.getElementById('confirm-button');
const paymentSuccessModal = document.getElementById('payment-success-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

// Card input fields
const cardNumberInput = document.getElementById('card-number');
const cardExpirationInput = document.getElementById('card-expiration');
const cardCvvInput = document.getElementById('card-cvv');
const cardZipInput = document.getElementById('card-zip');
const cardCountrySelect = document.getElementById('card-country');

// Add constants to match lodge1.js
const NIGHTLY_RATE = 6500;
const SERVICE_FEE_PERCENTAGE = 0.14;

// Update verification function to use same constants
function verifyBookingCosts(bookingData) {
    if (!bookingData.nightlyRate || !bookingData.numberOfNights) {
        throw new Error('Invalid booking data: missing rate information');
    }

    // Recalculate using the same formula as lodge1.js
    const subtotal = NIGHTLY_RATE * bookingData.numberOfNights;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
    const totalPrice = subtotal + serviceFee;

    // Verify the calculations match
    if (bookingData.subtotal !== subtotal || 
        bookingData.serviceFee !== serviceFee || 
        bookingData.totalPrice !== totalPrice) {
        console.warn('Price mismatch detected, using recalculated values');
    }

    return {
        nightlyRate: NIGHTLY_RATE,
        subtotal,
        serviceFee,
        totalPrice
    };
}

function checkPaymentSelections() {
  const selectedPaymentType = document.querySelector('input[name="payment_type"]:checked');
  const selectedPaymentMethod = document.querySelector('input[name="payment_method"]:checked');

  // Check if payment method is card
  const isCardMethod = selectedPaymentMethod && selectedPaymentMethod.value === 'card';
  
  if (selectedPaymentType && selectedPaymentMethod) {
    // If card method, check if all card fields have some input
    if (isCardMethod) {
      const hasCardDetails = cardNumberInput.value.trim() !== '' &&
                             cardExpirationInput.value.trim() !== '' &&
                             cardCvvInput.value.trim() !== '' &&
                             cardZipInput.value.trim() !== '' &&
                             cardCountrySelect.value !== '';
      
      confirmButton.disabled = !hasCardDetails;
    } else {
      // For other payment methods, just need payment type and method
      confirmButton.disabled = false;
    }
  } else {
    confirmButton.disabled = true;
  }
}

paymentTypeInputs.forEach(input => {
  input.addEventListener('change', checkPaymentSelections);
});

paymentMethodInputs.forEach(input => {
  input.addEventListener('change', checkPaymentSelections);
});

// Add input event listeners for card fields
[cardNumberInput, cardExpirationInput, cardCvvInput, cardZipInput, cardCountrySelect].forEach(input => {
  input.addEventListener('input', checkPaymentSelections);
});

// Show payment success modal on confirm
confirmButton.addEventListener('click', () => {
  paymentSuccessModal.classList.remove('hidden');
});

// Close modal functionality
closeModalBtn.addEventListener('click', () => {
  paymentSuccessModal.classList.add('hidden');
  window.location.href = '../Dashboard/dashboard.html';
});

// Initial state
confirmButton.disabled = true;

// Consolidate booking data handling
function getBookingData() {
    const data = localStorage.getItem('bookingData');
    if (!data) return null;
    return JSON.parse(data);
}

// Single function to initialize page
function initializePage() {
    const bookingData = getBookingData();
    if (!bookingData) {
        window.location.href = '../Homepage/rooms.html';
        return;
    }

    try {
        const costs = verifyBookingCosts(bookingData);
        updateSummaryDisplay(bookingData, costs);
        updatePaymentAmounts(costs.totalPrice);
    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Error loading booking details. Please try again.');
        window.location.href = '../Homepage/rooms.html';
    }
}

function updateSummaryDisplay(bookingData, costs) {
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    document.getElementById('summary-checkin').textContent = formatDate(bookingData.checkIn);
    document.getElementById('summary-checkout').textContent = formatDate(bookingData.checkOut);
    document.getElementById('summary-guests').textContent = `${bookingData.guests} guest${bookingData.guests > 1 ? 's' : ''}`;
    document.getElementById('summary-nights').textContent = `${bookingData.numberOfNights} night${bookingData.numberOfNights > 1 ? 's' : ''}`;
    document.getElementById('summary-rate').textContent = `₱${NIGHTLY_RATE.toLocaleString()}`;
    document.getElementById('summary-subtotal').textContent = `₱${costs.subtotal.toLocaleString()}`;
    document.getElementById('summary-fee').textContent = `₱${costs.serviceFee.toLocaleString()}`;
    document.getElementById('summary-total').textContent = `₱${costs.totalPrice.toLocaleString()}`;
}

function updatePaymentAmounts(totalPrice) {
    document.getElementById('pay-now-amount').textContent = `₱${totalPrice.toLocaleString()}`;
    const firstPayment = Math.round(totalPrice * 0.562);
    const secondPayment = Math.round(totalPrice * 0.438);
    document.getElementById('pay-later-first').textContent = `₱${firstPayment.toLocaleString()}`;
    document.getElementById('pay-later-second').textContent = `₱${secondPayment.toLocaleString()}`;
}

async function sendBookingConfirmationEmail(bookingDetails, userEmail) {
    try {
        // Basic validation
        if (!userEmail || !bookingDetails?.bookingId) {
            console.error('Missing required email data');
            return false;
        }

        const functions = getFunctions();
        const sendEmail = httpsCallable(functions, 'sendBookingConfirmation');

        console.log('Attempting to send email:', {
            email: userEmail,
            bookingId: bookingDetails.bookingId
        });

        // Simple payload
        const result = await sendEmail({
            email: userEmail,
            bookingId: bookingDetails.bookingId
        });

        console.log('Email function result:', result);
        return result?.data?.success === true;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
}

// Update handlePaymentSuccess function
async function handlePaymentSuccess() {
    const user = auth.currentUser;
    if (!user?.email) {
        console.error('No user email available');
        alert('Please log in to complete your booking');
        return;
    }

    try {
        // Get booking data
        let bookingData = JSON.parse(localStorage.getItem('bookingData'));
        if (!bookingData) {
            throw new Error('No booking data found');
        }

        // Calculate final costs
        const costs = verifyBookingCosts(bookingData);
        const bookingId = `BK${Date.now()}`;

        // Create final booking with exact amounts
        const finalBooking = {
            id: bookingId,
            bookingId,
            userId: user.uid,
            userEmail: user.email,
            guestName: user.displayName || 'Guest',
            email: user.email,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            guests: parseInt(bookingData.guests) || 1,
            numberOfNights: parseInt(bookingData.numberOfNights) || 1,
            nightlyRate: costs.nightlyRate,
            serviceFee: costs.serviceFee,
            subtotal: costs.subtotal,
            totalPrice: costs.totalPrice,
            propertyDetails: {
                name: 'Pine Haven Lodge',
                location: 'Baguio City, Philippines',
                roomType: 'Deluxe Suite',
                roomNumber: bookingData.propertyDetails?.roomNumber || "304"
            },
            status: 'confirmed',
            bookingDate: new Date().toISOString(),
            timestamp: new Date()
        };

        // Save to Firestore
        await addBooking(finalBooking);
        
        // Save exact same data to localStorage
        localStorage.setItem('currentBooking', JSON.stringify(finalBooking));
        localStorage.removeItem('bookingData'); // Clear temporary booking data

        console.log('Booking saved successfully:', finalBooking);
        
        // Update modal message
        const modalMessage = document.querySelector('#payment-success-modal p');
        if (modalMessage) {
            modalMessage.innerHTML = `Payment of ₱${finalBooking.totalPrice.toLocaleString()} confirmed!<br>Booking ID: ${finalBooking.bookingId}`;
        }
        
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Error processing payment. Please try again.');
    }
}

// Add authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
        // Check for pending booking
        if (sessionStorage.getItem('pendingBooking')) {
            sessionStorage.removeItem('pendingBooking');
            handlePaymentSuccess();
        }
    } else {
        console.log('No user is signed in');
    }
});

// Add this to your existing payment button click handler
document.getElementById('confirm-button').addEventListener('click', function() {
    // ... existing payment processing code ...
    handlePaymentSuccess();
});

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    initializePaymentListeners();
});