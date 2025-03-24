document.addEventListener('DOMContentLoaded', () => {
    initializeLodgeDetails();
    initializeBooking();
    initializeGallery();
    initializeReviews();
    initializeUserDrawer();
});

function initializeLodgeDetails() {
    // Initialize lodge-specific details
    const favoriteButton = document.querySelector('.ri-heart-line').parentElement;
    favoriteButton.addEventListener('click', () => {
        favoriteButton.querySelector('i').classList.toggle('ri-heart-line');
        favoriteButton.querySelector('i').classList.toggle('ri-heart-fill');
        favoriteButton.querySelector('i').classList.toggle('text-red-500');
    });
}

function initializeBooking() {
    // Set minimum dates for check-in and check-out
    const today = new Date().toISOString().split('T')[0];
    const checkIn = document.querySelector('input[type="date"]:first-of-type');
    const checkOut = document.querySelector('input[type="date"]:last-of-type');
    
    checkIn.min = today;
    checkIn.addEventListener('change', () => {
        checkOut.min = checkIn.value;
        if (checkOut.value && checkOut.value <= checkIn.value) {
            const nextDay = new Date(checkIn.value);
            nextDay.setDate(nextDay.getDate() + 1);
            checkOut.value = nextDay.toISOString().split('T')[0];
        }
    });
}

function initializeGallery() {
    // Initialize image gallery functionality
    // Add your gallery initialization code here
}

function initializeReviews() {
    // Initialize reviews functionality
    // Add your reviews initialization code here
}

function initializeUserDrawer() {
    const userButton = document.getElementById('userButton');
    const userDrawer = document.getElementById('userDrawer');
    
    userButton.addEventListener('click', () => {
        userDrawer.classList.toggle('translate-x-full');
    });

    document.addEventListener('click', (e) => {
        if (!userDrawer.contains(e.target) && !userButton.contains(e.target)) {
            userDrawer.classList.add('translate-x-full');
        }
    });
}

import { initializeUserDrawer } from '../components/userDrawer.js';
document.addEventListener('DOMContentLoaded', () => initializeUserDrawer(auth, db));

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