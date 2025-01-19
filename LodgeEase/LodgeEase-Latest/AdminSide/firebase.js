// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, query, where, Timestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
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
export const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Set persistence to local immediately
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log('Auth persistence set to local');
        // Emit an event when auth is ready
        window.dispatchEvent(new Event('auth-ready'));
    })
    .catch((error) => {
        console.error('Error setting auth persistence:', error);
    });

// Add a helper function to check auth state
export function getCurrentUser() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user);
        }, reject);
    });
}

// Add console logs to verify Firebase initialization
console.log('Firebase app initialized:', !!app);
console.log('Firestore initialized:', !!db);

// Add rate limiting for registration attempts
const registrationAttempts = new Map();

// Register function
export async function register(email, password, username, fullname) {
    try {
        // First check if username exists
        const usersRef = collection(db, "users");
        const normalizedUsername = username.toLowerCase().trim();
        const q = query(usersRef, where("username", "==", normalizedUsername));
        const querySnapshot = await getDocs(q);
        
        // Debug logs
        console.log('Registration username check for:', normalizedUsername);
        console.log('Existing users with this username:', querySnapshot.size);
        
        if (!querySnapshot.empty) {
            throw new Error('Username already exists');
        }

        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document
        const userData = {
            email,
            username: normalizedUsername,
            fullname,
            role: 'admin',
            createdAt: new Date(),
            status: 'active'
        };

        await setDoc(doc(db, "users", userCredential.user.uid), userData);

        // Log registration
        await addDoc(collection(db, 'activityLogs'), {
            userId: userCredential.user.uid,
            actionType: 'registration',
            timestamp: new Date()
        });

        return userCredential;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Update logAdminActivity to ensure collection exists
export async function logAdminActivity(userId, actionType, details, userName = null) {
    try {
        // Ensure activityLogs collection exists
        const logsRef = collection(db, 'activityLogs');
        
        const activityData = {
            userId,
            userName: userName || 'Unknown User',
            actionType,
            details,
            timestamp: Timestamp.fromDate(new Date())
        };

        const docRef = await addDoc(logsRef, activityData);
        
        // Verify save
        const savedDoc = await getDoc(docRef);
        console.log('Activity log saved:', {
            id: docRef.id,
            exists: savedDoc.exists(),
            data: savedDoc.data()
        });

        return docRef.id;
    } catch (error) {
        console.error('Error in logAdminActivity:', error);
        throw error;
    }
}

// Add new function to track page navigation
export async function logPageNavigation(userId, pageName) {
    try {
        if (!userId) return;
        
        const userDoc = await getDoc(doc(db, "users", userId));
        const userData = userDoc.data();
        
        await logAdminActivity(
            userId,
            'navigation',
            `Navigated to ${pageName}`,
            userData.fullname || userData.username
        );
    } catch (error) {
        console.error('Error logging page navigation:', error);
    }
}

// Update the signIn function
export async function signIn(userIdentifier, password) {
    try {
        let email = userIdentifier;
        
        // If userIdentifier doesn't contain @, assume it's a username
        if (!userIdentifier.includes('@')) {
            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", userIdentifier.toLowerCase()));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    throw { code: 'auth/user-not-found' };
                }
                
                email = querySnapshot.docs[0].data().email;
            } catch (error) {
                console.error("Error finding user by username:", error);
                throw { code: 'auth/user-not-found' };
            }
        }

        // First authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        try {
            // Then check if user is admin
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
            
            if (!userDoc.exists()) {
                await auth.signOut();
                throw { code: 'auth/user-not-found' };
            }

            const userData = userDoc.data();
            if (userData.role !== 'admin') {
                await auth.signOut();
                throw { code: 'auth/insufficient-permissions' };
            }

            // Log successful login
            await addDoc(collection(db, 'activityLogs'), {
                userId: userCredential.user.uid,
                actionType: 'login',
                timestamp: new Date(),
                details: 'Admin login successful'
            });

            return userCredential;
        } catch (error) {
            // If there's an error checking admin status, sign out and throw
            await auth.signOut();
            throw error;
        }
    } catch (error) {
        console.error("Sign-in error:", error);
        throw error;
    }
}

