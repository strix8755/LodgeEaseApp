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