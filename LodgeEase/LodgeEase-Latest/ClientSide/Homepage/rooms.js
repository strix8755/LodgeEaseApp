// Use an IIFE to avoid global namespace pollution
(function() {
    // Lodge data
    const lodgeData = [
        {
            id: 1,
            name: "Pine Haven Lodge",
            location: "Camp John Hay, Baguio City",
            image: "../components/1.jpg",
            price: 6500,
            amenities: ["Mountain View", "Fireplace", "WiFi"],
            rating: 4.8,
            propertyType: "hotel",
            coordinates: {
                lat: 16.4096,
                lng: 120.6010
            }
        },
        {
            id: 2,
            name: "Mountain Breeze Lodge",
            location: "Session Road, Baguio City",
            image: "../components/6.jpg",
            price: 3200,
            amenities: ["City View", "Kitchen", "Parking"],
            rating: 4.5,
            propertyType: "resort",
            coordinates: {
                lat: 16.4145,
                lng: 120.5960
            }
        },
        {
            id: 3,
            name: "Baguio Hillside Retreat",
            location: "Burnham Park, Baguio City",
            image: "../components/3.jpg",
            price: 4800,
            amenities: ["Mountain View", "Kitchen", "WiFi", "Parking"],
            rating: 4.7,
            propertyType: "vacation-home",
            coordinates: {
                lat: 16.4123,
                lng: 120.5925
            }
        },
        {
            id: 4,
            name: "The Forest Lodge",
            location: "Camp John Hay, Baguio City",
            image: "../components/4.jpg",
            price: 7500,
            amenities: ["Mountain View", "Fireplace", "Room Service", "Spa"],
            rating: 4.9,
            propertyType: "resort",
            coordinates: {
                lat: 16.4086,
                lng: 120.6021
            }
        },
        {
            id: 5,
            name: "City Lights Inn",
            location: "Session Road, Baguio City",
            image: "../components/5.jpg",
            price: 2800,
            amenities: ["City View", "WiFi", "Restaurant"],
            rating: 4.3,
            propertyType: "hotel",
            coordinates: {
                lat: 16.4156,
                lng: 120.5964
            }
        },
        {
            id: 6,
            name: "Wright Park Manor",
            location: "Wright Park, Baguio City",
            image: "../components/7.jpg",
            price: 5200,
            amenities: ["Mountain View", "Kitchen", "Parking", "Pet Friendly"],
            rating: 4.6,
            propertyType: "bed-breakfast",
            coordinates: {
                lat: 16.4105,
                lng: 120.6287
            }
        },
        {
            id: 7,
            name: "Highland Haven",
            location: "Burnham Park, Baguio City",
            image: "../components/8.jpg",
            price: 4100,
            amenities: ["City View", "WiFi", "Fitness Center"],
            rating: 4.4,
            propertyType: "hotel",
            coordinates: {
                lat: 16.4115,
                lng: 120.5932
            }
        },
        {
            id: 8,
            name: "Sunset View Villa",
            location: "Camp John Hay, Baguio City",
            image: "../components/9.jpg",
            price: 8900,
            amenities: ["Mountain View", "Pool", "Kitchen", "Fireplace"],
            rating: 4.9,
            propertyType: "vacation-home",
            coordinates: {
                lat: 16.4089,
                lng: 120.6015
            }
        },
        {
            id: 9,
            name: "Cozy Corner B&B",
            location: "Wright Park, Baguio City",
            image: "../components/10.jpg",
            price: 3500,
            amenities: ["Garden View", "Free Breakfast", "WiFi"],
            rating: 4.5,
            propertyType: "bed-breakfast",
            coordinates: {
                lat: 16.4112,
                lng: 120.6291
            }
        },
        {
            id: 10,
            name: "The Manor Hotel",
            location: "Camp John Hay, Baguio City",
            image: "../components/11.jpg",
            price: 9500,
            amenities: ["Mountain View", "Spa", "Restaurant", "Room Service"],
            rating: 4.8,
            propertyType: "hotel",
            coordinates: {
                lat: 16.4098,
                lng: 120.6018
            }
        },
        {
            id: 11,
            name: "Session Suites",
            location: "Session Road, Baguio City",
            image: "../components/12.jpg",
            price: 4700,
            amenities: ["City View", "Kitchen", "WiFi", "Parking"],
            rating: 4.6,
            propertyType: "hotel",
            coordinates: {
                lat: 16.4152,
                lng: 120.5957
            }
        },
        {
            id: 12,
            name: "City Lights Inn",
            location: "Session Road, Baguio City",
            image: "../components/5.jpg",
            price: 2800,
            amenities: ["City View", "WiFi", "Restaurant"],
            rating: 4.3,
            propertyType: "hotel",
            coordinates: {
                lat: 16.4156,
                lng: 120.5964
            }
        },
        {
            id: 13,
            name: "Wright Park Manor",
            location: "Wright Park, Baguio City",
            image: "../components/7.jpg",
            price: 5200,
            amenities: ["Mountain View", "Kitchen", "Parking", "Pet Friendly"],
            rating: 4.6,
            propertyType: "bed-breakfast",
            coordinates: {
                lat: 16.4105,
                lng: 120.6287
            }
        },
        {
            id: 14,
            name: "Super Apartment - Room 6",
            location: "City Center, Baguio City",
            image: "../components/SuperApartmentRoom6.jpg",
            price: 3200,
            amenities: ["City View", "WiFi", "Kitchen"],
            rating: 4.4,
            propertyType: "apartment",
            coordinates: {
                lat: 16.4123,
                lng: 120.5960
            }
        }
    ];

    // Initialize everything when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing functionality...');
        initializeAllFunctionality();
    });

    function initializeAllFunctionality() {
        try {
            addLodgeModalToDOM(); 
            createLodgeCards();
            initializeSearch();
            initializeSort();
            initializeMapToggle();
            initializeFilters();
        } catch (error) {
            console.error('Error initializing functionality:', error);
        }
    }

        // Add the new modal function here
        function addLodgeModalToDOM() {
            const modalHTML = `
                <div id="lodgeDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="fixed inset-0 flex items-center justify-center p-4">
                        <div class="bg-white rounded-lg max-w-4xl w-full max-h-90vh overflow-y-auto">
                            <div class="p-6" id="lodgeDetailsContent">
                                <!-- Content will be dynamically inserted here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
    
            // Add global click handler to close modal when clicking outside
            document.getElementById('lodgeDetailsModal')?.addEventListener('click', (e) => {
                if (e.target.id === 'lodgeDetailsModal') {
                    e.target.classList.add('hidden');
                }
            });
        }
    
        // Add the show details function here
        function showLodgeDetails(lodge) {
            const modal = document.getElementById('lodgeDetailsModal');
            const content = document.getElementById('lodgeDetailsContent');
            
            if (!modal || !content) {
                console.error('Modal elements not found');
                return;
            }
            
            // Generate the correct file path with the Lodge folder
            const bookingUrl = `../Lodge/lodge${lodge.id}.html`;
            
            content.innerHTML = `
                <div class="flex justify-between items-start mb-6">
                    <h2 class="text-2xl font-bold">${lodge.name}</h2>
                    <button class="text-gray-500 hover:text-gray-700" onclick="document.getElementById('lodgeDetailsModal').classList.add('hidden')">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>
                <img src="${lodge.image}" alt="${lodge.name}" class="w-full h-64 object-cover rounded-lg mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 class="font-semibold mb-2">Location</h3>
                        <p class="text-gray-600">${lodge.location}</p>
                        
                        <h3 class="font-semibold mt-4 mb-2">Price</h3>
                        <p class="text-green-600 font-bold text-xl">₱${lodge.price.toLocaleString()}/night</p>
                        
                        <h3 class="font-semibold mt-4 mb-2">Rating</h3>
                        <div class="flex items-center">
                            <span class="text-yellow-500 mr-1">${'★'.repeat(Math.floor(lodge.rating))}</span>
                            <span class="text-gray-600">${lodge.rating}/5</span>
                        </div>
                    </div>
                    <div>
                        <h3 class="font-semibold mb-2">Amenities</h3>
                        <div class="flex flex-wrap gap-2">
                            ${lodge.amenities.map(amenity => 
                                `<span class="bg-gray-100 px-3 py-1 rounded-full text-sm">${amenity}</span>`
                            ).join('')}
                        </div>
                        
                        <a href="${bookingUrl}">
                            <button class="w-full bg-blue-600 text-white py-3 rounded-lg mt-6 hover:bg-blue-700 transition-colors">
                                Book Now
                            </button>
                        </a>
                    </div>
                </div>
            `;
            
            modal.classList.remove('hidden');
        }
    
        // Update your existing createLodgeCards function
        function createLodgeCards() {
            console.log('Creating lodge cards...');
            const container = document.querySelector('.lodge-container');
            if (!container) {
                console.error('Lodge container not found');
                return;
            }
    
            // Clear existing cards
            container.innerHTML = '';
    
            lodgeData.forEach(lodge => {
                const card = document.createElement('div');
                card.className = 'lodge-card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer';
                card.dataset.propertyType = lodge.propertyType || 'hotel';
                
                card.innerHTML = `
                    <div class="block">
                        <img src="${lodge.image}" alt="${lodge.name}" class="w-full h-48 object-cover">
                        <div class="p-4">
                            <h2 class="text-xl font-semibold mb-2">${lodge.name}</h2>
                            <p class="text-gray-500 mb-2">${lodge.location}</p>
                            <div class="flex flex-wrap gap-2 mb-3">
                                ${lodge.amenities.map(amenity => 
                                    `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${amenity}</span>`
                                ).join('')}
                            </div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-green-600 font-bold">₱${lodge.price.toLocaleString()}/night</span>
                                <button class="text-gray-500 hover:text-red-500">
                                    <i class="ri-heart-line text-xl"></i>
                                </button>
                            </div>
                            <div class="text-xs text-gray-500 flex items-center">
                                <i class="ri-map-pin-line mr-1"></i>
                                <span>Coordinates: ${lodge.coordinates.lat.toFixed(4)}, ${lodge.coordinates.lng.toFixed(4)}</span>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add click event listener to open lodge details
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.ri-heart-line')) {  // Ignore clicks on the heart icon
                        showLodgeDetails(lodge);
                    }
                });
                
                container.appendChild(card);
            });
    
            updateResultsCount();
        }
    // Search functionality
    function initializeSearch() {
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (!searchInput) {
            console.error('Search input not found');
            return;
        }

        function filterLodges(searchTerm) {
            const lodges = document.querySelectorAll('.lodge-card');
            let visibleCount = 0;

            lodges.forEach(lodge => {
                const searchableContent = [
                    lodge.querySelector('h2')?.textContent || '',
                    lodge.querySelector('.text-gray-500')?.textContent || '',
                    ...Array.from(lodge.querySelectorAll('.text-xs')).map(el => el.textContent || '')
                ].join(' ').toLowerCase();

                if (searchTerm === '' || searchableContent.includes(searchTerm.toLowerCase())) {
                    lodge.style.display = 'block';
                    visibleCount++;
                } else {
                    lodge.style.display = 'none';
                }
            });

            updateResultsCount(visibleCount);
        }

        searchInput.addEventListener('input', (e) => filterLodges(e.target.value));
    }

    // Map toggle functionality
    function initializeMapToggle() {
        const toggleButton = document.getElementById('toggleView');
        const mapView = document.getElementById('mapView');
        const closeMapButton = document.getElementById('closeMap');
        
        if (toggleButton && mapView) {
            toggleButton.addEventListener('click', () => {
                mapView.classList.remove('hidden');
                console.log('Map view shown');
                
                setTimeout(() => {
                    if (!window.lodgeMap) {
                        console.log('Creating new map instance');
                        initMap();
                    } else {
                        console.log('Refreshing existing map');
                        window.lodgeMap.invalidateSize();
                        window.lodgeMap.setView([16.4023, 120.5960], 13);
                        addMarkersToMap();
                    }
                }, 100);
            });
        }

        if (closeMapButton) {
            closeMapButton.addEventListener('click', () => {
                mapView.classList.add('hidden');
            });
        }
    }

    // Initialize map function
    function initMap() {
        try {
            console.log('Starting map initialization');
            const mapContainer = document.getElementById('map');
            
            if (!mapContainer) {
                console.error('Map container not found');
                return;
            }

            // Clean up existing map and markers
            if (window.lodgeMap) {
                window.markers?.forEach(marker => marker?.remove());
                window.markers = [];
                window.lodgeMap.remove();
                window.lodgeMap = null;
                console.log('Cleaned up existing map');
            }

            // Create new map instance
            const map = L.map(mapContainer, {
                center: [16.4023, 120.5960],
                zoom: 13
            });

            console.log('Map object created');

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Store map reference
            window.lodgeMap = map;

            // Get user's current location
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;

                    // Create a red marker for user's location
                    const userIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });

                    // Add user marker to map
                    const userMarker = L.marker([userLat, userLng], {
                        icon: userIcon
                    }).addTo(map);

                    userMarker.bindPopup('You are here!').openPopup();

                    // Store user marker reference
                    window.userMarker = userMarker;

                    // Center map on user location
                    map.setView([userLat, userLng], 14);
                }, function(error) {
                    console.error("Error getting location:", error);
                    // Continue with default map view if location access is denied
                    addMarkersToMap();
                });
            } else {
                console.log("Geolocation not available");
                // Continue with default map view if geolocation is not supported
                addMarkersToMap();
            }

            // Add lodge markers after a short delay
            setTimeout(() => {
                map.invalidateSize();
                addMarkersToMap();
            }, 200);

            console.log('Map initialization completed');
        } catch (error) {
            console.error('Error in initMap:', error);
        }
    }

    // Add this function to fit bounds to all markers
    function fitBounds() {
        if (window.lodgeMap && window.markers && window.markers.length > 0) {
            const bounds = L.latLngBounds(window.markers.map(marker => marker.getLatLng()));
            window.lodgeMap.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    // Initialize filters
    function initializeFilters() {
        // Price filter
        const priceSlider = document.querySelector('input[type="range"]');
        if (priceSlider) {
            priceSlider.addEventListener('input', updateFilters);
        }

        // Neighborhood and amenity filters
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateFilters);
        });

        // Reset button
        const resetButton = document.querySelector('.ri-refresh-line')?.parentElement;
        if (resetButton) {
            resetButton.addEventListener('click', resetFilters);
        }
    }

    // Update filters
    function updateFilters() {
        const lodges = document.querySelectorAll('.lodge-card');
        const priceSlider = document.querySelector('input[type="range"]');
        const maxPrice = priceSlider ? parseInt(priceSlider.value) : Infinity;

        let visibleCount = 0;

        lodges.forEach(lodge => {
            const price = extractPrice(lodge);
            const shouldShow = price <= maxPrice && matchesSelectedFilters(lodge);
            lodge.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount++;
        });

        updateResultsCount(visibleCount);
    }

    // Helper functions
    function extractPrice(lodge) {
        const priceText = lodge.querySelector('.text-green-600')?.textContent || '0';
        return parseInt(priceText.replace(/[^0-9]/g, ''));
    }

    function matchesSelectedFilters(lodge) {
        // Check neighborhoods
        const selectedNeighborhoods = Array.from(document.querySelectorAll('input[name="neighborhood"]:checked'))
            .map(cb => cb.value.toLowerCase());
        
        // Check amenities
        const selectedAmenities = Array.from(document.querySelectorAll('input[name="amenity"]:checked'))
            .map(cb => cb.value.toLowerCase());
        
        // Check property types
        const selectedPropertyTypes = Array.from(document.querySelectorAll('[data-filter="property-type"] input:checked'))
            .map(cb => cb.value.toLowerCase());

        // Get lodge details
        const location = lodge.querySelector('.text-gray-500')?.textContent.toLowerCase() || '';
        const amenities = Array.from(lodge.querySelectorAll('.text-xs'))
            .map(el => el.textContent.toLowerCase());

        // Check if lodge matches all selected filters
        const matchesNeighborhood = selectedNeighborhoods.length === 0 || 
            selectedNeighborhoods.some(n => location.includes(n));

        const matchesAmenities = selectedAmenities.length === 0 || 
            selectedAmenities.every(a => amenities.some(am => am.includes(a)));

        const matchesPropertyType = selectedPropertyTypes.length === 0 || 
            selectedPropertyTypes.some(pt => lodge.dataset.propertyType?.toLowerCase() === pt);

        return matchesNeighborhood && matchesAmenities && matchesPropertyType;
    }

    function updateResultsCount() {
        const total = document.querySelectorAll('.lodge-card').length;
        const visible = document.querySelectorAll('.lodge-card[style*="display: block"]').length;
        const countDisplay = document.querySelector('.lodge-count');
        
        if (countDisplay) {
            countDisplay.textContent = `Showing ${visible} of ${total} lodges`;
        }
    }

    function resetFilters() {
        const priceSlider = document.querySelector('input[type="range"]');
        if (priceSlider) {
            priceSlider.value = priceSlider.max;
        }

        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        document.querySelectorAll('.lodge-card').forEach(card => {
            card.style.display = 'block';
        });

        updateResultsCount();
    }

    // Sort functionality
    function initializeSort() {
        const sortSelect = document.querySelector('select');
        if (!sortSelect) return;

        sortSelect.addEventListener('change', () => {
            const lodges = Array.from(document.querySelectorAll('.lodge-card'));
            const container = lodges[0]?.parentNode;
            if (!container) return;

            lodges.sort((a, b) => {
                const priceA = parseInt(a.querySelector('.text-green-600')?.textContent.replace(/[^0-9]/g, '') || '0');
                const priceB = parseInt(b.querySelector('.text-green-600')?.textContent.replace(/[^0-9]/g, '') || '0');

                switch (sortSelect.value) {
                    case 'Price: Low to High':
                        return priceA - priceB;
                    case 'Price: High to Low':
                        return priceB - priceA;
                    default:
                        return 0;
                }
            });

            lodges.forEach(lodge => container.appendChild(lodge));
        });
    }

    // Update addMarkersToMap to preserve user marker
    function addMarkersToMap() {
        if (!window.lodgeMap) {
            console.error('Map not initialized');
            return;
        }
        
        try {
            // Clear existing markers except user marker
            if (window.markers) {
                window.markers.forEach(marker => marker.remove());
            }
            window.markers = [];

            // Add lodge markers
            lodgeData.forEach((lodge, index) => {
                if (!lodge.coordinates) {
                    console.warn(`No coordinates for lodge: ${lodge.name}`);
                    return;
                }

                try {
                    const marker = L.marker([
                        lodge.coordinates.lat,
                        lodge.coordinates.lng
                    ]);

                    marker.addTo(window.lodgeMap)
                        .bindPopup(`
                            <div class="p-2">
                                <h3 class="font-bold">${lodge.name}</h3>
                                <p class="text-sm">${lodge.location}</p>
                                <p class="text-sm font-bold">₱${lodge.price}/night</p>
                            </div>
                        `);

                    window.markers.push(marker);
                } catch (markerError) {
                    console.error(`Error adding marker for ${lodge.name}:`, markerError);
                }
            });

            // Fit bounds to include all markers and user location
            const allMarkers = [...window.markers];
            if (window.userMarker) {
                allMarkers.push(window.userMarker);
            }
            
            if (allMarkers.length > 0) {
                const bounds = L.latLngBounds(allMarkers.map(marker => marker.getLatLng()));
                window.lodgeMap.fitBounds(bounds, { padding: [50, 50] });
            }

            console.log(`Successfully added ${window.markers.length} markers`);
        } catch (error) {
            console.error('Error adding markers:', error);
        }
    }
})();