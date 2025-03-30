/**
 * Enhanced background fix with debugging, error handling, and multiple fallback approaches
 */
(function() {
    console.log('Enhanced background fix script starting...');

    // Try multiple methods to ensure background is applied
    function applyBackgroundImage() {
        // Method 1: Direct style application to body
        const imageUrl = 'https://images.unsplash.com/photo-1573790387438-4da905039392?q=80&w=2050&auto=format&fit=crop';
        document.body.style.backgroundImage = `url('${imageUrl}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundRepeat = 'no-repeat';
        
        console.log('Method 1: Direct style applied to body');

        // Method 2: Add a background div (more reliable in some browsers)
        const bgDiv = document.createElement('div');
        bgDiv.id = 'background-container';
        bgDiv.style.position = 'fixed';
        bgDiv.style.top = '0';
        bgDiv.style.left = '0';
        bgDiv.style.right = '0';
        bgDiv.style.bottom = '0';
        bgDiv.style.backgroundImage = `url('${imageUrl}')`;
        bgDiv.style.backgroundSize = 'cover';
        bgDiv.style.backgroundPosition = 'center center';
        bgDiv.style.backgroundRepeat = 'no-repeat';
        bgDiv.style.zIndex = '-2';
        document.body.insertBefore(bgDiv, document.body.firstChild);
        
        console.log('Method 2: Background div created and inserted');

        // Method 3: Add an actual image element as background
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.style.position = 'fixed';
        imgElement.style.top = '0';
        imgElement.style.left = '0';
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        imgElement.style.objectFit = 'cover';
        imgElement.style.zIndex = '-3';
        imgElement.style.opacity = '1';
        
        // Add error handling for the image
        imgElement.onerror = function() {
            console.error('Background image failed to load, trying alternative');
            this.src = 'https://images.unsplash.com/photo-1508615070457-7baeba4003ab?q=80&w=2070&auto=format&fit=crop'; // Alternate image
        };
        
        // Add load event to confirm image loaded successfully
        imgElement.onload = function() {
            console.log('Background image loaded successfully');
            document.body.insertBefore(this, document.body.firstChild);
        };
        
        console.log('Method 3: Image element created');

        // Create a semi-transparent overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'; // Reduced opacity from 0.4 to 0.2
        overlay.style.zIndex = '-1';
        document.body.appendChild(overlay);
        
        console.log('Overlay added for better text readability');

        // Add a class to body for CSS targeting
        document.body.classList.add('background-applied');
    }

    // Run on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyBackgroundImage);
    } else {
        applyBackgroundImage();
    }

    // Run again on window load to ensure it works
    window.addEventListener('load', function() {
        // Check if background is visible
        setTimeout(function() {
            const computed = window.getComputedStyle(document.body);
            if (!computed.backgroundImage || computed.backgroundImage === 'none') {
                console.warn('Background still not visible, applying emergency fix');
                applyBackgroundImage();
            }
        }, 500);
    });
})();
