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
  
    // Initialize new functionalities
    initializeSearch();
    initializePriceFilter();
    initializeFavorites();
    initializeSort();
    
    // Load saved favorites
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    savedFavorites.forEach(lodgeName => {
      const card = Array.from(document.querySelectorAll('.lodge-card'))
        .find(card => card.querySelector('h2').textContent === lodgeName);
      if (card) {
        const heartBtn = card.querySelector('.ri-heart-line');
        heartBtn.classList.remove('ri-heart-line');
        heartBtn.classList.add('ri-heart-fill');
        heartBtn.style.color = '#ef4444';
      }
    });
  
    initializeViewToggle();
    initializeCompare();
  
    // Add animation classes for filtering
    document.querySelectorAll('.lodge-card').forEach(card => {
      card.classList.add('transition-all', 'duration-300', 'transform');
    });
  
    initializeInfiniteScroll();
    initializeLodgeCards();
    initializeAllFilters();
    initializeResetFilter();
    checkLoginStatus();
    initializeLogout();
  });

function initializeSearch() {
  const searchInput = document.querySelector('input[type="text"]');
  const lodgeCards = document.querySelectorAll('.lodge-card');  // Add class="lodge-card" to your lodge card divs

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    lodgeCards.forEach(card => {
      const lodgeName = card.querySelector('h2').textContent.toLowerCase();
      const location = card.querySelector('.text-gray-500').textContent.toLowerCase();
      
      if (lodgeName.includes(searchTerm) || location.includes(searchTerm)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

function initializePriceFilter() {
  const priceSlider = document.querySelector('input[type="range"]');
  const priceDisplay = document.createElement('div');
  priceDisplay.classList.add('text-center', 'text-sm', 'text-gray-600', 'mt-2');
  priceSlider.parentNode.appendChild(priceDisplay);

  priceSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    priceDisplay.textContent = `Selected: ₱${value}`;
    
    // Filter lodge cards based on price
    document.querySelectorAll('.lodge-card').forEach(card => {
      const price = parseInt(card.querySelector('.text-green-600').textContent.replace(/[^0-9]/g, ''));
      card.style.display = price <= value ? 'block' : 'none';
    });
  });
}

function initializeFavorites() {
  const favoriteButtons = document.querySelectorAll('.ri-heart-line').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const button = e.target;
      
      // Toggle between filled and outline heart
      if (button.classList.contains('ri-heart-line')) {
        button.classList.remove('ri-heart-line');
        button.classList.add('ri-heart-fill');
        button.style.color = '#ef4444'; // Red color
      } else {
        button.classList.remove('ri-heart-fill');
        button.classList.add('ri-heart-line');
        button.style.color = '#22c55e'; // Back to green
      }
      
      // Here you would typically save to localStorage or backend
      saveFavorites();
    });
  });
}

function saveFavorites() {
  const favorites = Array.from(document.querySelectorAll('.ri-heart-fill')).map(btn => {
    return btn.closest('.lodge-card').querySelector('h2').textContent;
  });
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateSavedCount();
}

function initializeSort() {
  const sortSelect = document.querySelector('select');
  
  sortSelect.addEventListener('change', (e) => {
    const sortBy = e.target.value;
    const lodgeCards = Array.from(document.querySelectorAll('.lodge-card'));
    
    lodgeCards.sort((a, b) => {
      switch(sortBy) {
        case 'Price: Low to High':
          return getPriceFromCard(a) - getPriceFromCard(b);
        case 'Top Rated':
          return getRatingFromCard(b) - getRatingFromCard(a);
        default:
          return 0;
      }
    });
    
    const container = lodgeCards[0].parentNode;
    lodgeCards.forEach(card => container.appendChild(card));
  });
}

function getPriceFromCard(card) {
  return parseInt(card.querySelector('.text-green-600').textContent.replace(/[^0-9]/g, ''));
}

