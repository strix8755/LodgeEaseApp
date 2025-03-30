document.addEventListener('DOMContentLoaded', function() {
    // Set background directly on the hero-bg element
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
        // Apply background directly in JavaScript for maximum compatibility
        heroBg.style.backgroundImage = "url('https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=2070&auto=format&fit=crop')";
        heroBg.style.backgroundSize = "cover";
        heroBg.style.backgroundPosition = "center";
        heroBg.style.position = "absolute";
        heroBg.style.inset = "0"; // top, right, bottom, left
        heroBg.style.zIndex = "0";
        heroBg.style.opacity = "0.9";
        
        // Add a fallback background color just in case
        heroBg.style.backgroundColor = "#1e3a8a";
        
        console.log('Hero background styles applied directly');
    }
    
    // Make sure the hero content is visible on top of the background
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.position = "relative";
        heroContent.style.zIndex = "1";
    }
    
    // Fix hero section container
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.style.position = "relative";
        heroSection.style.overflow = "hidden";
        heroSection.style.minHeight = "200px";
    }
});
