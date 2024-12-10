// login.js
import { signIn } from '../../AdminSide/firebase.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    const userInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
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

    // Input validation
    userInput.addEventListener('input', () => clearError(userInput));
    passwordInput.addEventListener('input', () => clearError(passwordInput));

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const userIdentifier = userInput.value.trim();
        const password = passwordInput.value;

        // Clear previous messages
        const errorMessage = document.querySelector('.error-message');
        const successMessage = document.querySelector('.success-message');
        errorMessage.textContent = '';
        successMessage.textContent = '';

        // Basic validation
        if (!userIdentifier) {
            showError(userInput, 'Please enter your email or username');
            return;
        }

        if (!password) {
            showError(passwordInput, 'Please enter your password');
            return;
        }

        try {
            // Attempt sign-in with Firebase Authentication
            const user = await signIn(userIdentifier, password);

            // Successful login
            successMessage.textContent = 'Login successful! Redirecting...';
            successMessage.style.display = 'block';

            // Store user info and login state in localStorage
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userName', user.displayName || 'User');

            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = '../Homepage/rooms.html';
            }, 1500);

        } catch (error) {
            // Handle specific error cases
            let errorMsg = '';
            switch (error.message) {
                case 'auth/user-not-found':
                    errorMsg = 'Account not found. Please check your username/email or sign up.';
                    showError(userInput, errorMsg);
                    break;
                case 'Firebase: Error (auth/wrong-password).':
                    errorMsg = 'Incorrect password. Please try again.';
                    showError(passwordInput, errorMsg);
                    break;
                case 'Firebase: Error (auth/invalid-email).':
                    errorMsg = 'Invalid email format. Please enter a valid email address.';
                    showError(userInput, errorMsg);
                    break;
                case 'Firebase: Error (auth/too-many-requests).':
                    errorMsg = 'Too many failed attempts. Please try again later.';
                    showError(passwordInput, errorMsg);
                    break;
                default:
                    errorMsg = 'An error occurred. Please try again.';
                    showError(userInput, errorMsg);
                    showError(passwordInput, errorMsg);
            }
        }
    });

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

function handleLogin(event) {
  event.preventDefault();
  // Your existing login validation code...
  
  if (loginSuccessful) {
    localStorage.setItem('isLoggedIn', 'true');
    window.location.href = '../Homepage/rooms.html';
  }
}

function handleLogout() {
  localStorage.removeItem('isLoggedIn');
  window.location.href = '../Homepage/rooms.html';
}