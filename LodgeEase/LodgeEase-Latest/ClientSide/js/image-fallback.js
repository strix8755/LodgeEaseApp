/**
 * Image Fallback Handler
 * Detects and provides fallbacks for missing images 
 */
(function() {
  // Define image fallbacks
  const IMAGE_FALLBACKS = {
    'default': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=',
    'logo': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzBmMTcyYSIvPjx0ZXh0IHg9IjE1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+TG9kZ2VFYXNlPC90ZXh0Pjwvc3ZnPg=='
  };

  // Add onload handler for the document
  document.addEventListener('DOMContentLoaded', function() {
    // Process all images
    const images = document.querySelectorAll('img');
    images.forEach(function(img) {
      // Skip images with data-no-fallback attribute
      if (img.hasAttribute('data-no-fallback')) return;
      
      // Store original src
      const originalSrc = img.src;
      
      // Set error handler for image
      img.onerror = function() {
        console.warn(`Image failed to load: ${originalSrc}`);
        
        // Determine which fallback to use
        let fallback = IMAGE_FALLBACKS.default;
        
        // Check if it's a logo
        if (img.src.includes('Logo') || img.alt.includes('Logo') || img.alt.includes('logo')) {
          fallback = IMAGE_FALLBACKS.logo;
        }
        
        // Apply fallback
        img.src = fallback;
        
        // Add class for styling
        img.classList.add('image-fallback');
        
        // Prevent infinite error loop
        img.onerror = null;
      };
      
      // If image is already broken, apply fallback immediately
      if (img.complete && img.naturalWidth === 0) {
        img.onerror();
      }
    });
    
    console.log('Image fallback system initialized');
  });
})();
