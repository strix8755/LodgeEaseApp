/**
 * Code Protector
 * A utility to protect against code errors and provide fallbacks
 */

(function() {
  console.log('Code Protector: Initialized');
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn
  };
  
  // Override console methods to include timestamps
  function enhanceConsole() {
    console.log = function(...args) {
      const timestamp = new Date().toISOString();
      originalConsole.log(`[${timestamp}]`, ...args);
    };
    
    console.error = function(...args) {
      const timestamp = new Date().toISOString();
      originalConsole.error(`[${timestamp}] ERROR:`, ...args);
    };
    
    console.warn = function(...args) {
      const timestamp = new Date().toISOString();
      originalConsole.warn(`[${timestamp}] WARNING:`, ...args);
    };
  }
  
  // Script fallback mechanism
  function setupScriptFallbacks() {
    window.onerror = function(message, source, lineno, colno, error) {
      console.error("Code Protector: Syntax error detected", { message, source });
      
      if (message.includes('Unexpected end of input') || message.includes('Syntax error')) {
        // Extract script name from source URL
        const scriptMatch = source.match(/\/([^\/]+)$/);
        if (scriptMatch && scriptMatch[1]) {
          const scriptName = scriptMatch[1];
          
          // Don't try to load fallback for fallbacks or the protector itself
          if (scriptName.includes('.fix') || scriptName === 'code-protector.js') {
            return;
          }
          
          console.log(`Code Protector: Loading fallback for ${scriptName}`);
          
          // Create and inject fallback script
          const fallbackScript = document.createElement('script');
          const isModule = Array.from(document.scripts)
            .find(s => s.src.includes(scriptName))?.type === 'module';
            
          fallbackScript.src = source + '.fix';
          if (isModule) {
            fallbackScript.type = 'module';
          }
          
          fallbackScript.onerror = function() {
            console.error(`Code Protector: Fallback script for ${scriptName} failed to load`);
          };
          
          fallbackScript.onload = function() {
            console.log(`Code Protector: Fallback for ${scriptName} loaded successfully`);
          };
          
          document.head.appendChild(fallbackScript);
        }
      }
      
      // Return false to allow the default error handling
      return false;
    };
  }
  
  // Initialize protection
  enhanceConsole();
  setupScriptFallbacks();
  
  // Expose API
  window.CodeProtector = {
    fixBrokenScript: function(scriptName) {
      const fallbackScript = document.createElement('script');
      fallbackScript.src = scriptName + '.fix';
      document.head.appendChild(fallbackScript);
      return fallbackScript;
    }
  };
})();