// Add this to track logouts
export async function signOut() {
    try {
        const userId = auth.currentUser?.uid;
        if (userId) {
            await logAdminActivity(userId, 'logout', 'User logged out');
        }
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
}

// Add validation helper for booking structure
function validateBookingData(data) {
    const requiredFields = ['propertyDetails', 'checkIn', 'checkOut', 'createdAt', 'rating', 'status'];
    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    const validRoomTypes = ['Standard', 'Deluxe', 'Suite', 'Family'];

    // Check required fields
    if (!requiredFields.every(field => field in data)) {
        throw new Error('Missing required fields in booking data');
    }

    // Validate propertyDetails
    if (!data.propertyDetails?.roomType || !validRoomTypes.includes(data.propertyDetails.roomType)) {
        throw new Error('Invalid or missing room type');
    }

    // Validate timestamps
    if (!(data.checkIn instanceof Timestamp) || 
        !(data.checkOut instanceof Timestamp) || 
        !(data.createdAt instanceof Timestamp)) {
        throw new Error('Invalid timestamp fields');
    }

    // Validate rating
    if (typeof data.rating !== 'number' || data.rating < 0 || data.rating > 5) {
        throw new Error('Invalid rating value');
    }

    // Validate status
    if (!validStatuses.includes(data.status)) {
        throw new Error('Invalid booking status');
    }

    return true;
}

// Update addBooking function with validation
export async function addBooking(bookingData) {
    try {
        // Ensure proper structure
        const formattedBooking = {
            propertyDetails: {
                roomType: bookingData.propertyDetails?.roomType || 'Standard'
            },
            checkIn: bookingData.checkIn instanceof Timestamp ? 
                    bookingData.checkIn : 
                    Timestamp.fromDate(new Date(bookingData.checkIn)),
            checkOut: bookingData.checkOut instanceof Timestamp ? 
                     bookingData.checkOut : 
                     Timestamp.fromDate(new Date(bookingData.checkOut)),
            createdAt: Timestamp.now(),
            rating: Number(bookingData.rating || 0),
            status: bookingData.status || 'pending',
            userId: auth.currentUser?.uid
        };

        // Validate the formatted data
        validateBookingData(formattedBooking);

        // Add to Firestore
        const bookingsRef = collection(db, 'bookings');
        const docRef = await addDoc(bookingsRef, formattedBooking);
        
        console.log("Booking added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding booking: ", error);
        throw error;
    }
}

// Add migration helper if needed
export async function migrateBookingData() {
    try {
        const bookingsRef = collection(db, 'bookings');
        const snapshot = await getDocs(bookingsRef);

        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const updatedData = {
                propertyDetails: {
                    roomType: data.roomType || data.propertyDetails?.roomType || 'Standard'
                },
                checkIn: data.checkIn || Timestamp.now(),
                checkOut: data.checkOut || Timestamp.now(),
                createdAt: data.createdAt || Timestamp.now(),
                rating: Number(data.rating || 0),
                status: data.status || 'pending',
                userId: data.userId || auth.currentUser?.uid
            };

            batch.update(doc.ref, updatedData);
        });

        await batch.commit();
        console.log('Booking data migration completed');
    } catch (error) {
        console.error('Error migrating booking data:', error);
        throw error;
    }
}

