// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBAJr0JQgWRfGTmSXTK6P7Yn8fkHXG2YeE",
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
const analytics = getAnalytics(app);

// Register function
export async function register(email, password, username, fullname) {
    try {
        // First check if username exists
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            throw new Error('username-already-exists');
        }

        // Create user with email and password
        console.log("Creating user account...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("User created, storing additional data...");

        try {
            // Store additional user info in Firestore
            await setDoc(doc(db, "users", user.uid), {
                fullname: fullname,
                email: email,
                username: username,
                createdAt: new Date().toISOString(),
                role: 'client' // Add role to distinguish from admin users
            });
            console.log("User data stored successfully");
        } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            // If Firestore fails, delete the auth user to maintain consistency
            await user.delete();
            throw new Error('Failed to store user data. Please try again.');
        }

        return user;
    } catch (error) {
        console.error("Registration error:", error);
        
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('This email is already registered');
        } else if (error.message === 'username-already-exists') {
            throw new Error('This username is already taken');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Invalid email address');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Password should be at least 6 characters');
        } else {
            throw new Error(error.message);
        }
    }
}

// Sign-in function
export async function signIn(userIdentifier, password) {
    try {
        let email = userIdentifier;
        
        // If userIdentifier doesn't contain @, assume it's a username
        if (!userIdentifier.includes('@')) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", userIdentifier));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                throw new Error('auth/user-not-found');
            }
            
            email = querySnapshot.docs[0].data().email;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Sign-in error:", error);
        throw error;
    }
}

// Export other functions and objects
export { db, auth, analytics };
