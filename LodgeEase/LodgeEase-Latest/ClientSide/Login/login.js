// login.js
import { signIn } from './firebase.js';

document.querySelector('form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent default form submission

    // Get input values
    const email = document.getElementById('username').value; // Assuming 'username' is the email field
    const password = document.getElementById('password').value;

    // Get message display elements
    const errorMessage = document.querySelector('.error-message');
    const successMessage = document.querySelector('.success-message');
    const loadingIndicator = document.querySelector('.loading');

    // Clear previous messages
    errorMessage.textContent = '';
    successMessage.textContent = '';

    // Show loading indicator
    loadingIndicator.innerHTML = '<div class="spinner"></div>';

    try {
        // Attempt sign-in with Firebase Authentication
        const user = await signIn(email, password);

        // Successful login
        successMessage.textContent = 'Login successful! Redirecting...';
        loadingIndicator.innerHTML = '';

        // Redirect to dashboard
        window.location.href = '../Homepage/rooms.html';
    } catch (error) {
        // Handle login errors
        errorMessage.textContent = `Error: ${error.message}`;
        loadingIndicator.innerHTML = '';
    }
});
