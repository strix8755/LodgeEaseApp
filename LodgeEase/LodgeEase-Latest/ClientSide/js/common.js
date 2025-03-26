/**
 * Common utility functions for LodgeEase client
 */

// Create a global CommonUtils object
window.CommonUtils = {
  ensureTailwindCSS: function() {
    // Check if Tailwind is loaded
    const isTailwindLoaded = document.querySelector('style[data-tailwind]') !== null ||
                           Array.from(document.styleSheets).some(sheet => {
                             try {
                               return sheet.cssRules && Array.from(sheet.cssRules).some(rule => 
                                 rule.cssText && rule.cssText.includes('--tw-'));
                             } catch (e) {
                               return false;
                             }
                           });
    
    // If not loaded, attempt to load it
    if (!isTailwindLoaded) {
      // First try the built CSS file
      const link = document.createElement('link');
      link.href = '/dist/output.css';
      link.rel = 'stylesheet';
      link.setAttribute('data-tailwind', 'true');
      document.head.appendChild(link);
      
      // Fallback to CDN with a timeout
      setTimeout(() => {
        if (!window.CommonUtils.ensureTailwindCSS()) {
          console.log('Using Tailwind CDN as fallback');
          const script = document.createElement('script');
          script.src = 'https://cdn.tailwindcss.com';
          document.head.appendChild(script);
        }
      }, 1000);
    }
    
    return isTailwindLoaded;
  },
  
  // Global error handler
  setupGlobalErrorHandling: function() {
    window.addEventListener('error', function(e) {
      console.log('Error caught by global handler:', e);
      
      // Track error in localStorage for debugging
      const errors = JSON.parse(localStorage.getItem('pageErrors') || '[]');
      errors.push({
        message: e.message || 'Unknown error',
        filename: e.filename,
        lineno: e.lineno,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pageErrors', JSON.stringify(errors.slice(-20))); // Keep last 20 errors
    });
  }
};

// Initialize immediately
(function() {
  CommonUtils.setupGlobalErrorHandling();
})();
