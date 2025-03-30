/**
 * Room Redirect Fix
 * Prevents redirect loops and ensures proper page navigation for LodgeEase
 */

(function() {
  console.log('Room redirect fix script running');
  
  // Store visited pages to detect loops
  const visitedPages = new Set();
  const currentPage = window.location.pathname;
  
  // Add the current page to visited pages
  visitedPages.add(currentPage);
  
  // Redirect loop protection
  console.log('Redirect loop protection active');
  
  // Check for redirect loops in local storage
  const redirectHistory = JSON.parse(localStorage.getItem('redirectHistory') || '[]');
  const redirectTime = parseInt(localStorage.getItem('redirectTime') || '0');
  const now = Date.now();
  
  // If too many redirects in a short time, stop redirecting
  if (redirectHistory.length > 5 && (now - redirectTime < 5000)) {
    console.warn('Too many redirects detected, stopping redirect chain');
    localStorage.setItem('redirectBlocked', 'true');
    
    // Clear redirect history after 10 seconds
    setTimeout(() => {
      localStorage.removeItem('redirectHistory');
      localStorage.removeItem('redirectTime');
      localStorage.removeItem('redirectBlocked');
    }, 10000);
    
    // Show warning message if we're in a loop
    if (redirectHistory.includes(currentPage)) {
      console.error('Redirect loop detected for page: ' + currentPage);
    }
  } else {
    // Update redirect history
    redirectHistory.push(currentPage);
    if (redirectHistory.length > 10) {
      redirectHistory.shift(); // Keep only the last 10 redirects
    }
    localStorage.setItem('redirectHistory', JSON.stringify(redirectHistory));
    localStorage.setItem('redirectTime', now.toString());
  }
  
  // Utility function to fix broken links
  function fixBrokenLinks() {
    // Find all links on the page
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(link => {
      // Check for broken lodge links
      if (link.href.includes('/Lodge/lodge') && !link.href.includes('.html')) {
        link.href = link.href + '.html';
      }
      
      // Add event listener to capture errors
      link.addEventListener('click', (e) => {
        if (localStorage.getItem('redirectBlocked') === 'true') {
          e.preventDefault();
          console.warn('Navigation blocked due to too many redirects');
          alert('Navigation temporarily disabled due to redirect loop. Please try again in a few seconds.');
        }
      });
    });
  }
  
  // Listen for page errors
  window.addEventListener('error', (e) => {
    console.log('Page error detected:', e.message);
  });
  
  // Run when DOM is loaded
  document.addEventListener('DOMContentLoaded', fixBrokenLinks);
})(); // <-- This is the closing parenthesis and function invocation that was likely missing
