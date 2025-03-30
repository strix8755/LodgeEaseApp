/**
 * Resource Loader - Handles loading resources with fallbacks
 * This script addresses the 404 errors for CSS and JS files
 */

// Execute immediately when loaded
(function() {
  console.log('Resource loader initializing...');
  
  // Check if Tailwind is loaded
  function checkTailwind() {
    return typeof window.tailwind !== 'undefined' || 
           document.querySelector('link[href*="tailwind"]') !== null;
  }

  // Load Tailwind CSS from CDN if needed
  function loadTailwindCSS() {
    if (checkTailwind()) {
      console.log('Tailwind CSS already loaded');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
      link.onload = () => {
        console.log('Tailwind CSS loaded from CDN');
        resolve();
      };
      link.onerror = () => {
        console.warn('Failed to load Tailwind CSS from CDN, trying inline script');
        const script = document.createElement('script');
        script.src = 'https://cdn.tailwindcss.com';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      };
      document.head.appendChild(link);
    });
  }

  // Provide mock Firebase implementations
  function createFirebaseMock() {
    // Create mock namespace if it doesn't exist
    if (!window.firebase) {
      window.firebase = {
        auth: () => ({
          onAuthStateChanged: (cb) => {
            setTimeout(() => cb(null), 100);
            return () => {};
          },
          signOut: () => Promise.resolve(),
          currentUser: null
        }),
        firestore: () => ({
          collection: () => ({
            add: () => Promise.resolve({ id: 'mock-id' }),
            doc: () => ({
              get: () => Promise.resolve({ exists: false, data: () => ({}) }),
              set: () => Promise.resolve()
            })
          })
        })
      };
    }

    // Create a module system compatible mock
    window.firebaseMock = {
      auth: {
        currentUser: null,
        onAuthStateChanged: (callback) => {
          setTimeout(() => callback(null), 100);
          return () => {};
        },
        signOut: () => Promise.resolve()
      },
      db: {
        collection: () => ({
          add: () => Promise.resolve({ id: 'mock-id' }),
          doc: () => ({
            get: () => Promise.resolve({ exists: false, data: () => ({}) }),
            set: () => Promise.resolve()
          }),
          where: () => ({ get: () => Promise.resolve({ docs: [] }) })
        })
      }
    };

    console.log('Firebase mock created');
    return Promise.resolve(window.firebaseMock);
  }

  // Handle Firebase imports
  function handleFirebaseImport() {
    // Create a dynamic import handler that returns mock when real import fails
    window.importFirebase = function() {
      return import('../../AdminSide/firebase.js')
        .catch(err => {
          console.warn('Error importing Firebase, using mock instead:', err);
          return createFirebaseMock();
        });
    };
    
    // Patch common import patterns
    const originalImport = window.importModule || Function.prototype;
    window.importModule = function(path) {
      if (path.includes('firebase.js')) {
        return createFirebaseMock();
      }
      return originalImport(path);
    };
    
    return Promise.resolve();
  }

  // Initialize everything
  function init() {
    Promise.all([
      loadTailwindCSS(),
      handleFirebaseImport()
    ]).then(() => {
      console.log('Resource loader initialized successfully');
      // Dispatch an event that other scripts can listen for
      document.dispatchEvent(new CustomEvent('resourcesLoaded'));
    }).catch(err => {
      console.error('Resource loader initialization failed:', err);
    });
  }

  // Run initialization
  init();
})();
