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
            id: 5,
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
        },

        {
            id: 4,
            name: "The Forest Lodge",
            location: "Session Road, Baguio City",
            image: "../components/4.jpg",
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
            initializeMap();
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
    let map;
    let markers = [];
    let userMarker;
    let directionsService;
    let directionsRenderer;
    let userLocation = null;

    // Initialize map functionality when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        initMapView();
        
        // Connect the global direction functions
        window.getDirectionsCallback = getDirections;
        window.clearDirectionsCallback = clearDirections;
    });

    // Ensure map initialization only happens after Google Maps API is loaded
    function initializeMap() {
        if (typeof google === 'undefined') {
            setTimeout(initializeMap, 100);
            return;
        }
        initMap();
        getUserLocation();
        addMarkers(lodgeData);
    }

    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Add user marker
                    if (userMarker) userMarker.setMap(null);
                    userMarker = new google.maps.Marker({
                        position: userLocation,
                        map: map,
                        title: 'Your Location',
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: '#4285F4',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                        },
                        zIndex: 999
                    });

                    // Add location button
                    const locationButton = document.createElement("button");
                    locationButton.className = "custom-map-control";
                    locationButton.innerHTML = '<i class="ri-focus-2-line"></i>';
                    locationButton.title = "Center to your location";
                    locationButton.onclick = () => {
                        map.panTo(userLocation);
                        map.setZoom(15);
                    };

                    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationButton);
                },
                (error) => {
                    console.error("Error getting user location:", error);
                }
            );
        }
    }

    function initMap() {
        const baguioCity = { lat: 16.4023, lng: 120.5960 };
        
        // Initialize directions service and renderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#4285F4',
                strokeWeight: 4
            }
        });

        map = new google.maps.Map(document.getElementById("map"), {
            zoom: 14,
            center: baguioCity,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            clickableIcons: true,
            draggable: true,
            keyboardShortcuts: true,
            disableDoubleClickZoom: false,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "on" }]
                }
            ]
        });

        directionsRenderer.setMap(map);

        // Add custom controls
        const zoomInButton = document.createElement("button");
        zoomInButton.textContent = "+";
        zoomInButton.className = "custom-map-control";
        zoomInButton.onclick = () => map.setZoom(map.getZoom() + 1);

        const zoomOutButton = document.createElement("button");
        zoomOutButton.textContent = "-";
        zoomOutButton.className = "custom-map-control";
        zoomOutButton.onclick = () => map.setZoom(map.getZoom() - 1);

        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(zoomInButton);
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(zoomOutButton);
    }

    function getDirections(destination) {
        if (!userLocation) {
            alert("Please allow location access to get directions");
            return;
        }

        // Show loading state
        const loadingInfoWindow = new google.maps.InfoWindow({
            content: `
                <div class="p-4">
                    <h3 class="font-bold mb-2">Getting Directions...</h3>
                    <p class="text-sm">Please wait while we calculate the route.</p>
                </div>
            `,
            position: destination
        });
        loadingInfoWindow.open(map);

        const request = {
            origin: userLocation,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
        };

        directionsService.route(request, (result, status) => {
            loadingInfoWindow.close();

            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
                
                // Show route info
                const route = result.routes[0].legs[0];
                const infoContent = `
                    <div class="p-4">
                        <h3 class="font-bold mb-2">Directions</h3>
                        <p class="text-sm mb-1">Distance: ${route.distance.text}</p>
                        <p class="text-sm mb-2">Duration: ${route.duration.text}</p>
                        <button onclick="clearDirections()" class="text-blue-500 hover:text-blue-700 text-sm">Clear directions</button>
                    </div>
                `;
                
                const infoWindow = new google.maps.InfoWindow({
                    content: infoContent,
                    position: destination
                });
                
                infoWindow.open(map);
            } else {
                let errorMessage = "Unable to get directions at this time.";
                if (status === google.maps.DirectionsStatus.REQUEST_DENIED) {
                    errorMessage = "API Error: Please make sure the following APIs are enabled in your Google Cloud Console:\n" +
                                 "- Maps JavaScript API\n" +
                                 "- Directions API\n" +
                                 "Also ensure your API key has the correct restrictions set.";
                } else if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
                    errorMessage = "No route could be found between your location and the destination.";
                } else if (status === google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
                    errorMessage = "You have exceeded your API request quota. Please try again later.";
                }
                console.error("Directions request failed:", status);
                
                const errorInfoWindow = new google.maps.InfoWindow({
                    content: `
                        <div class="p-4">
                            <h3 class="font-bold mb-2 text-red-600">Error Getting Directions</h3>
                            <p class="text-sm mb-2">${errorMessage}</p>
                            <p class="text-sm text-gray-600">Status: ${status}</p>
                        </div>
                    `,
                    position: destination
                });
                errorInfoWindow.open(map);
            }
        });
    }

    function clearDirections() {
        directionsRenderer.setDirections({ routes: [] });
    }

    function addMarkers(lodges) {
        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        lodges.forEach(lodge => {
            const marker = new google.maps.Marker({
                position: { lat: parseFloat(lodge.coordinates.lat), lng: parseFloat(lodge.coordinates.lng) },
                map: map,
                title: lodge.name,
                animation: google.maps.Animation.DROP
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="p-4">
                        <h3 class="font-bold">${lodge.name}</h3>
                        <p class="text-sm">${lodge.location}</p>
                        <p class="text-sm">₱${lodge.price} per night</p>
                        <div class="mt-2">
                            <a href="../Lodge/lodge${lodge.id}.html" class="text-blue-500 hover:text-blue-700">View Details</a>
                            <button onclick="getDirections({lat: ${lodge.coordinates.lat}, lng: ${lodge.coordinates.lng}})" 
                                    class="ml-2 text-blue-500 hover:text-blue-700">
                                Get Directions
                            </button>
                        </div>
                    </div>
                `
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
            });

            markers.push(marker);
        });
    }

    function initMapView() {
        const showMapBtn = document.getElementById("showMap");
        const closeMapBtn = document.getElementById("closeMap");
        const mapView = document.getElementById("mapView");

        showMapBtn?.addEventListener("click", () => {
            mapView.classList.remove("hidden");
            if (!map) {
                initializeMap();
            }
        });

        closeMapBtn?.addEventListener("click", () => {
            mapView.classList.add("hidden");
        });
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
})();