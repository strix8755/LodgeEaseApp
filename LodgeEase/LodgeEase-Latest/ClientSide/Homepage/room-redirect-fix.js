// Enhanced redirect loop prevention for rooms.html

// Immediately detect we're on the correct page
(function() {
  console.log('Room redirect fix script running');
  
  // Clear redirect tracking
  sessionStorage.removeItem('redirectCount');
  localStorage.removeItem('redirectAttempted');
  
  // Record this page has loaded successfully
  localStorage.setItem('roomsPageLoaded', 'true');
  localStorage.setItem('lastPageLoad', Date.now().toString());
  
  // Save current URL as the last valid one
  localStorage.setItem('lastValidUrl', window.location.href);
  
  // Set a global variable accessible from other scripts
  window.__roomsPageLoaded = true;
  
  console.log('Redirect loop protection active');
})();

// Create a hidden iframe to ensure the parent frame knows the page has loaded
document.addEventListener('DOMContentLoaded', function() {
  // Create a ping element to confirm rooms.html loaded correctly
  const pingElement = document.createElement('div');
  pingElement.id = 'rooms-page-loaded-ping';
  pingElement.style.display = 'none';
  document.body.appendChild(pingElement);
  
  // Check if we got here via redirect and log it
  if (document.referrer.includes('index.html')) {
    console.log('Successfully redirected from index.html to rooms.html');
  }
});

// Set up a custom error handler that doesn't use import/export
window.addEventListener('error', function(e) {
  // Don't log syntax errors from modules - these are expected
  if (e.message && (e.message.includes('import statement') || e.message.includes('export statement'))) {
    return;
  }
  
  console.error('Page error detected:', e.message);
  
  // Log critical errors
  localStorage.setItem('roomsPageError', e.message || 'Unknown error');
});
