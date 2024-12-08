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