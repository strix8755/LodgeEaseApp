/**
 * This script connects the client-side homepage to lodges created in the admin panel
 * It should be included in the rooms.html page
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
// Use the same config as in your admin app
const firebaseConfig = {
  apiKey: "AIzaSyCiNQxfq75gaFStXcHvry5cKz0wUyt6a-s",
  authDomain: "lms-app-2b903.firebaseapp.com",
  projectId: "lms-app-2b903",
  storageBucket: "lms-app-2b903.appspot.com",
  messagingSenderId: "329840168317",
  appId: "1:329840168317:web:c9412211ed14a104597dd4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Fetch lodges from the admin panel to display on the client side
 * @returns {Promise<Array>} Array of lodge data
 */
export async function getAdminLodges() {
  try {
    // Query the lodges collection for items marked to show on client
    const lodgesQuery = query(
      collection(db, "lodges"),
      where("showOnClient", "==", true),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const querySnapshot = await getDocs(lodgesQuery);
    const lodges = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Process Firebase timestamp objects to regular dates
      const processedData = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      };
      
      lodges.push(processedData);
    });
    
    console.log(`Found ${lodges.length} lodges from admin panel`);
    return lodges;
    
  } catch (error) {
    console.error("Error fetching admin lodges:", error);
    return [];
  }
}

/**
 * Admin connector script for LodgeEase
 * Provides compatibility between admin and client systems
 */

// Use immediately-invoked function expression instead of ES modules
(function() {
  console.log('Admin connector initialized');
  
  // Global namespace for admin integration
  window.LodgeEaseAdmin = {
    // These methods will be called by the admin panel
    addLodge: function(lodgeData) {
      console.log('Admin requested to add lodge:', lodgeData);
      if (window.LodgeEasePublicAPI && window.LodgeEasePublicAPI.addNewLodge) {
        return window.LodgeEasePublicAPI.addNewLodge(lodgeData);
      }
      return false;
    },
    
    updateLodge: function(id, lodgeData) {
      console.log('Admin requested to update lodge:', id, lodgeData);
      if (window.LodgeEasePublicAPI && window.LodgeEasePublicAPI.updateLodge) {
        return window.LodgeEasePublicAPI.updateLodge(id, lodgeData);
      }
      return false;
    },
    
    deleteLodge: function(id) {
      console.log('Admin requested to delete lodge:', id);
      if (window.LodgeEasePublicAPI && window.LodgeEasePublicAPI.removeLodge) {
        return window.LodgeEasePublicAPI.removeLodge(id);
      }
      return false;
    }
  };
  
  // Setup user authentication integration
  document.addEventListener('DOMContentLoaded', function() {
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
      loginButton.addEventListener('click', function() {
        window.location.href = '../Login/index.html';
      });
    }
    
    // Check if we're inside an iframe and communicate with parent
    if (window !== window.parent) {
      window.parent.postMessage({ type: 'CLIENT_READY' }, '*');
    }
  });
})();
