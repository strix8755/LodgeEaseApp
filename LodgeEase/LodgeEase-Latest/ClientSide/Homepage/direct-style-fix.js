/**
 * Direct style fixes for when CSS files fail to load
 * This script adds critical inline styles to maintain layout
 */

(function() {
  console.log('Applying direct style fixes');

  document.addEventListener('DOMContentLoaded', function() {
    // Check if output.css failed to load
    const stylesheets = Array.from(document.styleSheets);
    const tailwindLoaded = stylesheets.some(sheet => 
      sheet.href && (sheet.href.includes('output.css') || sheet.href.includes('tailwindcss'))
    );
    
    if (!tailwindLoaded) {
      console.log('output.css not loaded, applying emergency styles');
      applyEmergencyStyles();
    }
    
    // Check if hero-bg.jpg failed to load
    const heroSection = document.querySelector('.hero-bg');
    if (heroSection) {
      const heroImg = new Image();
      heroImg.onload = function() {
        console.log('Hero background loaded successfully');
      };
      heroImg.onerror = function() {
        console.log('Hero background failed to load, applying fallback');
        applyHeroFallback();
      };
      
      // Get computed style to check if background image is actually loading
      const style = getComputedStyle(heroSection);
      const bgImage = style.backgroundImage;
      
      if (bgImage === 'none' || bgImage === '') {
        applyHeroFallback();
      } else {
        heroImg.src = bgImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
      }
    }
    
    // Check for geolocation issues and provide a workaround
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          console.log('Geolocation obtained successfully');
          window.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        },
        error => {
          console.log('Geolocation failed:', error.message);
          // Set a default location for Baguio City
          window.userLocation = { lat: 16.4023, lng: 120.5960 };
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  });
  
  function applyEmergencyStyles() {
    // Create a style element for emergency CSS
    const style = document.createElement('style');
    style.textContent = `
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f5f5f5;
      }
      .main-header {
        background-color: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        height: 60px;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      .flex {
        display: flex;
      }
      .items-center {
        align-items: center;
      }
      .justify-between {
        justify-content: space-between;
      }
      .space-x-4 > * + * {
        margin-left: 1rem;
      }
      .hero-section {
        background-color: rgba(0,0,0,0.6);
        padding: 2rem 0;
        color: white;
        margin-top: 60px;
      }
      .w-1\\/4 {
        width: 25%;
      }
      .w-3\\/4 {
        width: 75%;
      }
      .space-x-6 > * + * {
        margin-left: 1.5rem;
      }
      .lodge-card {
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        overflow: hidden;
        margin-bottom: 1.5rem;
      }
      .lodge-image {
        width: 100%;
        height: 200px;
        object-fit: cover;
      }
      .p-4 {
        padding: 1rem;
      }
      .text-xl {
        font-size: 1.25rem;
      }
      .font-semibold {
        font-weight: 600;
      }
      .mb-2 {
        margin-bottom: 0.5rem;
      }
      .text-gray-600 {
        color: #4b5563;
      }
    `;
    document.head.appendChild(style);
  }
  
  function applyHeroFallback() {
    const heroSection = document.querySelector('.hero-bg');
    if (heroSection) {
      heroSection.style.backgroundImage = 'linear-gradient(135deg, #1e3c72, #2a5298)';
      heroSection.style.opacity = '1';
    }
  }
})();