function getRatingFromCard(card) {
  return parseFloat(card.querySelector('.text-green-600.font-bold').textContent);
}

let map;
let markers = [];
const lodgeLocations = [
  {
    name: "Pine Haven Lodge",
    position: { lat: 16.4023, lng: 120.5960 },
    rating: 9.0,
    price: "₱2,500"
  },
  {
    name: "Cloud 9 Retreat",
    position: { lat: 16.4106, lng: 120.6013 },
    rating: 8.5,
    price: "₱3,200"
  },
  {
    name: "Baguio Pines View",
    position: { lat: 16.4080, lng: 120.5995 },
    rating: 8.8,
    price: "₱2,800"
  },
  {
    name: "Mountain Lodge",
    position: { lat: 16.4150, lng: 120.5920 },
    rating: 9.2,
    price: "₱3,500"
  },
  {
    name: "Session Road Suite",
    position: { lat: 16.4115, lng: 120.5967 },
    rating: 8.9,
    price: "₱2,900"
  }
];

async function initMap() {
  console.log('Initializing map...');
  try {
    const { Map, InfoWindow, Marker } = await google.maps.importLibrary("maps");
    console.log('Libraries loaded');

    map = new Map(document.getElementById("map"), {
      center: { lat: 16.4023, lng: 120.5960 },
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
    });
    console.log('Map created');

    // Add custom markers for lodges
    lodgeLocations.forEach(lodge => {
      const marker = new Marker({
        position: lodge.position,
        map: map,
        title: lodge.name,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Custom marker icon
          scaledSize: new google.maps.Size(32, 32)
        }
      });

      // Create info window with more detailed content
      const infoWindow = new InfoWindow({
        content: `
          <div class="p-4 min-w-[200px]">
            <h3 class="font-bold text-lg mb-2">${lodge.name}</h3>
            <div class="flex items-center mb-2">
              <span class="text-yellow-500 mr-1">★</span>
              <span class="font-semibold">${lodge.rating}</span>
              <span class="text-gray-500 text-sm ml-1">/10</span>
            </div>
            <p class="text-green-600 font-semibold mb-2">${lodge.price} per night</p>
            <button onclick="viewLodgeDetails('${lodge.name}')" class="text-blue-600 hover:underline text-sm">
              View Details
            </button>
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      markers.push(marker);
    });
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

// Toggle between map and list view
function initializeViewToggle() {
  const toggleBtn = document.getElementById('toggleView');
  const mapView = document.getElementById('mapView');
  const closeMap = document.getElementById('closeMap');

  toggleBtn.addEventListener('click', () => {
    mapView.classList.remove('hidden');
    // Trigger resize to fix map rendering
    google.maps.event.trigger(map, 'resize');
    fitBounds();
  });

  closeMap.addEventListener('click', () => {
    mapView.classList.add('hidden');
  });
}

// Add function to handle lodge details view
function viewLodgeDetails(lodgeName) {
  // Find the lodge card and scroll to it
  const lodgeCard = Array.from(document.querySelectorAll('.lodge-card'))
    .find(card => card.querySelector('h2').textContent === lodgeName);
  
  if (lodgeCard) {
    document.getElementById('mapView').classList.add('hidden');
    lodgeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lodgeCard.classList.add('highlight-card');
    setTimeout(() => lodgeCard.classList.remove('highlight-card'), 2000);
  }
}

// Initialize compare functionality
function initializeCompare() {
  const compareDrawer = document.getElementById('compareDrawer');
  const compareSlots = document.getElementById('compareLodges');
  const checkboxes = document.querySelectorAll('.compare-checkbox');
  const selectedLodges = new Set();

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const lodgeCard = e.target.closest('.lodge-card');
      const lodgeName = lodgeCard.querySelector('h2').textContent;

      if (e.target.checked) {
        if (selectedLodges.size >= 3) {
          e.target.checked = false;
          alert('You can compare up to 3 lodges at a time');
          return;
        }
        selectedLodges.add(lodgeName);
      } else {
        selectedLodges.delete(lodgeName);
      }

      updateCompareDrawer();
    });
  });

  function updateCompareDrawer() {
    if (selectedLodges.size > 0) {
      compareDrawer.style.transform = 'translateY(0)';
      compareSlots.innerHTML = Array.from(selectedLodges).map(lodge => `
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-bold mb-2">${lodge}</h4>
          <!-- Add more comparison details here -->
        </div>
      `).join('');
    } else {
      compareDrawer.style.transform = 'translateY(100%)';
    }
  }

  document.getElementById('closeCompare').addEventListener('click', () => {
    compareDrawer.style.transform = 'translateY(100%)';
    checkboxes.forEach(cb => cb.checked = false);
    selectedLodges.clear();
  });
}

// Add these map control functions
function toggleMarkerBounce() {
  markers.forEach(marker => {
    if (marker.getAnimation() !== null) {
      marker.setAnimation(null);
    } else {
      marker.setAnimation(google.maps.Animation.BOUNCE);
    }
  });
}

function fitBounds() {
  const bounds = new google.maps.LatLngBounds();
  markers.forEach(marker => bounds.extend(marker.getPosition()));
  map.fitBounds(bounds);
}

// Add these new functions
function initializeMapFilters() {
  const budgetInputs = document.querySelectorAll('input[type="number"]');
  const locationFilters = document.querySelectorAll('.form-checkbox');
  
  // Budget filter
  budgetInputs.forEach(input => {
    input.addEventListener('change', () => {
      const min = parseInt(budgetInputs[0].value) || 0;
      const max = parseInt(budgetInputs[1].value) || Infinity;
      
      markers.forEach((marker, index) => {
        const price = parseInt(lodgeLocations[index].price.replace(/[^0-9]/g, ''));
        marker.setVisible(price >= min && price <= max);
      });
    });
  });

  // Location filters
  const locations = {
    'Baguio City Proper': { lat: 16.4023, lng: 120.5960 },
    'Mines View Park': { lat: 16.4147, lng: 120.6324 },
    'Outlook Drive': { lat: 16.4086, lng: 120.6013 },
    'Camp John Hay': { lat: 16.4023, lng: 120.5960 },
    'Marcos Highway': { lat: 16.3987, lng: 120.5950 }
  };

  locationFilters.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const locationName = checkbox.nextElementSibling.querySelector('.font-medium').textContent;
      const center = locations[locationName];
      
      if (checkbox.checked) {
        map.setCenter(center);
        map.setZoom(15);
      }
    });
  });
}

// Make sure initMap is available globally
window.initMap = initMap;

// Add these variables at the top of your file
let page = 1;
let isLoading = false;
let hasMore = true;

// Add this function to handle infinite scroll
function initializeInfiniteScroll() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const mainContent = document.querySelector('main');
  
  // Create an Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    const target = entries[0];
    if (target.isIntersecting && !isLoading && hasMore) {
      loadMoreLodges();
    }
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0.1
  });

  // Observe the loading spinner
  observer.observe(loadingSpinner);
}

// Function to load more lodges
async function loadMoreLodges() {
  try {
    isLoading = true;
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.classList.remove('hidden');

    // Simulate API call with timeout
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Example lodge data - replace with your actual data fetching logic
    const newLodges = [
      {
        name: "Mountain View Resort",
        location: "Mines View Park, Baguio City",
        price: "₱2,800",
        rating: "8.8",
        reviews: "324",
        image: "../components/cloud9.jpg",
        amenities: [
          { icon: "ri-wifi-line", text: "Free Wi-Fi", color: "blue" },
          { icon: "ri-landscape-line", text: "Mountain View", color: "green" },
          { icon: "ri-car-line", text: "Free Parking", color: "purple" }
        ]
      },
      {
        name: "Baguio Hillside Inn",
        location: "Session Road, Baguio City",
        price: "₱2,200",
        rating: "8.5",
        reviews: "256",
        image: "../components/pinehaven.jpg",
        amenities: [
          { icon: "ri-restaurant-line", text: "Restaurant", color: "red" },
          { icon: "ri-wifi-line", text: "Free Wi-Fi", color: "blue" },
          { icon: "ri-24-hours-line", text: "24/7 Service", color: "green" }
        ]
      },
      {
        name: "The Forest Lodge",
        location: "Camp John Hay, Baguio City",
        price: "₱4,500",
        rating: "9.2",
        reviews: "512",
        image: "../components/cloud9.jpg",
        amenities: [
          { icon: "ri-hotel-line", text: "Luxury Rooms", color: "yellow" },
          { icon: "ri-goblet-line", text: "Bar & Lounge", color: "purple" },
          { icon: "ri-spa-line", text: "Spa Services", color: "blue" }
        ]
      },
      {
        name: "Burnham Suites",
        location: "Burnham Park, Baguio City",
        price: "₱3,300",
        rating: "8.7",
        reviews: "423",
        image: "../components/pinehaven.jpg",
        amenities: [
          { icon: "ri-bike-line", text: "Bike Rental", color: "green" },
          { icon: "ri-restaurant-2-line", text: "Café", color: "red" },
          { icon: "ri-parking-box-line", text: "Parking", color: "blue" }
        ]
      },
      {
        name: "Wright Park Heights",
        location: "Wright Park, Baguio City",
        price: "₱2,900",
        rating: "8.6",
        reviews: "289",
        image: "../components/cloud9.jpg",
        amenities: [
          { icon: "ri-shield-check-line", text: "Security", color: "blue" },
          { icon: "ri-breakfast-line", text: "Breakfast", color: "orange" },
          { icon: "ri-wifi-line", text: "Free Wi-Fi", color: "green" }
        ]
      },
      {
        name: "Skyline Lodge",
        location: "Outlook Drive, Baguio City",
        price: "₱3,800",
        rating: "9.0",
        reviews: "378",
        image: "../components/pinehaven.jpg",
        amenities: [
          { icon: "ri-landscape-line", text: "City View", color: "blue" },
          { icon: "ri-restaurant-line", text: "Restaurant", color: "red" },
          { icon: "ri-taxi-line", text: "Airport Shuttle", color: "yellow" }
        ]
      }
    ];

    // Add new lodges to the page
    const container = document.querySelector('main');
    newLodges.forEach(lodge => {
      container.insertAdjacentHTML('beforeend', createLodgeCard(lodge));
    });

    // Update page number and check if there's more content
    page++;
    hasMore = page < 8; // Show up to 8 pages of content

    // Initialize new lodge cards' functionality
    initializeFavorites();
    
  } catch (error) {
    console.error('Error loading more lodges:', error);
  } finally {
    isLoading = false;
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (!hasMore) {
      loadingSpinner.innerHTML = '<p class="text-gray-500">No more lodges to load</p>';
    } else {
      loadingSpinner.classList.add('hidden');
    }
  }
}

// Function to create lodge card HTML
function createLodgeCard(lodge) {
  return `
    <div class="bg-white shadow-md rounded-xl mb-6 overflow-hidden transition duration-300 hover:shadow-xl lodge-card">
      <div class="flex p-6">
        <div class="w-1/3 pr-6">
          <img 
            src="${lodge.image}" 
            alt="${lodge.name}" 
            class="w-full h-56 object-cover rounded-lg"
          >
        </div>
        <div class="w-2/3">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-xl font-bold text-gray-800">${lodge.name}</h2>
              <p class="text-sm text-gray-500 flex items-center">
                <i class="ri-map-pin-line mr-2"></i>${lodge.location}
              </p>
            </div>
            <div class="flex items-center space-x-2">
              <button class="text-green-500 hover:bg-green-50 p-2 rounded-full">
                <i class="ri-heart-line"></i>
              </button>
              <div class="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-semibold">
                ${lodge.price} per night
              </div>
            </div>
          </div>
          
          <div class="flex items-center mb-4">
            <div class="flex text-yellow-500 mr-2">
              ${createStarRating(lodge.rating)}
            </div>
            <span class="text-green-600 font-bold mr-2">${lodge.rating} Outstanding</span>
            <span class="text-gray-500 text-sm">(${lodge.reviews} reviews)</span>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-4">
            ${lodge.amenities.map(amenity => `
              <div class="bg-${amenity.color}-50 p-2 rounded-lg text-center">
                <i class="${amenity.icon} text-${amenity.color}-600 block mb-1"></i>
                <span class="text-xs">${amenity.text}</span>
              </div>
            `).join('')}
          </div>

          <div class="flex justify-between items-center">
            <a href="#" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              Book Now
            </a>
            <a href="#" class="text-green-600 hover:underline">
              View Details
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper function to create star rating HTML
function createStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '';
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += '<i class="ri-star-fill"></i>';
    } else if (i === fullStars && hasHalfStar) {
      stars += '<i class="ri-star-half-line"></i>';
    } else {
      stars += '<i class="ri-star-line"></i>';
    }
  }
  
  return stars;
}

// Add these new functions
function initializeLodgeCards() {
  const lodgeCards = document.querySelectorAll('.lodge-card');
  
  lodgeCards.forEach(card => {
    // Quick View functionality
    const viewDetailsBtn = card.querySelector('.view-details');
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showQuickView(card);
      });
    }

    // Image Gallery
    const lodgeImage = card.querySelector('img');
    if (lodgeImage) {
      lodgeImage.addEventListener('click', () => {
        showImageGallery(card);
      });
    }

    // Share functionality
    const shareBtn = card.querySelector('.share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showShareOptions(card);
      });
    }
  });
}

