/**
 * Tailwind CSS Dynamic Generator
 * Creates essential Tailwind styles when the CSS file is missing
 */

(function() {
  console.log('Tailwind Generator: Initializing...');
  
  // Check if Tailwind is already loaded
  function isTailwindLoaded() {
    // Check for Tailwind-specific classes on any element
    const testElement = document.createElement('div');
    testElement.className = 'hidden md:block';
    document.body.appendChild(testElement);
    
    const style = window.getComputedStyle(testElement);
    const isHidden = style.display === 'none';
    
    document.body.removeChild(testElement);
    
    // Also check stylesheets
    const stylesheets = Array.from(document.styleSheets);
    const tailwindSheet = stylesheets.some(sheet => {
      try {
        return (sheet.href && (sheet.href.includes('tailwind') || sheet.href.includes('output.css'))) ||
              (sheet.cssRules && Array.from(sheet.cssRules).some(rule => 
                rule.cssText && (rule.cssText.includes('.container') || rule.cssText.includes('@media'))
              ));
      } catch (e) {
        // CORS error when accessing cssRules on cross-origin stylesheet
        return false;
      }
    });
    
    return isHidden || tailwindSheet;
  }
  
  // Generate essential Tailwind CSS classes
  function generateTailwindCSS() {
    if (isTailwindLoaded()) {
      console.log('Tailwind Generator: Tailwind is already loaded');
      return;
    }
    
    console.log('Tailwind Generator: Creating essential styles');
    
    const essentialCSS = `
      /* Essential Tailwind CSS classes */
      .container { width: 100%; margin-left: auto; margin-right: auto; }
      @media (min-width: 640px) { .container { max-width: 640px; } }
      @media (min-width: 768px) { .container { max-width: 768px; } }
      @media (min-width: 1024px) { .container { max-width: 1024px; } }
      @media (min-width: 1280px) { .container { max-width: 1280px; } }
      
      /* Display */
      .hidden { display: none; }
      .block { display: block; }
      .flex { display: flex; }
      .grid { display: grid; }
      .inline { display: inline; }
      .inline-block { display: inline-block; }
      .inline-flex { display: inline-flex; }
      
      /* Flexbox */
      .flex-col { flex-direction: column; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .items-center { align-items: center; }
      .flex-wrap { flex-wrap: wrap; }
      .flex-grow { flex-grow: 1; }
      .flex-shrink-0 { flex-shrink: 0; }
      
      /* Spacing */
      .p-2 { padding: 0.5rem; }
      .p-4 { padding: 1rem; }
      .p-6 { padding: 1.5rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
      .m-2 { margin: 0.5rem; }
      .m-4 { margin: 1rem; }
      .mx-auto { margin-left: auto; margin-right: auto; }
      .mt-2 { margin-top: 0.5rem; }
      .mt-4 { margin-top: 1rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-4 { margin-bottom: 1rem; }
      
      /* Sizing */
      .w-full { width: 100%; }
      .h-full { height: 100%; }
      .max-w-6xl { max-width: 72rem; }
      
      /* Text */
      .text-center { text-align: center; }
      .text-sm { font-size: 0.875rem; }
      .text-lg { font-size: 1.125rem; }
      .text-xl { font-size: 1.25rem; }
      .text-2xl { font-size: 1.5rem; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      
      /* Colors */
      .text-white { color: #ffffff; }
      .text-black { color: #000000; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-800 { color: #1f2937; }
      .text-blue-500 { color: #3b82f6; }
      .text-blue-600 { color: #2563eb; }
      .text-green-500 { color: #10b981; }
      .text-green-600 { color: #059669; }
      .bg-white { background-color: #ffffff; }
      .bg-gray-50 { background-color: #f9fafb; }
      .bg-gray-100 { background-color: #f3f4f6; }
      .bg-blue-500 { background-color: #3b82f6; }
      .bg-blue-600 { background-color: #2563eb; }
      
      /* Borders */
      .rounded { border-radius: 0.25rem; }
      .rounded-lg { border-radius: 0.5rem; }
      .rounded-xl { border-radius: 0.75rem; }
      .rounded-full { border-radius: 9999px; }
      .border { border-width: 1px; }
      .border-gray-200 { border-color: #e5e7eb; }
      
      /* Shadows */
      .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
      
      /* Responsiveness */
      @media (min-width: 768px) {
        .md\\:block { display: block; }
        .md\\:flex { display: flex; }
        .md\\:hidden { display: none; }
        .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (min-width: 1024px) {
        .lg\\:block { display: block; }
        .lg\\:flex { display: flex; }
        .lg\\:hidden { display: none; }
        .lg\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
      }
      
      /* Layout */
      .fixed { position: fixed; }
      .absolute { position: absolute; }
      .relative { position: relative; }
      .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
      .z-10 { z-index: 10; }
      .z-50 { z-index: 50; }
      
              /* Grid */
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .gap-6 { gap: 1.5rem; }
            `;
          
          const styleElement = document.createElement('style');
          styleElement.textContent = essentialCSS;
          document.head.appendChild(styleElement);
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', generateTailwindCSS);
        } else {
          generateTailwindCSS();
        }
      })();
