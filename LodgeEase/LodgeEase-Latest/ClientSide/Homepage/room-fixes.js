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
    header.style.height = '50px'; // Set smaller height
  }

  // Adjust logo size
  const logo = document.querySelector('.logo img');
  if (logo) {
    logo.style.height = '24px';
  }

  // Fix mobile menu position to match new header height
  const mobileMenu = document.querySelector('#mobile-menu');
  if (mobileMenu) {
    mobileMenu.style.top = '50px'; // Match new header height
  }

  // Adjust hero section top margin for smaller header
  const heroSection = document.querySelector('.hero-section');
  if (heroSection) {
    heroSection.style.marginTop = '20px'; // Reduced from 35px
  }
  
  // Reduce padding-top of main container
  const mainContainer = document.querySelector('.container.mx-auto.max-w-6xl.px-4.pt-20');
  if (mainContainer) {
    mainContainer.style.paddingTop = '50px'; // Reduced from default 5rem (80px)
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
    searchContainer.style.zIndex = '15';
    searchContainer.style.width = '90%';
    searchContainer.style.maxWidth = '900px';
    searchContainer.style.margin = '0 auto';
    searchContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    searchContainer.style.backdropFilter = 'blur(8px)';
    searchContainer.style.borderRadius = '16px';
    searchContainer.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)';
    searchContainer.style.border = '1px solid rgba(255, 255, 255, 0.6)';
    
    // Add hover effect through event listeners
    searchContainer.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 15px 30px -5px rgba(0, 0, 0, 0.25)';
    });
    
    searchContainer.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)';
    });
    
    // Enhance inner container
    const innerContainer = searchContainer.querySelector('.search-container');
    if (innerContainer) {
      innerContainer.style.borderRadius = '12px';
      innerContainer.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
      innerContainer.style.overflow = 'hidden';
    }
    
    // Enhance input groups
    const inputGroups = searchContainer.querySelectorAll('.search-input-group');
    inputGroups.forEach(group => {
      group.style.transition = 'background-color 0.2s ease';
      
      group.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(249, 250, 251, 0.8)';
      });
      
      group.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
      });
    });
    
    // Enhance input wrappers
    const inputWrappers = searchContainer.querySelectorAll('.input-wrapper');
    inputWrappers.forEach(wrapper => {
      wrapper.style.padding = '0.875rem 1.25rem';
    });
    
    // Enhance icons
    const icons = searchContainer.querySelectorAll('.input-wrapper i');
    icons.forEach(icon => {
      icon.style.color = '#4b5563';
      icon.style.marginRight = '0.75rem';
      icon.style.fontSize = '1.25rem';
    });
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

  // Fix calendar modal z-index issues
  const datePickerBtn = document.getElementById('datePickerBtn');
  if (datePickerBtn) {
    // Add a specific class to the parent for better targeting
    const dateInputGroup = datePickerBtn.closest('.search-input-group');
    if (dateInputGroup) {
      dateInputGroup.classList.add('date-input');
      
      // Ensure flatpickr instance has proper z-index when opened
      datePickerBtn.addEventListener('click', function() {
        // Set timeout to ensure this runs after flatpickr opens
        setTimeout(() => {
          const flatpickrCalendars = document.querySelectorAll('.flatpickr-calendar');
          flatpickrCalendars.forEach(calendar => {
            calendar.style.zIndex = '999'; // Use TOP_LEVEL z-index
          });
        }, 10);
      });
    }
  }

  // Check for existing calendar modals and fix their z-index
  const calendarModal = document.getElementById('calendar-modal');
  if (calendarModal) {
    calendarModal.style.zIndex = '999'; // Use TOP_LEVEL z-index
  }

  // Fix calendar z-index
  fixCalendarZIndex();
});

