// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

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

// Set persistence to local
try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('Auth persistence set to local');
} catch (error) {
    console.error('Error setting auth persistence:', error);
}

// Add console logs to verify Firebase initialization
console.log('Firebase app initialized:', !!app);
console.log('Firestore initialized:', !!db);

// Add rate limiting for registration attempts
const registrationAttempts = new Map();

// Register function
export async function register(email, password, username, fullname) {
    try {
        // Input sanitization
        email = email.toLowerCase().trim();
        username = username.toLowerCase().trim();
        fullname = fullname.trim();

        // Additional validation
        if (!email || !password || !username || !fullname) {
            throw { code: 'invalid-input', message: 'All fields are required' };
        }

        // First check if username exists
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            throw { code: 'username-exists', message: 'This username is already taken' };
        }

        // Create user in Firebase Authentication
        console.log("Creating user account in Authentication...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Wait a moment for the auth state to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Store admin user data in Firestore
        const adminUserData = {
            fullname: fullname,
            email: email,
            username: username,
            createdAt: Timestamp.fromDate(new Date()),
            role: 'admin',
            uid: user.uid,
            lastLogin: Timestamp.fromDate(new Date()),
            isAdminPortal: true // Flag to identify admin portal users
        };

        // Store client user data in a separate collection
        const clientUserData = {
            fullname: fullname,
            email: email,
            username: username,
            createdAt: Timestamp.fromDate(new Date()),
            role: 'client',
            uid: user.uid,
            lastLogin: Timestamp.fromDate(new Date()),
            isClientPortal: true // Flag to identify client portal users
        };

        try {
            // Store admin data
            const adminDocRef = doc(db, "admin_users", user.uid);
            await setDoc(adminDocRef, adminUserData);
            console.log("Admin user data stored successfully");

            // Store client data
            const clientDocRef = doc(db, "client_users", user.uid);
            await setDoc(clientDocRef, clientUserData);
            console.log("Client user data stored successfully");
            
            // Also store in main users collection for backward compatibility
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, adminUserData);
            
            return { user, userData: adminUserData };
        } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            // If Firestore save fails, delete the auth user
            try {
                await user.delete();
            } catch (deleteError) {
                console.error("Error deleting auth user after Firestore failure:", deleteError);
            }
            throw { code: 'firestore-error', message: 'Failed to create account. Please try again.' };
        }

    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
}

// Sign-in function
export async function signIn(userIdentifier, password) {
    try {
        let email = userIdentifier;
        
        // If userIdentifier doesn't contain @, assume it's a username
        if (!userIdentifier.includes('@')) {
            try {
                // Check admin_users first
                const adminUsersRef = collection(db, "admin_users");
                let q = query(adminUsersRef, where("username", "==", userIdentifier));
                let querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    throw new Error('auth/user-not-found');
                }
                
                email = querySnapshot.docs[0].data().email;
            } catch (error) {
                console.error("Error finding username:", error);
                throw new Error('auth/invalid-username');
            }
        }

        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential || !userCredential.user) {
            throw new Error('auth/invalid-credential');
        }

        // Check if user exists in admin_users collection
        const adminDoc = await getDoc(doc(db, "admin_users", userCredential.user.uid));
        if (!adminDoc.exists()) {
            throw new Error('access-denied');
        }

        return userCredential;
    } catch (error) {
        console.error("Sign-in error:", error);
        throw error;
    }
}

// Add a new booking
export async function addBooking(bookingData) {
    try {
        console.log('Adding booking with data:', bookingData);
        const bookingsRef = collection(db, 'bookings');
        
        // Add user ID to booking data
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to create a booking');
        }
        
        const bookingWithUser = {
            ...bookingData,
            userId: user.uid,
            createdAt: Timestamp.fromDate(new Date())
        };
        
        const docRef = await addDoc(bookingsRef, bookingWithUser);
        console.log("Booking added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding booking: ", error.message);
        throw error;
    }
}

// Update function for editing bookings
export async function updateBooking(bookingId, updateData) {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
            'propertyDetails.roomNumber': updateData.roomNumber,
            'propertyDetails.roomType': updateData.roomType,
            'propertyDetails.floorLevel': updateData.floorLevel,
            guestName: updateData.guestName,
            status: updateData.status,
            updatedAt: Timestamp.fromDate(new Date())
        });
    } catch (error) {
        console.error("Error updating booking: ", error);
        throw error;
    }
}

// Add this function to check if user is logged in and is admin
export async function checkAdminAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async user => {
            unsubscribe();
            if (user) {
                try {
                    const adminDoc = await getDoc(doc(db, "admin_users", user.uid));
                    if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                        resolve(user);
                    } else {
                        window.location.href = '../Login/index.html';
                    }
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    window.location.href = '../Login/index.html';
                }
            } else {
                window.location.href = '../Login/index.html';
            }
        });
    });
}

// Update the existing checkAuth function
export async function checkAuth() {
    const user = await checkAdminAuth();
    return user;
}

// Update fetchRoomsData to use the new auth check
export async function fetchRoomsData() {
    try {
        // Check authentication
        await checkAuth();

        console.log('Starting to fetch rooms data...');
        const roomsRef = collection(db, "rooms");
        const querySnapshot = await getDocs(roomsRef);
        const rooms = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            source: 'manual'
        }));
        console.log('Successfully fetched rooms:', rooms);
        return rooms;
    } catch (error) {
        console.error("Detailed error in fetchRoomsData:", error);
        if (error.code) console.error('Error code:', error.code);
        if (error.message) console.error('Error message:', error.message);
        throw new Error(`Failed to fetch rooms data: ${error.message}`);
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
        const docRef = await addDoc(roomsRef, {
            ...roomData,
            createdAt: Timestamp.fromDate(new Date())
        });
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

// Add this function to set admin role
export async function setAdminRole(userId) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            role: 'admin'
        });
        console.log('Successfully set admin role for user:', userId);
    } catch (error) {
        console.error('Error setting admin role:', error);
        throw error;
    }
}

// Export other functions and objects
export { 
    db, 
    auth, 
    analytics,
};
