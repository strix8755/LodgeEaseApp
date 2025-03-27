// Fix background and z-index issues
document.addEventListener('DOMContentLoaded', function() {
  // Find existing overlay or create a new one
  let overlay = document.querySelector('.bg-overlay');
  
  if (!overlay) {
    // Create a lighter overlay
    overlay = document.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.25)'; // Lighter overlay (was 0.65)
    overlay.style.zIndex = '-5'; // Even lower z-index to ensure it's below everything
    document.body.appendChild(overlay);
  } else {
    // Update existing overlay
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
    overlay.style.zIndex = '-5';
  }
  
  // Ensure header has highest z-index and proper background
  const header = document.querySelector('.main-header');
  if (header) {
    header.style.zIndex = '100'; // Increase from default 50
    header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)'; // More opaque background
    header.style.backdropFilter = 'blur(8px)'; // Add blur for better readability
    header.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)'; // Subtle border
  }
  
  // Fix z-index for all interactive elements in header
  const headerButtons = document.querySelectorAll('.main-header button, .main-header a, .main-header input');
  headerButtons.forEach(el => {
    el.style.position = 'relative'; // Ensure position context for z-index
    el.style.zIndex = '2'; // Local z-index to ensure clickability
  });
  
  // Ensure search container and other elements are properly positioned
  const searchContainer = document.querySelector('.search-container-wrapper');
  if (searchContainer) {
    searchContainer.style.position = 'relative';
    searchContainer.style.zIndex = '10';
  }
  
  // Fix dropdown menus z-index
  const dropdowns = document.querySelectorAll('#guestsDropdown, #barangayDropdown');
  dropdowns.forEach(dropdown => {
    dropdown.style.zIndex = '150';
  });
  
  // Fix background in hero section
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    heroBg.style.position = 'absolute';
    heroBg.style.inset = '0';
    heroBg.style.zIndex = '0';
  }
  
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    heroContent.style.position = 'relative';
    heroContent.style.zIndex = '1';
    heroContent.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; // Lighter overlay
  }
});
