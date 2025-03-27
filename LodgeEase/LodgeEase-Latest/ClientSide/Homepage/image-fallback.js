// Hero background image fallback handler
document.addEventListener('DOMContentLoaded', function() {
    const heroBg = document.querySelector('.hero-bg');
    if (!heroBg) return;
    
    // Create a test image to check if the background image loads properly
    const testImage = new Image();
    testImage.onerror = function() {
        console.warn('Hero background image failed to load, applying fallback');
        heroBg.classList.add('fallback');
    };
    
    // Extract the background image URL from the computed style
    const style = window.getComputedStyle(heroBg);
    const bgImage = style.backgroundImage;
    const urlMatch = bgImage.match(/url\(['"]?([^'"()]+)['"]?\)/);
    
    if (urlMatch && urlMatch[1]) {
        testImage.src = urlMatch[1];
    } else {
        // If we can't extract the URL, just apply the fallback
        heroBg.classList.add('fallback');
    }
});
