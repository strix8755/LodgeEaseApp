/**
 * Client-side Firebase stub
 * Provides mock Firebase functionality for the client site
 */

console.log('Client-side Firebase stub loaded');

// Create mock auth object
const auth = {
  currentUser: null,
  onAuthStateChanged: function(callback) {
    // Always call with null (not authenticated)
    setTimeout(() => callback(null), 100);
    // Return an unsubscribe function
    return function() {};
  },
  signOut: function() {
    return Promise.resolve();
  }
};

// Mock database
const db = {
  collection: function() {
    return {
      add: function() { return Promise.resolve({ id: 'mock-id' }); },
      doc: function() { 
        return {
          get: function() { return Promise.resolve({ exists: false, data: () => ({}) }); },
          set: function() { return Promise.resolve(); },
          update: function() { return Promise.resolve(); }
        };
      },
      where: function() { return this; },
      orderBy: function() { return this; },
      limit: function() { return this; },
      get: function() { return Promise.resolve({ docs: [] }); }
    };
  },
  doc: function() {
    return {
      get: function() { return Promise.resolve({ exists: false, data: () => ({}) }); },
      set: function() { return Promise.resolve(); },
      update: function() { return Promise.resolve(); }
    };
  }
};

// Mock storage
const storage = {
  ref: function() {
    return {
      put: function() { 
        return {
          on: function() {},
          then: function(callback) { 
            callback();
            return { catch: function() {} };
          }
        };
      },
      getDownloadURL: function() { return Promise.resolve('https://placeholder-image.com/image.jpg'); }
    };
  }
};

// Simple booking functions
export function addBooking(bookingData) {
  console.log('Mock booking added:', bookingData);
  return Promise.resolve({ id: 'mock-booking-id' });
}

export { auth, db, storage };
