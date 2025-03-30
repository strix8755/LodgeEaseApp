/**
 * Client-side Firebase stub
 * Provides mock Firebase functionality for the client site
 * Enhanced with better ES module support
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
  collection: function(collectionPath) {
    return {
      add: function(data) { 
        console.log(`Mock adding data to ${collectionPath}:`, data);
        return Promise.resolve({ id: 'mock-id-' + Date.now() }); 
      },
      doc: function(docId) { 
        return {
          get: function() { 
            return Promise.resolve({ 
              exists: false, 
              data: () => ({}),
              id: docId || 'mock-doc'
            }); 
          },
          set: function(data) { 
            console.log(`Mock setting document ${docId} in ${collectionPath}:`, data);
            return Promise.resolve(); 
          },
          update: function(data) { 
            console.log(`Mock updating document ${docId} in ${collectionPath}:`, data);
            return Promise.resolve(); 
          }
        };
      },
      where: function() { return this; },
      orderBy: function() { return this; },
      limit: function() { return this; },
      get: function() { 
        return Promise.resolve({ docs: [] }); 
      }
    };
  },
  doc: function(path) {
    return {
      get: function() { 
        return Promise.resolve({ 
          exists: false, 
          data: () => ({}),
          id: path.split('/').pop() || 'mock-doc'
        }); 
      },
      set: function(data) { 
        console.log(`Mock setting document at ${path}:`, data);
        return Promise.resolve(); 
      },
      update: function(data) { 
        console.log(`Mock updating document at ${path}:`, data);
        return Promise.resolve(); 
      }
    };
  }
};

// Mock storage
const storage = {
  ref: function(path) {
    return {
      put: function(file) { 
        console.log(`Mock uploading file to ${path}:`, file);
        return {
          on: function(event, progressCb, errorCb, completeCb) {
            // Simulate progress and completion
            setTimeout(() => progressCb({ bytesTransferred: 50, totalBytes: 100 }), 200);
            setTimeout(() => completeCb(), 500);
          },
          then: function(callback) { 
            setTimeout(() => callback(), 500);
            return { 
              catch: function(errorCb) {
                return Promise.resolve();
              } 
            };
          }
        };
      },
      getDownloadURL: function() { 
        return Promise.resolve('https://placeholder-image.com/image.jpg'); 
      }
    };
  }
};

// Mock Firestore object factories
const collection = (dbInstance, path) => db.collection(path);
const doc = (dbInstance, path) => db.doc(path);
const getDoc = (docRef) => docRef.get();
const getDocs = (queryRef) => queryRef.get();
const updateDoc = (docRef, data) => docRef.update(data);
const addDoc = (collectionRef, data) => collectionRef.add(data);
const query = (collectionRef) => collectionRef;
const where = (field, op, value) => ({ field, op, value });
const orderBy = (field, direction) => ({ field, direction });
const limit = (n) => ({ limit: n });

// Mock authentication functions
const signIn = (email, password) => {
  console.log('Mock sign in with:', { email, password });
  return Promise.resolve({ user: { uid: 'mock-user-id', email } });
};

const register = (email, password, username, fullname) => {
  console.log('Mock register with:', { email, password, username, fullname });
  return Promise.resolve({ user: { uid: 'mock-user-id', email } });
};

// Simple booking functions
const addBooking = (bookingData) => {
  console.log('Mock booking added:', bookingData);
  return Promise.resolve({ id: 'mock-booking-id-' + Date.now() });
};

// Expose all the mock functions
export { 
  auth, db, storage, 
  collection, doc, getDoc, getDocs, updateDoc, addDoc,
  query, where, orderBy, limit,
  signIn, register, addBooking
};
