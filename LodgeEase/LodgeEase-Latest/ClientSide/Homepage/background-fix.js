document.addEventListener('DOMContentLoaded', function() {
    // Apply background directly to body for maximum compatibility
    document.body.style.backgroundImage = "url('https://images.unsplash.com/photo-1573790387438-4da905039392?q=80&w=2050&auto=format&fit=crop')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.filter = "brightness(1.1)"; // Increase brightness by 10%
    
    // Add a fallback background color just in case
    document.body.style.backgroundColor = "#4b5563"; // Use a lighter gray
    
    console.log('Main background styles applied directly via JavaScript');
    
    // Almost no overlay - just 5% black for very slight contrast
    const overlay = document.createElement('div');
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.right = "0";
    overlay.style.bottom = "0";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.05)"; // Ultra-light overlay
    overlay.style.zIndex = "-1";
    document.body.appendChild(overlay);
});
