/**
 * Ultra-light background implementation that removes all dark overlays
 * and maximizes brightness of the background image
 */
(function() {
    console.log('Ultra-light background fix applying...');
    
    // Remove any existing overlays first
    const existingOverlays = document.querySelectorAll('div[style*="background-color: rgba(0, 0, 0,"]');
    existingOverlays.forEach(overlay => overlay.remove());
    
    // Apply very bright background directly to body
    const imageUrl = 'https://images.unsplash.com/photo-1573790387438-4da905039392?q=80&w=2050&auto=format&fit=crop';
    document.body.style.backgroundImage = `url('${imageUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.filter = 'brightness(1.15)'; // Increase brightness
    
    // Add a WHITE overlay with very minimal opacity for slightly better text contrast
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; // Almost invisible white overlay
    overlay.style.zIndex = '-1';
    document.body.appendChild(overlay);
    
    // Remove any ::before pseudo-elements that might have dark backgrounds
    const style = document.createElement('style');
    style.textContent = `
        body::before {
            display: none !important;
            background-color: transparent !important;
            opacity: 0 !important;
        }
        
        .bg-overlay {
            display: none !important;
            background-color: transparent !important;
            opacity: 0 !important;
        }
        
        /* Make content backgrounds more transparent to show the background */
        aside.w-1\\/4 {
            background-color: rgba(255, 255, 255, 0.85) !important;
        }
        
        /* Ensure text is readable on lighter background */
        .hero-title, .hero-subtitle {
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5) !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('Ultra-light background applied successfully');
})();
