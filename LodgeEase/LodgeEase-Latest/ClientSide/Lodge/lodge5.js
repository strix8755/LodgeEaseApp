// lodge5.js
import { auth, db } from '../../AdminSide/firebase.js';
import { initializeUserDrawer } from '../components/userDrawer.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeLodgeDetails();
    initializeBooking();
    initializeGallery();
    initializeReviews();
});
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

const lodgeImages = [
    '../components/1.jpg',
    '../components/2.jpg',  // Add additional lodge images here
    '../components/3.jpg',
    '../components/4.jpg',
];

function initializeGallery() {
    // Create gallery modal container
    const galleryModal = document.createElement('div');
    galleryModal.id = 'galleryModal';
    galleryModal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[100] hidden flex-col justify-center items-center p-4';
    
    // Create modal content
    const modalContent = `
        <button id="closeGalleryBtn" class="absolute top-4 right-4 text-white text-3xl">&times;</button>
        <div id="mainImageContainer" class="w-full max-w-4xl mb-4">
            <img id="mainGalleryImage" src="" alt="Lodge Gallery" class="w-full h-[70vh] object-contain">
        </div>
        <div id="thumbnailContainer" class="flex justify-center space-x-2 max-w-4xl overflow-x-auto">
            ${lodgeImages.map((img, index) => `
                <img src="${img}" alt="Thumbnail ${index + 1}" 
                     class="w-20 h-20 object-cover cursor-pointer thumbnail-image ${index === 0 ? 'border-2 border-blue-500' : ''}")>
            `).join('')}
        </div>
    `;
    
    galleryModal.innerHTML = modalContent;
    document.body.appendChild(galleryModal);
    


    // Get main image and thumbnail elements
    const mainImage = galleryModal.querySelector('#mainGalleryImage');
    const thumbnails = galleryModal.querySelectorAll('.thumbnail-image');
    const closeButton = galleryModal.querySelector('#closeGalleryBtn');

    // Set initial main image
    mainImage.src = lodgeImages[0];

    // Attach click event to main lodge image
    const lodgeMainImage = document.querySelector('.h-96 img');
    lodgeMainImage.classList.add(
        'cursor-pointer', 
        'transition', 
        'duration-300', 
        'hover:opacity-75',  // Slight opacity change on hover
        'relative'  // For positioning overlay
    );

    // Create and add overlay indicator
    const overlayIndicator = document.createElement('div');
    overlayIndicator.innerHTML = `
        <div id="galleryOverlay" class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition duration-300 bg-black bg-opacity-30 cursor-pointer">
            <div class="text-white text-lg font-semibold flex items-center">
                <i class="ri-image-line mr-2"></i>
                View Gallery
            </div>
        </div>
    `;

    lodgeMainImage.parentNode.insertBefore(overlayIndicator.firstElementChild, lodgeMainImage.nextSibling);

    const galleryOverlay = document.getElementById('galleryOverlay');
    galleryOverlay.addEventListener('click', () => {
        const galleryModal = document.getElementById('galleryModal');
        galleryModal.classList.remove('hidden');
        galleryModal.classList.add('flex');
    });

    // Close gallery modal
    closeButton.addEventListener('click', () => {
        galleryModal.classList.remove('flex');
        galleryModal.classList.add('hidden');
    });

    // Click outside to close
    galleryModal.addEventListener('click', (e) => {
        if (e.target === galleryModal) {
            galleryModal.classList.remove('flex');
            galleryModal.classList.add('hidden');
        }
    });

    // Thumbnail click events
    thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', () => {
            // Remove border from all thumbnails
            thumbnails.forEach(t => t.classList.remove('border-2', 'border-blue-500'));
            
            // Add border to selected thumbnail
            thumbnail.classList.add('border-2', 'border-blue-500');
            
            // Update main image
            mainImage.src = lodgeImages[index];
        });
    });
}

// Ensure this is called when the DOM is loaded
// Initialize user drawer with proper elements
const userIcon = document.getElementById('userIconBtn');
const userDrawer = document.getElementById('userDrawer');
const closeDrawer = document.getElementById('closeDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

if (userIcon && userDrawer && closeDrawer && drawerOverlay) {
    // Open drawer
    userIcon.addEventListener('click', function(e) {
        e.preventDefault();
        userDrawer.classList.remove('translate-x-full');
        drawerOverlay.classList.remove('hidden');
    });

    // Close drawer
    closeDrawer.addEventListener('click', closeUserDrawer);
    drawerOverlay.addEventListener('click', closeUserDrawer);
}

function closeUserDrawer() {
    userDrawer.classList.add('translate-x-full');
    drawerOverlay.classList.add('hidden');
}

// Initialize the user drawer with auth and db
initializeUserDrawer(auth, db);