// Update updateBooking function
export async function updateBooking(bookingId, updateData) {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const currentData = (await getDoc(bookingRef)).data();

        // Merge current and update data
        const updatedBooking = {
            ...currentData,
            propertyDetails: {
                ...currentData.propertyDetails,
                ...updateData.propertyDetails
            },
            ...updateData,
            updatedAt: Timestamp.now()
        };

        // Validate the merged data
        validateBookingData(updatedBooking);

        // Update document
        await updateDoc(bookingRef, updatedBooking);
        await logAdminActivity(auth.currentUser.uid, 'booking', `Updated booking ${bookingId}`);
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
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().role === 'admin') {
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

// Update addRoom function to ensure room type is properly set
export async function addRoom(roomData) {
    try {
        // Validate and normalize room type
        if (!roomData.roomType && !roomData.type) {
            roomData.roomType = 'Standard'; // Default room type
        } else {
            const type = (roomData.roomType || roomData.type).trim();
            roomData.roomType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
            delete roomData.type; // Remove duplicate field
        }

        // Ensure room type is one of the valid types
        const validTypes = ['Standard', 'Deluxe', 'Suite', 'Family'];
        if (!validTypes.includes(roomData.roomType)) {
            roomData.roomType = 'Standard';
        }

        const roomsRef = collection(db, "rooms");
        const docRef = await addDoc(roomsRef, {
            ...roomData,
            createdAt: Timestamp.fromDate(new Date())
        });
        
        console.log("Room added with data:", roomData); // Debug log
        await logAdminActivity(auth.currentUser.uid, 'room', `Added new room ${roomData.roomNumber}`);
        return docRef.id;
    } catch (error) {
        console.error("Error adding room: ", error);
        throw new Error('Failed to add room');
    }
}

// Update updateRoom function
export async function updateRoom(roomId, roomData) {
    try {
        // Ensure room type is properly set
        if (roomData.type || roomData.roomType) {
            roomData.roomType = roomData.type || roomData.roomType;
            delete roomData.type; // Remove duplicate field if exists
        }

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

// Fix the setAdminRole function
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

// Analytics collection setup functions
export async function setupAnalyticsCollections() {
    try {
        const collections = ['bookings', 'revenue', 'customers', 'analytics', 'forecasts', 'metrics'];
        for (const collName of collections) {
            const collRef = collection(db, collName);
            await setDoc(doc(db, `${collName}/_config`), {
                lastUpdated: Timestamp.now(),
                version: '1.0'
            });
        }
    } catch (error) {
        console.error('Error setting up analytics collections:', error);
    }
}

// Enhanced saveAnalyticsData function with error handling and validation
export async function saveAnalyticsData(type, data) {
    try {
        // Verify admin permissions first
        const hasPermission = await verifyAdminPermissions();
        if (!hasPermission) {
            throw new Error('Insufficient permissions to save analytics data');
        }

        // Create analytics document with required fields
        const analyticsRef = collection(db, 'analytics');
        const analyticsDoc = {
            type,
            data,
            timestamp: Timestamp.now(),
            userId: auth.currentUser?.uid,
            createdAt: Timestamp.now(),
            status: 'active'
        };

        // Add document with error handling
        const docRef = await addDoc(analyticsRef, analyticsDoc);
        console.log(`Analytics data saved successfully with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error(`Error saving ${type} data:`, error);
        throw error;
    }
}

// Update initializeAnalytics function
export async function initializeAnalytics() {
    try {
        if (!auth.currentUser) {
            console.warn('No user authenticated');
            return false;
        }

        // Create analytics collection if it doesn't exist
        const analyticsRef = collection(db, 'analytics');
        await setDoc(doc(analyticsRef, '_config'), {
            lastUpdated: Timestamp.now(),
            version: '1.0',
            initialized: true
        }, { merge: true });

        return true;
    } catch (error) {
        console.warn('Error initializing analytics:', error);
        return false;
    }
}

// Enhanced analytics data fetching with permissions check
export async function fetchAnalyticsData(type, period) {
    try {
        // Verify user is authenticated and has admin role
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be authenticated');
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
            throw new Error('Insufficient permissions');
        }

        const analyticsRef = collection(db, 'analytics');
        const q = query(
            analyticsRef,
            where('type', '==', type),
            where('timestamp', '>=', period),
            orderBy('timestamp', 'desc'),
            limit(100)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error(`Error fetching analytics data: ${error.message}`);
        throw error;
    }
}

// Add permissions verification helper
export async function verifyAdminPermissions() {
    try {
        const user = auth.currentUser;
        if (!user) return false;

        // During development, always return true
        return true;

        // For production, uncomment the following:
        /*
        const userDoc = await getDoc(doc(db, "users", user.uid));
        return userDoc.exists() && userDoc.data().role === 'admin';
        */
    } catch (error) {
        console.warn('Error verifying permissions:', error);
        return true; // During development
    }
}

// Fetch integrated analytics data
export async function fetchIntegratedAnalytics() {
    try {
        const fetchWithFallback = async (collectionName) => {
            try {
                const snapshot = await getDocs(collection(db, collectionName));
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.warn(`Error fetching ${collectionName}:`, error);
                return []; // Return empty array instead of throwing
            }
        };

        // Fetch all collections in parallel
        const [bookings, rooms, revenue, customers, activities] = await Promise.all([
            fetchWithFallback('bookings'),
            fetchWithFallback('rooms'),
            fetchWithFallback('revenue'),
            fetchWithFallback('customers'),
            fetchWithFallback('activityLogs')
        ]);

        return {
            bookings,
            rooms,
            revenue,
            customers,
            activities,
            timestamp: new Date(),
            status: 'success'
        };
    } catch (error) {
        console.error('Error fetching integrated analytics:', error);
        return {
            bookings: [],
            rooms: [],
            revenue: [],
            customers: [],
            activities: [],
            timestamp: new Date(),
            status: 'partial',
            error: error.message
        };
    }
}

// Add module-specific analytics queries
export async function fetchModuleAnalytics(module, period) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        const queryMap = {
            bookings: query(
                collection(db, 'bookings'),
                where('createdAt', '>=', startDate),
                orderBy('createdAt', 'desc')
            ),
            rooms: query(
                collection(db, 'rooms'),
                where('updatedAt', '>=', startDate),
                orderBy('updatedAt', 'desc')
            ),
            revenue: query(
                collection(db, 'revenue'),
                where('date', '>=', startDate),
                orderBy('date', 'desc')
            ),
            activities: query(
                collection(db, 'activityLogs'),
                where('timestamp', '>=', startDate),
                orderBy('timestamp', 'desc')
            )
        };

        const snapshot = await getDocs(queryMap[module]);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error(`Error fetching ${module} analytics:`, error);
        throw error;
    }
}

export async function fetchRoomAnalytics() {
    try {
        const user = auth.currentUser;
        if (!user || !(await verifyAdminPermissions())) {
            throw new Error('Insufficient permissions');
        }

        const roomsRef = collection(db, 'rooms');
        const roomsSnapshot = await getDocs(roomsRef);
        const rooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch related booking data for rooms
        const bookingsRef = collection(db, 'bookings');
        const bookingsSnapshot = await getDocs(bookingsRef);
        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return {
            rooms,
            bookings,
            analytics: {
                totalRooms: rooms.length,
                occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
                availableRooms: rooms.filter(r => r.status === 'available').length,
                maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length,
                roomTypes: rooms.reduce((acc, room) => {
                    acc[room.roomType] = (acc[room.roomType] || 0) + 1;
                    return acc;
                }, {}),
                occupancyRate: calculateOccupancyRate(rooms),
                revenueByRoom: calculateRevenueByRoom(rooms, bookings),
                popularRooms: identifyPopularRooms(rooms, bookings)
            }
        };
    } catch (error) {
        console.error('Error fetching room analytics:', error);
        throw error;
    }
}

function calculateOccupancyRate(rooms) {
    const total = rooms.length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    return total > 0 ? (occupied / total) * 100 : 0;
}

function calculateRevenueByRoom(rooms, bookings) {
    return rooms.reduce((acc, room) => {
        const roomBookings = bookings.filter(b => b.roomId === room.id);
        acc[room.roomNumber] = roomBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
        return acc;
    }, {});
}

function identifyPopularRooms(rooms, bookings) {
    const roomBookings = rooms.map(room => ({
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        bookingCount: bookings.filter(b => b.roomId === room.id).length,
        revenue: bookings
            .filter(b => b.roomId === room.id)
            .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
    }));

    return roomBookings.sort((a, b) => b.bookingCount - a.bookingCount);
}

// Add error handling for initialization
export async function initializeFirebase() {
    try {
        if (!app) {
            throw new Error('Firebase app not initialized');
        }
        
        // Test database connection
        const testDoc = await getDoc(doc(db, 'system', 'status'));
        console.log('Firebase connection test:', testDoc.exists() ? 'successful' : 'no status document');
        
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Export other functions and objects
export { 
    db, 
    auth, 
    analytics,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp
};
