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
        document.getElementById('summary-checkin').textContent = new Date(bookingData.checkIn.seconds * 1000).toLocaleDateString();
        document.getElementById('summary-checkout').textContent = new Date(bookingData.checkOut.seconds * 1000).toLocaleDateString();
        document.getElementById('summary-guests').textContent = bookingData.guests;
        document.getElementById('summary-nights').textContent = `${bookingData.numberOfNights} nights`;
        document.getElementById('summary-rate').textContent = `₱${bookingData.nightlyRate.toLocaleString()}`;
        document.getElementById('summary-fee').textContent = `₱${bookingData.serviceFee.toLocaleString()}`;
        document.getElementById('summary-total').textContent = `₱${bookingData.totalPrice.toLocaleString()}`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    populateBookingSummary();
    // Get booking ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    
    // Get stored booking data
    const storedBookingId = localStorage.getItem('currentBookingId');
    
    if (bookingId && bookingId === storedBookingId) {
        try {
            // Update payment amount displays
            const payNowLabel = document.querySelector('input[value="pay_now"]').parentElement.querySelector('span');
            const payLaterLabel = document.querySelector('input[value="pay_later"]').parentElement.querySelector('span');
            
            // Get total price from localStorage or calculate it
            const totalPrice = localStorage.getItem('totalPrice');
            if (totalPrice) {
                payNowLabel.textContent = `Pay ₱${parseFloat(totalPrice).toLocaleString()} now`;
                payLaterLabel.textContent = `Pay ₱${parseFloat(totalPrice).toLocaleString()} at property`;
            }

            // Update success modal amount
            const successAmount = document.querySelector('#payment-success-modal p');
            if (successAmount) {
                successAmount.textContent = `Your payment of ₱${parseFloat(totalPrice).toLocaleString()} has been processed successfully.`;
            }
        } catch (error) {
            console.error('Error loading booking details:', error);
            alert('Error loading booking details. Please try again.');
        }
    } else {
        // Redirect to home if no valid booking
        window.location.href = '../Homepage/rooms.html';
    }
});

// Add this after payment success
function handlePaymentSuccess() {
    // Get booking details from the summary
    const bookingDetails = {
        checkIn: document.getElementById('summary-checkin').textContent,
        checkOut: document.getElementById('summary-checkout').textContent,
        guests: document.getElementById('summary-guests').textContent,
        nights: document.getElementById('summary-nights').textContent,
        rate: document.getElementById('summary-rate').textContent,
        total: document.getElementById('summary-total').textContent,
        roomNumber: "304", // This should be dynamically assigned
        timestamp: new Date().toISOString()
    };

    // Store booking details in localStorage
    localStorage.setItem('currentBooking', JSON.stringify(bookingDetails));

    // Show success modal
    const modal = document.getElementById('payment-success-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
        window.location.href = '../Dashboard/Dashboard.html';
    }, 2000);
}

// Add this to your existing payment button click handler
document.getElementById('confirm-button').addEventListener('click', function() {
    // ... existing payment processing code ...
    handlePaymentSuccess();
});