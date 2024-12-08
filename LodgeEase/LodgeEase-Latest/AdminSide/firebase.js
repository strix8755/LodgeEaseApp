// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
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

// Get Firebase services
const db = getFirestore(app);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Function to add a booking
export async function addBooking(bookingData) {
    try {
        const bookingsRef = collection(db, "bookings");
        const docRef = await addDoc(bookingsRef, bookingData);
        console.log("Booking added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding booking: ", error);
        throw error; // Throw the error to handle it in the calling function
    }
}

// Sign-in function
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user; // Return user data
    } catch (error) {
        console.error("Error signing in: ", error.message);
        throw new Error(error.message);
    }
}

// Register function
export async function register(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user; // Return user data
    } catch (error) {
        console.error("Error registering: ", error.message);
        throw new Error(error.message);
    }
}

// Password reset function
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log(`Password reset email sent to ${email}`);
    } catch (error) {
        console.error("Error sending password reset email: ", error.message);
        throw new Error(error.message);
    }
}

// Fetch all rooms
export async function fetchRoomsData() {
    try {
        const querySnapshot = await getDocs(collection(db, "rooms"));
        const roomsData = [];
        querySnapshot.forEach((doc) => {
            roomsData.push({ ...doc.data(), id: doc.id });
        });
        return roomsData; // Return the data fetched from Firestore
    } catch (e) {
        console.error("Error fetching rooms: ", e);
        return [];
    }
}

// Add a new room
export async function addRoom(roomData) {
    try {
        const docRef = await addDoc(collection(db, "rooms"), roomData);
        console.log("Room added with ID: ", docRef.id);
        return docRef.id; // Return the ID of the newly added room
    } catch (e) {
        console.error("Error adding room: ", e);
        return null;
    }
}

// Update a room
export async function updateRoom(roomId, updatedData) {
    try {
        const roomDocRef = doc(db, "rooms", roomId);
        await updateDoc(roomDocRef, updatedData);
        console.log("Room updated successfully!");
    } catch (e) {
        console.error("Error updating room: ", e);
    }
}

// Delete a room
export async function deleteRoom(roomId) {
    try {
        const roomDocRef = doc(db, "rooms", roomId);
        await deleteDoc(roomDocRef);
        console.log("Room deleted successfully!");
    } catch (e) {
        console.error("Error deleting room: ", e);
    }
}

// Fetch room by ID
export async function fetchRoomById(roomId) {
    try {
        const roomDocRef = doc(db, "rooms", roomId);
        const roomDoc = await getDoc(roomDocRef);
        if (roomDoc.exists()) {
            return { ...roomDoc.data(), id: roomDoc.id }; // Return room data if it exists
        } else {
            console.log("No such room!");
            return null; // Handle error for non-existent room
        }
    } catch (e) {
        console.error("Error fetching room by ID: ", e);
        return null;
    }
}

// Export Firebase services for use in other files
export { db, analytics, auth };
