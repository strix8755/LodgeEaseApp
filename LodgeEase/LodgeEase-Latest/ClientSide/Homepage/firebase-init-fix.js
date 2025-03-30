/**
 * Firebase initialization fix
 * This script handles Firebase dependencies and provides mock implementations when needed
 */

(function() {
  // Flag to track if we've already initialized
  let initialized = false;
  
  // Create a promise that resolves when Firebase is ready
  window.firebaseReady = new Promise((resolve) => {
    // Check if Firebase is already available
    if (window.firebase || window.firebaseMock) {
      console.log('Firebase already initialized');
      resolve(window.firebase || window.firebaseMock);
      initialized = true;
      return;
    }
    
    // Try to load Firebase from AdminSide
    const loadAdminFirebase = () => {
      return import('../../AdminSide/firebase.js')
        .then(module => {
          console.log('Loaded Firebase from AdminSide');
          return module;
        })
        .catch(err => {
          console.warn('Failed to load AdminSide Firebase:', err);
          // Fallback to client-side stub
          return import('../firebase.js');
        });
    };
    
    // Try to load Firebase with fallback
    loadAdminFirebase()
      .then(module => {
        console.log('Firebase module loaded:', module);
        window.firebaseModule = module;
        initialized = true;
        resolve(module);
      })
      .catch(err => {
        console.error('All Firebase loading methods failed:', err);
        // Create a minimal mock as last resort
        const mockModule = {
          auth: {
            currentUser: null,
            onAuthStateChanged: (cb) => {
              setTimeout(() => cb(null), 100);
              return () => {};
            }
          },
          db: {
            collection: () => ({
              add: () => Promise.resolve({ id: 'emergency-mock-id' })
            })
          }
        };
        window.firebaseModule = mockModule;
        initialized = true;
        resolve(mockModule);
      });
  });
  
  // Add event when ready
  window.firebaseReady.then(() => {
    document.dispatchEvent(new CustomEvent('firebaseReady'));
    console.log('Firebase ready event dispatched');
  });
  
  // Add helper to get Firebase modules
  window.getFirebase = () => {
    return window.firebaseReady;
  };
  
  console.log('Firebase initialization fix loaded');
})();
