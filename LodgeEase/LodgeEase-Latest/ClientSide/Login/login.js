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

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // For demo purposes - in production, this should be a proper authentication
        if (username && password) {
            // Store user info in localStorage
            const userInfo = {
                name: username,
                email: username.includes('@') ? username : `${username}@example.com`,
                isLoggedIn: true
            };
            
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            // Redirect to rooms page
            window.location.href = '../Homepage/rooms.html';
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