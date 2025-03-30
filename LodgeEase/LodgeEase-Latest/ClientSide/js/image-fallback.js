/**
 * Image Fallback Handler
 * Detects and provides fallbacks for missing images 
 */
(function() {
  // Define image fallbacks
  const IMAGE_FALLBACKS = {
    'default': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=',
    'logo': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzBmMTcyYSIvPjx0ZXh0IHg9IjE1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+TG9kZ2VFYXNlPC90ZXh0Pjwvc3ZnPg==',
    'room': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjQwMCIgeT0iMjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiPkhvdGVsIFJvb208L3RleHQ+PHRleHQgeD0iNDAwIiB5PSIzNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk0YTNiOCI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4='
  };

  // Process all images on the page
  function processImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      if (img.complete && img.naturalHeight === 0) {
        applyFallback(img);
      }
      
      img.addEventListener('error', () => {
        applyFallback(img);
      });
    });
    
    console.log('Image fallback system initialized');
  }
  
  // Apply the appropriate fallback to an image
  function applyFallback(img) {
    let fallbackType = 'default';
    
    // Check if this is a logo
    if (img.src.includes('logo') || img.classList.contains('logo') || 
        img.parentElement?.classList.contains('logo')) {
      fallbackType = 'logo';
    }
    
    // Check if this is a room image
    if (img.classList.contains('lodge-image') || 
        img.classList.contains('room-image') ||
        img.src.includes('room')) {
      fallbackType = 'room';
    }
    
    // Store original source for debugging
    img.setAttribute('data-original-src', img.src);
    
    // Apply the fallback
    img.src = IMAGE_FALLBACKS[fallbackType];
  }
  
  // Run on DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processImages);
  } else {
    processImages();
  }
  
  // Reprocess when all resources are loaded
  window.addEventListener('load', processImages);
})();
