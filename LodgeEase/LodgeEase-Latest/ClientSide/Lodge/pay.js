import { auth, db, addBooking } from '../../AdminSide/firebase.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
});

// Initial state
confirmButton.disabled = true;

function populateBookingSummary() {
    const bookingData = JSON.parse(localStorage.getItem('bookingData'));
    if (bookingData) {
        // Format dates correctly, handling both Timestamp and regular Date objects
        const formatDate = (dateObj) => {
            if (dateObj.seconds) {
                return new Date(dateObj.seconds * 1000).toLocaleDateString();
            } else {
                return new Date(dateObj).toLocaleDateString();
            }
        };

        document.getElementById('summary-checkin').textContent = formatDate(bookingData.checkIn);
        document.getElementById('summary-checkout').textContent = formatDate(bookingData.checkOut);
        document.getElementById('summary-guests').textContent = bookingData.guests;
        document.getElementById('summary-nights').textContent = `${bookingData.numberOfNights} nights`;
        document.getElementById('summary-rate').textContent = `₱${bookingData.nightlyRate.toLocaleString()}`;
        document.getElementById('summary-fee').textContent = `₱${bookingData.serviceFee.toLocaleString()}`;
        document.getElementById('summary-total').textContent = `₱${bookingData.totalPrice.toLocaleString()}`;
    } else {
        console.error('No booking data found in localStorage');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    populateBookingSummary();
    
    // Get stored booking data
    const bookingData = JSON.parse(localStorage.getItem('bookingData'));
    
    if (bookingData && bookingData.totalPrice) {
        try {
            const totalAmount = bookingData.totalPrice;
            const firstPayment = totalAmount * 0.562; // 56.2% of total
            const secondPayment = totalAmount * 0.438; // 43.8% of total

            document.getElementById('pay-now-amount').textContent = `₱${totalAmount.toLocaleString()}`;
            document.getElementById('pay-later-first').textContent = `₱${firstPayment.toLocaleString()}`;
            document.getElementById('pay-later-second').textContent = `₱${secondPayment.toLocaleString()}`;

            // Update success modal amount
            const successAmount = document.querySelector('#payment-success-modal p');
            if (successAmount) {
                successAmount.textContent = `Your payment of ₱${totalAmount.toLocaleString()} has been processed successfully.`;
            }
        } catch (error) {
            console.error('Error loading booking details:', error);
            alert('Error loading booking details. Please try again.');
        }
    }
});

// Add this after payment success
async function handlePaymentSuccess() {
    const user = auth.currentUser;

    if (!user) {
        console.error('No user logged in');
        return;
    }

    try {
        // Get the booking data from localStorage
        const bookingData = JSON.parse(localStorage.getItem('bookingData'));
        if (!bookingData) {
            throw new Error('No booking data found');
        }

        // Create the final booking object with all required fields
        const finalBooking = {
            userId: user.uid,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            guests: parseInt(bookingData.guests) || 1,
            numberOfNights: parseInt(bookingData.numberOfNights) || 1,
            nightlyRate: parseFloat(bookingData.nightlyRate) || 0,
            serviceFee: parseFloat(bookingData.serviceFee) || 0,
            totalPrice: parseFloat(bookingData.totalPrice) || 0,
            propertyDetails: {
                name: 'Pine Haven Lodge',
                location: 'Baguio City, Philippines',
                roomType: 'Deluxe Suite',
                roomNumber: bookingData.propertyDetails?.roomNumber || "304"
            },
            status: 'confirmed',
            rating: 0
        };

        // Save to Firestore using the imported addBooking function
        await addBooking(finalBooking);

        // Update the booking in localStorage with the final version
        localStorage.setItem('currentBooking', JSON.stringify(finalBooking));
        
        // Clear the temporary booking data
        localStorage.removeItem('bookingData');

        // Show success modal
        const modal = document.getElementById('payment-success-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
            window.location.href = '../Dashboard/dashboard.html';
        }, 2000);
    } catch (error) {
        console.error('Error saving booking:', error);
        alert('There was an error saving your booking. Please try again or contact support.');
    }
}

// Add this to your existing payment button click handler
document.getElementById('confirm-button').addEventListener('click', function() {
    // ... existing payment processing code ...
    handlePaymentSuccess();
});