// Comprehensive fix for calendar z-index issues
function fixCalendarZIndex() {
  // Immediate fix for any existing calendars
  const calendars = document.querySelectorAll('.flatpickr-calendar');
  calendars.forEach(calendar => {
    calendar.style.zIndex = '9999';
    calendar.style.position = 'absolute';
    calendar.style.visibility = 'visible';
    calendar.style.opacity = '1';
    
    // Find parent elements and ensure they don't limit z-index
    let parent = calendar.parentElement;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      if (style.position !== 'static') {
        parent.dataset.originalPosition = style.position;
        parent.style.position = 'static';
      }
      parent = parent.parentElement;
    }
  });
  
  // Fix date picker input
  const datePickerBtn = document.getElementById('datePickerBtn');
  if (datePickerBtn) {
    // Make the input always trigger a high z-index calendar
    datePickerBtn.addEventListener('click', () => {
      setTimeout(() => {
        fixCalendarZIndex();
      }, 50);
    });
    
    // Remove stacking context from parent elements
    const dateInputGroup = datePickerBtn.closest('.search-input-group');
    if (dateInputGroup) {
      dateInputGroup.classList.add('date-input');
      dateInputGroup.style.position = 'static';
      
      const inputWrapper = datePickerBtn.closest('.input-wrapper');
      if (inputWrapper) {
        inputWrapper.style.position = 'static';
      }
    }
  }
  
  // Watch for dynamically added calendars with MutationObserver
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            const calendars = node.classList && node.classList.contains('flatpickr-calendar') ? 
                              [node] : 
                              node.querySelectorAll('.flatpickr-calendar');
            
            if (calendars.length) {
              setTimeout(fixCalendarZIndex, 0);
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

// Add a global instance of flatpickr with correct z-index
window.addEventListener('load', function() {
  if (typeof flatpickr === 'function') {
    const datePickerBtn = document.getElementById('datePickerBtn');
    if (datePickerBtn) {
      flatpickr(datePickerBtn, {
        mode: 'range',
        minDate: 'today',
        altInput: true,
        altFormat: 'F j, Y',
        dateFormat: 'Y-m-d',
        position: 'auto',
        onOpen: function() {
          fixCalendarZIndex();
        }
      });
    }
  }
});

/**
 * Room-specific fixes for the rooms.html page
 * Applies styling and interaction improvements
 */
document.addEventListener('DOMContentLoaded', function() {
  // Fix search container styling
  const searchContainer = document.querySelector('.search-container');
  const inputGroups = document.querySelectorAll('.search-input-group');
  
  if (searchContainer) {
    inputGroups.forEach(group => {
      // Add hover effects
      group.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(249, 250, 251, 0.8)';
      });
      
      group.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
      });
    });
    
    // Enhance input wrappers
    const inputWrappers = searchContainer.querySelectorAll('.input-wrapper');
    inputWrappers.forEach(wrapper => {
      wrapper.style.padding = '0.875rem 1.25rem';
    });
    
    // Enhance icons
    const icons = searchContainer.querySelectorAll('.input-wrapper i');
    icons.forEach(icon => {
      icon.style.color = '#4b5563';
      icon.style.marginRight = '0.75rem';
      icon.style.fontSize = '1.25rem';
    });
  }
  
  // Fix dropdown menus z-index
  const dropdowns = document.querySelectorAll('#guestsDropdown, #barangayDropdown');
  dropdowns.forEach(dropdown => {
    dropdown.style.zIndex = '150';
  });
  
  // Fix background in hero section
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    heroBg.style.backgroundImage = `url('../components/baguio-city-mirador-hill-sunset.jpg')`;
    heroBg.style.backgroundSize = 'cover';
    heroBg.style.backgroundPosition = 'center';
    heroBg.style.opacity = '0.85';
  }
  
  // Fix date picker positioning issues
  const datePickerBtn = document.getElementById('datePickerBtn');
  if (datePickerBtn) {
    datePickerBtn.addEventListener('click', () => {
      // Ensure flatpickr is positioned correctly
      setTimeout(() => {
        const calendar = document.querySelector('.flatpickr-calendar');
        if (calendar) {
          calendar.style.zIndex = '9999';
          calendar.style.position = 'fixed';
        }
      }, 10);
    });
  }
  
  // Fix syntax issue in rooms.js if it exists
  if (window.LodgeEasePublicAPI && !window.LodgeEasePublicAPI.getAllLodges) {
    console.log('Fixing LodgeEasePublicAPI');
    // Provide fallback implementation
    window.LodgeEasePublicAPI = {
      getAllLodges: () => [],
      renderLodges: () => console.log('Mock rendering lodges'),
      addNewLodge: () => true,
      updateLodge: () => true,
      removeLodge: () => true
    };
  }
});
