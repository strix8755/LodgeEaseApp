import { register } from '../../AdminSide/firebase.js';

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.querySelector('form');
    const fullnameInput = document.getElementById('fullname');
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    // Function to show error state
    function showError(element, message) {
        element.classList.add('input-error');
        const errorDiv = document.querySelector('.error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // Function to clear error state
    function clearError(element) {
        element.classList.remove('input-error');
        const errorDiv = document.querySelector('.error-message');
        errorDiv.style.display = 'none';
    }

    // Add input event listeners to clear errors when user types
    [fullnameInput, emailInput, usernameInput, passwordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form values
        const fullname = fullnameInput.value.trim();
        const email = emailInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Clear previous messages
        const errorMessage = document.querySelector('.error-message');
        const successMessage = document.querySelector('.success-message');
        errorMessage.textContent = '';
        successMessage.textContent = '';

        // Enhanced validation
        if (!fullname) {
            showError(fullnameInput, 'Please enter your full name');
            return;
        }

        if (!email) {
            showError(emailInput, 'Please enter your email address');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError(emailInput, 'Please enter a valid email address');
            return;
        }

        if (!username) {
            showError(usernameInput, 'Please enter a username');
            return;
        }

        // Username format validation (alphanumeric and underscores only)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            showError(usernameInput, 'Username can only contain letters, numbers, and underscores');
            return;
        }

        if (password.length < 6) {
            showError(passwordInput, 'Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showError(confirmPasswordInput, 'Passwords do not match');
            return;
        }

        try {
            console.log('Attempting to register with:', { email, username }); // Debug log
            
            // Attempt to register
            await register(email, password, username, fullname);
            
            // Show success message
            successMessage.textContent = 'Account created successfully! Redirecting to login...';
            successMessage.style.display = 'block';

            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error); // Debug log
            
            // Handle specific error messages
            let errorMsg = error.message;
            
            if (error.message.includes('email-already-in-use')) {
                showError(emailInput, 'This email is already registered. Please use a different email.');
            } else if (error.message.includes('username-already-exists')) {
                showError(usernameInput, 'This username is already taken. Please choose another.');
            } else if (error.message.includes('invalid-email')) {
                showError(emailInput, 'Please enter a valid email address.');
            } else if (error.message.includes('weak-password')) {
                showError(passwordInput, 'Password should be at least 6 characters long.');
            } else {
                showError(emailInput, 'An error occurred during registration. Please try again.');
            }
        }
    });
}); 