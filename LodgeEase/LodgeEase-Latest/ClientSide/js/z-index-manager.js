/**
 * Z-index Manager - Helps maintain consistent z-index values across the application
 */

// Z-index values
const ZIndexManager = {
  // Base layers
  OVERLAY: -1,        // Page overlay
  BACKGROUND: 0,
  DEFAULT: 1,
  CONTENT: 2,         // Main content
  
  // UI Components
  HEADER: 50,
  FILTER_DROPDOWN: 60,
  USER_DRAWER: 70,
  MODAL: 80,
  MAP_VIEW: 90,
  DROPDOWN: 100,
  CALENDAR: 950,      // Add specific value for calendar
  
  // Special cases
  TOP_LEVEL: 999,
  
  // Check if a component should appear above another
  isAbove: function(component1, component2) {
    return this[component1.toUpperCase()] > this[component2.toUpperCase()];
  },
  
  // Get z-index for a component
  get: function(component) {
    return this[component.toUpperCase()] || this.DEFAULT;
  },
  
  // Apply z-index to an element
  apply: function(element, component) {
    if (element) {
      element.style.zIndex = this.get(component);
    }
  }
};

// Apply default z-indices to common elements on load
document.addEventListener('DOMContentLoaded', function() {
  // Header
  const header = document.querySelector('.main-header');
  if (header) ZIndexManager.apply(header, 'HEADER');
  
  // User drawer
  const userDrawer = document.getElementById('userDrawer');
  if (userDrawer) ZIndexManager.apply(userDrawer, 'USER_DRAWER');
  
  // Map view
  const mapView = document.getElementById('mapView');
  if (mapView) ZIndexManager.apply(mapView, 'MAP_VIEW');
  
  // Content
  const container = document.querySelector('.container');
  if (container) ZIndexManager.apply(container, 'CONTENT');
  
  // Dropdowns
  const dropdowns = document.querySelectorAll('.dropdown, #guestsDropdown, #barangayDropdown');
  dropdowns.forEach(dropdown => ZIndexManager.apply(dropdown, 'DROPDOWN'));
  
  // Calendar elements
  const calendarModals = document.querySelectorAll('#calendar-modal, .flatpickr-calendar');
  calendarModals.forEach(cal => ZIndexManager.apply(cal, 'CALENDAR'));
  
  // Add overlay style to body
  const overlay = document.createElement('style');
  overlay.textContent = `
    body::before {
      z-index: ${ZIndexManager.get('OVERLAY')};
    }
  `;
  document.head.appendChild(overlay);
});

// Make available globally
window.ZIndexManager = ZIndexManager;
