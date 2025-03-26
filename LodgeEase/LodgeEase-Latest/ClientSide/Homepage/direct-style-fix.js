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
      sheet.href && sheet.href.includes('output.css') || 
      sheet.href && sheet.href.includes('tailwindcss')
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
      
      // Get computed style
      const style = window.getComputedStyle(heroSection);
      const bgImage = style.backgroundImage;
      
      // Extract URL from background-image
      const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch && urlMatch[1]) {
        heroImg.src = urlMatch[1];
      } else {
        // If we can't extract the URL, assume it's missing
        applyHeroFallback();
      }
    }
  });
  
  function applyEmergencyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      body {
        font-family: system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      
      .main-header {
        background-color: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 50;
      }
      
      .container {
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      .flex {
        display: flex;
      }
      
      .space-x-6 > * + * {
        margin-left: 1.5rem;
      }
      
      .w-1\\/4 {
        width: 25%;
      }
      
      .w-3\\/4 {
        width: 75%;
      }
      
      .lodge-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }
      
      .lodge-card {
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      
      .lodge-image {
        width: 100%;
        height: 200px;
        object-fit: cover;
      }
      
      @media (max-width: 768px) {
        .w-1\\/4, .w-3\\/4 {
          width: 100%;
        }
        
        .space-x-6 {
          flex-direction: column;
        }
        
        .space-x-6 > * + * {
          margin-left: 0;
          margin-top: 1.5rem;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  function applyHeroFallback() {
    const heroSection = document.querySelector('.hero-bg');
    if (heroSection) {
      heroSection.style.backgroundColor = '#1e293b';
      heroSection.style.backgroundImage = 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';
    }
  }
})();
