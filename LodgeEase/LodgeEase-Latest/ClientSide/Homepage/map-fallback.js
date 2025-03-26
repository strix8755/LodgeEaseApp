/**
 * Fallback map handler for LodgeEase
 * Provides map services even when Google Maps API is unavailable
 */

(function() {
  // Create a namespace for the fallback map service
  window.LodgeEaseMap = {
    isGoogleMapsAvailable: false,
    
    // Initialize on page load
    init: function() {
      console.log('Map fallback service initialized');
      
      // Add event listener to the show map button
      const showMapBtn = document.getElementById('showMap');
      if (showMapBtn) {
        showMapBtn.addEventListener('click', this.handleShowMapClick.bind(this));
      }
      
      // Check if Google Maps API is available
      this.checkGoogleMapsAvailability();
    },
    
    // Check for Google Maps API
    checkGoogleMapsAvailability: function() {
      // Set a timeout to check if Google Maps loaded
      setTimeout(() => {
        this.isGoogleMapsAvailable = (typeof google !== 'undefined' && google.maps);
        if (!this.isGoogleMapsAvailable) {
          console.log('Google Maps not available, using fallback');
          this.updateMapButtonForFallback();
        } else {
          console.log('Google Maps API available');
        }
      }, 2000);
    },
    
    // Update the Show Map button to indicate fallback mode
    updateMapButtonForFallback: function() {
      const showMapBtn = document.getElementById('showMap');
      if (showMapBtn) {
        // Update button appearance
        showMapBtn.innerHTML = '<i class="ri-map-pin-line text-lg"></i><span class="font-medium">View Locations (Basic)</span>';
        showMapBtn.classList.add('bg-yellow-500');
        showMapBtn.classList.remove('bg-blue-500');
      }
    },
    
    // Handle show map button click
    handleShowMapClick: function() {
      if (this.isGoogleMapsAvailable) {
        // Let the original handler work
        return;
      }
      
      // Create and display our own simplified map view
      this.showFallbackMap();
    },
    
    // Create a fallback map display
    showFallbackMap: function() {
      const mapView = document.getElementById('mapView');
      if (!mapView) return;
      
      const mapContainer = document.getElementById('map');
      
      // Show the map view
      mapView.classList.remove('hidden');
      
      // Clear previous content
      if (mapContainer) {
        mapContainer.innerHTML = '';
        
        // Create a basic map representation
        mapContainer.innerHTML = `
          <div class="p-6 bg-white h-full">
            <div class="mb-4 bg-blue-100 rounded-lg p-4 text-blue-700">
              <h2 class="text-xl font-bold mb-2">Map View Unavailable</h2>
              <p>Google Maps cannot be displayed due to account billing issues. Here's a list of our lodge locations instead:</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              ${this.generateLocationCards()}
            </div>
          </div>
        `;
        
        // Add close button functionality
        const closeMapBtn = document.getElementById('closeMap');
        if (closeMapBtn) {
          closeMapBtn.addEventListener('click', () => {
            mapView.classList.add('hidden');
          });
        }
      }
    },
    
    // Generate HTML for location cards
    generateLocationCards: function() {
      // Get the lodge data from the global variable
      const lodges = window.LodgeEasePublicAPI?.getAllLodges() || [];
      
      if (lodges.length === 0) {
        return '<p class="text-gray-500">No location data available</p>';
      }
      
      return lodges.map(lodge => `
        <div class="bg-gray-50 rounded-lg p-4 shadow-sm">
          <h3 class="font-bold text-lg">${lodge.name}</h3>
          <p class="text-gray-600 mb-2">
            <i class="ri-map-pin-line mr-1"></i>
            ${lodge.location}
          </p>
          <div class="text-sm text-gray-500 mb-2">
            <strong>Barangay:</strong> ${lodge.barangay}
          </div>
          <div class="text-sm">
            <strong>Coordinates:</strong><br>
            Latitude: ${lodge.coordinates.lat.toFixed(4)}<br>
            Longitude: ${lodge.coordinates.lng.toFixed(4)}
          </div>
          <div class="mt-3">
            <a href="../Lodge/lodge${lodge.id}.html" class="text-blue-600 hover:underline">View Lodge</a>
          </div>
        </div>
      `).join('');
    }
  };
  
  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    window.LodgeEaseMap.init();
  });
})();
