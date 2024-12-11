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
            propertyType: "hotel"
        },
        {
            id: 2,
            name: "Mountain Breeze Lodge",
            location: "Session Road, Baguio City",
            image: "../components/6.jpg",
            price: 3200,
            amenities: ["City View", "Kitchen", "Parking"],
            rating: 4.5,
            propertyType: "resort"
        },
        {
            id: 3,
            name: "Baguio Hillside Retreat",
            location: "Burnham Park, Baguio City",
            image: "../components/3.jpg",
            price: 4800,
            amenities: ["Mountain View", "Kitchen", "WiFi", "Parking"],
            rating: 4.7,
            propertyType: "vacation-home"
        },
        {
            id: 4,
            name: "The Forest Lodge",
            location: "Camp John Hay, Baguio City",
            image: "../components/4.jpg",
            price: 7500,
            amenities: ["Mountain View", "Fireplace", "Room Service", "Spa"],
            rating: 4.9,
            propertyType: "resort"
        },
        {
            id: 5,
            name: "City Lights Inn",
            location: "Session Road, Baguio City",
            image: "../components/5.jpg",
            price: 2800,
            amenities: ["City View", "WiFi", "Restaurant"],
            rating: 4.3,
            propertyType: "hotel"
        },
        {
            id: 6,
            name: "Wright Park Manor",
            location: "Wright Park, Baguio City",
            image: "../components/7.jpg",
            price: 5200,
            amenities: ["Mountain View", "Kitchen", "Parking", "Pet Friendly"],
            rating: 4.6,
            propertyType: "bed-breakfast"
        },
        {
            id: 7,
            name: "Highland Haven",
            location: "Burnham Park, Baguio City",
            image: "../components/8.jpg",
            price: 4100,
            amenities: ["City View", "WiFi", "Fitness Center"],
            rating: 4.4,
            propertyType: "hotel"
        },
        {
            id: 8,
            name: "Sunset View Villa",
            location: "Camp John Hay, Baguio City",
            image: "../components/9.jpg",
            price: 8900,
            amenities: ["Mountain View", "Pool", "Kitchen", "Fireplace"],
            rating: 4.9,
            propertyType: "vacation-home"
        },
        {
            id: 9,
            name: "Cozy Corner B&B",
            location: "Wright Park, Baguio City",
            image: "../components/10.jpg",
            price: 3500,
            amenities: ["Garden View", "Free Breakfast", "WiFi"],
            rating: 4.5,
            propertyType: "bed-breakfast"
        },
        {
            id: 10,
            name: "The Manor Hotel",
            location: "Camp John Hay, Baguio City",
            image: "../components/11.jpg",
            price: 9500,
            amenities: ["Mountain View", "Spa", "Restaurant", "Room Service"],
            rating: 4.8,
            propertyType: "hotel"
        },
        {
            id: 11,
            name: "Session Suites",
            location: "Session Road, Baguio City",
            image: "../components/12.jpg",
            price: 4700,
            amenities: ["City View", "Kitchen", "WiFi", "Parking"],
            rating: 4.6,
            propertyType: "hotel"
        },
        {
            id: 12,
            name: "Burnham Lake House",
            location: "Burnham Park, Baguio City",
            image: "../components/13.jpg",
            price: 5800,
            amenities: ["Lake View", "Kitchen", "Pet Friendly", "Garden"],
            rating: 4.7,
            propertyType: "vacation-home"
        }
    ];

    // Initialize everything when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing functionality...');
        initializeAllFunctionality();
    });

    function initializeAllFunctionality() {
        try {
            createLodgeCards();
            initializeSearch();
            initializeSort();
            initializeMapToggle();
            initializeFilters();
        } catch (error) {
            console.error('Error initializing functionality:', error);
        }
    }

    // Create lodge cards
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
            card.className = 'lodge-card bg-white rounded-lg shadow-lg overflow-hidden';
            card.dataset.propertyType = lodge.propertyType || 'hotel';
            
            card.innerHTML = `
                <a href="../Lodge/lodge${lodge.id}.html" class="block">
                    <img src="${lodge.image}" alt="${lodge.name}" class="w-full h-48 object-cover">
                    <div class="p-4">
                        <h2 class="text-xl font-semibold mb-2">${lodge.name}</h2>
                        <p class="text-gray-500 mb-2">${lodge.location}</p>
                        <div class="flex flex-wrap gap-2 mb-3">
                            ${lodge.amenities.map(amenity => 
                                `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${amenity}</span>`
                            ).join('')}
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-green-600 font-bold">₱${lodge.price.toLocaleString()}/night</span>
                            <button class="text-gray-500 hover:text-red-500">
                                <i class="ri-heart-line text-xl"></i>
                            </button>
                        </div>
                    </div>
                </a>
            `;
            
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
        
        if (toggleButton && mapView) {
            toggleButton.addEventListener('click', () => {
                mapView.classList.toggle('hidden');
                if (!mapView.classList.contains('hidden') && window.lodgeMap) {
                    google.maps.event.trigger(window.lodgeMap, 'resize');
                }
            });
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
})();