function showQuickView(card) {
  const quickView = document.createElement('div');
  quickView.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
  
  const content = `
    <div class="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-2xl font-bold">${card.querySelector('h2').textContent}</h2>
          <button class="close-quick-view text-gray-500 hover:text-gray-700">
            <i class="ri-close-line text-2xl"></i>
          </button>
        </div>
        
        <div class="grid grid-cols-2 gap-6">
          <div>
            <img src="${card.querySelector('img').src}" class="w-full h-80 object-cover rounded-lg">
            <div class="grid grid-cols-4 gap-2 mt-2">
              <!-- Thumbnail images would go here -->
            </div>
          </div>
          
          <div>
            <div class="mb-4">
              <h3 class="font-semibold mb-2">Description</h3>
              <p class="text-gray-600">Experience luxury and comfort in the heart of Baguio City. This lodge offers stunning mountain views and modern amenities.</p>
            </div>
            
            <div class="mb-4">
              <h3 class="font-semibold mb-2">Amenities</h3>
              <div class="grid grid-cols-2 gap-2">
                ${Array.from(card.querySelectorAll('.grid.grid-cols-3 .text-xs')).map(amenity => 
                  `<div class="flex items-center space-x-2">
                    <i class="ri-check-line text-green-500"></i>
                    <span>${amenity.textContent}</span>
                  </div>`
                ).join('')}
              </div>
            </div>
            
            <div class="mb-4">
              <h3 class="font-semibold mb-2">Location</h3>
              <p class="text-gray-600">${card.querySelector('.text-gray-500').textContent}</p>
              <div class="mt-2 h-40 bg-gray-100 rounded-lg">
                <!-- Mini map would go here -->
              </div>
            </div>
            
            <div class="flex justify-between items-center mt-6">
              <div>
                <p class="text-sm text-gray-500">Price per night</p>
                <p class="text-2xl font-bold text-green-600">${card.querySelector('.text-green-600').textContent}</p>
              </div>
              <a href="${card.querySelector('a').href}" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                Book Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  quickView.innerHTML = content;
  document.body.appendChild(quickView);
  
  // Close functionality
  quickView.querySelector('.close-quick-view').addEventListener('click', () => {
    quickView.remove();
  });
  
  quickView.addEventListener('click', (e) => {
    if (e.target === quickView) {
      quickView.remove();
    }
  });
}

function showImageGallery(card) {
  // Implementation for image gallery
  // You would need to add more images to each lodge card data
}

function showShareOptions(card) {
  const shareMenu = document.createElement('div');
  shareMenu.className = 'absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20';
  
  shareMenu.innerHTML = `
    <div class="py-2">
      <a href="#" class="flex items-center px-4 py-2 hover:bg-gray-100">
        <i class="ri-facebook-fill mr-3 text-blue-600"></i>
        Facebook
      </a>
      <a href="#" class="flex items-center px-4 py-2 hover:bg-gray-100">
        <i class="ri-twitter-fill mr-3 text-blue-400"></i>
        Twitter
      </a>
      <a href="#" class="flex items-center px-4 py-2 hover:bg-gray-100">
        <i class="ri-whatsapp-fill mr-3 text-green-500"></i>
        WhatsApp
      </a>
      <a href="#" class="flex items-center px-4 py-2 hover:bg-gray-100">
        <i class="ri-mail-fill mr-3 text-gray-600"></i>
        Email
      </a>
    </div>
  `;
  
  // Position the menu
  const buttonRect = card.querySelector('.share-btn').getBoundingClientRect();
  shareMenu.style.top = `${buttonRect.bottom + window.scrollY}px`;
  shareMenu.style.left = `${buttonRect.left}px`;
  
  document.body.appendChild(shareMenu);
  
  // Close menu when clicking outside
  const closeMenu = (e) => {
    if (!shareMenu.contains(e.target)) {
      shareMenu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

// Add these functions to handle the new filters
function initializeAllFilters() {
  initializePropertyTypeFilter();
  initializeGuestRatingFilter();
  initializeAmenitiesFilter();
  initializeRoomTypeFilter();
}

function initializePropertyTypeFilter() {
  const propertyTypeCheckboxes = document.querySelectorAll('[data-filter="property-type"] input[type="checkbox"]');
  
  propertyTypeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      applyFilters();
    });
  });
}

function initializeGuestRatingFilter() {
  const ratingCheckboxes = document.querySelectorAll('[data-filter="guest-rating"] input[type="checkbox"]');
  
  ratingCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      applyFilters();
    });
  });
}

function initializeAmenitiesFilter() {
  const amenityCheckboxes = document.querySelectorAll('[data-filter="amenities"] input[type="checkbox"]');
  
  amenityCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      applyFilters();
    });
  });
}

function initializeRoomTypeFilter() {
  const roomTypeCheckboxes = document.querySelectorAll('[data-filter="room-type"] input[type="checkbox"]');
  
  roomTypeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      applyFilters();
    });
  });
}

function applyFilters() {
  const lodgeCards = document.querySelectorAll('.lodge-card');
  const selectedFilters = {
    propertyTypes: getSelectedValues('[data-filter="property-type"] input:checked'),
    ratings: getSelectedValues('[data-filter="guest-rating"] input:checked').map(rating => parseFloat(rating)),
    amenities: getSelectedValues('[data-filter="amenities"] input:checked'),
    roomTypes: getSelectedValues('[data-filter="room-type"] input:checked')
  };

  lodgeCards.forEach(card => {
    const shouldShow = matchesFilters(card, selectedFilters);
    card.style.display = shouldShow ? 'block' : 'none';
    
    // Animate the transition
    if (shouldShow) {
      card.classList.add('fade-in');
      setTimeout(() => card.classList.remove('fade-in'), 300);
    }
  });

  updateResults(lodgeCards);
}

function getSelectedValues(selector) {
  return Array.from(document.querySelectorAll(selector))
    .map(checkbox => checkbox.nextElementSibling.textContent.trim());
}

function matchesFilters(card, filters) {
  // Property Type
  if (filters.propertyTypes.length > 0) {
    const propertyType = card.dataset.propertyType;
    if (!filters.propertyTypes.includes(propertyType)) return false;
  }

  // Guest Rating
  if (filters.ratings.length > 0) {
    const rating = parseFloat(card.querySelector('.text-green-600.font-bold').textContent);
    const matchesRating = filters.ratings.some(minRating => rating >= minRating);
    if (!matchesRating) return false;
  }

  // Amenities
  if (filters.amenities.length > 0) {
    const cardAmenities = Array.from(card.querySelectorAll('.text-xs'))
      .map(el => el.textContent.trim());
    const hasAllAmenities = filters.amenities.every(amenity => 
      cardAmenities.includes(amenity)
    );
    if (!hasAllAmenities) return false;
  }

  // Room Types
  if (filters.roomTypes.length > 0) {
    const roomType = card.dataset.roomType;
    if (!filters.roomTypes.includes(roomType)) return false;
  }

  return true;
}

function updateResults(lodgeCards) {
  const visibleCards = Array.from(lodgeCards).filter(card => 
    card.style.display !== 'none'
  );
  
  const resultsCount = document.querySelector('.results-count');
  if (resultsCount) {
    resultsCount.textContent = `Showing ${visibleCards.length} of ${lodgeCards.length} lodges`;
  }
}

// Update the reset filters function and event listener
function initializeResetFilter() {
  const resetButton = document.querySelector('.ri-refresh-line').closest('button');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      // Reset all checkboxes
      const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
      allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      
      // Reset price range slider
      const priceSlider = document.querySelector('input[type="range"]');
      if (priceSlider) {
        priceSlider.value = priceSlider.max;
        // Trigger the input event to update the price display
        const event = new Event('input');
        priceSlider.dispatchEvent(event);
      }
      
      // Reset search input
      const searchInput = document.querySelector('input[type="text"]');
      if (searchInput) {
        searchInput.value = '';
      }
      
      // Show all lodge cards
      const lodgeCards = document.querySelectorAll('.lodge-card');
      lodgeCards.forEach(card => {
        card.style.display = 'block';
        // Add fade-in animation
        card.classList.add('fade-in');
        setTimeout(() => card.classList.remove('fade-in'), 300);
      });
      
      // Update the results count
      updateResults(lodgeCards);
    });
  }
}

// Add this function to check login status
function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userIcon = document.querySelector('.user-nav-item');
  const loginLink = document.querySelector('.login-nav-item');
  
  if (isLoggedIn) {
    // Show user menu, hide login link
    userIcon.classList.remove('hidden');
    loginLink.classList.add('hidden');
    
    // Update user info in menu
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    if (userName) userName.textContent = localStorage.getItem('userName') || 'User';
    if (userEmail) userEmail.textContent = localStorage.getItem('userEmail') || '';
    
    // Show welcome message if this is a new login
    if (sessionStorage.getItem('welcomed') !== 'true') {
      showWelcomeMessage();
      sessionStorage.setItem('welcomed', 'true');
    }
  } else {
    // Hide user menu, show login link
    userIcon.classList.add('hidden');
    loginLink.classList.remove('hidden');
  }
}

// Add logout functionality
function initializeLogout() {
  const logoutButton = document.querySelector('.logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        // Clear all auth-related data
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        sessionStorage.removeItem('welcomed');
        
        // Redirect to login page
        window.location.href = '../Login/index.html';
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }
}

function showWelcomeMessage() {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-500 translate-y-[-100px] opacity-0';
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="ri-check-line text-xl"></i>
      <span>Welcome back, John!</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  }, 100);
  
  // Animate out
  setTimeout(() => {
    notification.style.transform = 'translateY(-100px)';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}