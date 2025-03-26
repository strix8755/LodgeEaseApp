/**
 * Helper functions for Firebase client-side operations
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

// Firebase configuration for client-side
const firebaseConfig = {
  apiKey: "AIzaSyCky7E2U5sffMS8q6mmm99Mp3yCD2d9k9I",
  authDomain: "lms-app-2b903.firebaseapp.com",
  projectId: "lms-app-2b903",
  storageBucket: "lms-app-2b903.appspot.com",
  messagingSenderId: "1046108373013",
  appId: "1:1046108373013:web:fc366db1d92b9c4b860e1c",
  measurementId: "G-WRMW9Z8867"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

/**
 * Check if the user is authenticated
 * @returns {Promise<object>} The user object if authenticated, throws error otherwise
 */
export function checkAuth() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        reject(new Error("Not authenticated"));
      }
    });
  });
}

/**
 * Log page view to analytics
 * @param {string} pageName - Name of the page being viewed
 */
export function logPageView(pageName) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    console.log(`Page view: ${pageName}`);
    // Here you would typically implement actual analytics logging
  } catch (error) {
    console.error("Error logging page view:", error);
  }
}

export { app, auth, db, functions };
