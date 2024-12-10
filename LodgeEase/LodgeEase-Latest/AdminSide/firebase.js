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

// Add booking function
export async function addBooking(bookingData) {
    try {
        const bookingsRef = collection(db, "bookings");
        const docRef = await addDoc(bookingsRef, bookingData);
        console.log("Booking added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding booking: ", error);
        throw new Error('Failed to add booking');
    }
}

// Fetch all rooms data
export async function fetchRoomsData() {
    try {
        const roomsRef = collection(db, "rooms");
        const querySnapshot = await getDocs(roomsRef);
        const rooms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return rooms;
    } catch (error) {
        console.error("Error fetching rooms data: ", error);
        throw new Error('Failed to fetch rooms data');
    }
}

// Fetch a room by ID
export async function fetchRoomById(roomId) {
    try {
        const roomRef = doc(db, "rooms", roomId);
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
            throw new Error('Room not found');
        }
        return { id: roomDoc.id, ...roomDoc.data() };
    } catch (error) {
        console.error("Error fetching room by ID: ", error);
        throw new Error('Failed to fetch room by ID');
    }
}

// Add a new room
export async function addRoom(roomData) {
    try {
        const roomsRef = collection(db, "rooms");
        const docRef = await addDoc(roomsRef, roomData);
        console.log("Room added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding room: ", error);
        throw new Error('Failed to add room');
    }
}

// Update an existing room
export async function updateRoom(roomId, roomData) {
    try {
        const roomRef = doc(db, "rooms", roomId);
        await updateDoc(roomRef, roomData);
        console.log("Room updated with ID: ", roomId);
    } catch (error) {
        console.error("Error updating room: ", error);
        throw new Error('Failed to update room');
    }
}

// Delete a room
export async function deleteRoom(roomId) {
    try {
        const roomRef = doc(db, "rooms", roomId);
        await deleteDoc(roomRef);
        console.log("Room deleted with ID: ", roomId);
    } catch (error) {
        console.error("Error deleting room: ", error);
        throw new Error('Failed to delete room');
    }
}

// Export other functions and objects
export { db, auth, analytics };
