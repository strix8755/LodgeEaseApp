import { db, auth, app } from '../firebase.js';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    deleteDoc, 
    Timestamp,
    where,
    getDoc,
    addDoc,
    setDoc,
    limit,
    startAfter
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { PageLogger } from '../js/pageLogger.js';
import { ActivityLogger } from '../ActivityLog/activityLogger.js';

// Initialize Firebase Storage with existing app instance
const storage = getStorage(app);
const activityLogger = new ActivityLogger();

// Add activity logging function
async function logRoomActivity(actionType, details) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'activityLogs'), {
            userId: user.uid,
            userName: user.email,
            actionType,
            details,
            timestamp: Timestamp.now(),
            userRole: 'admin',
            module: 'Room Management'
        });
    } catch (error) {
        console.error('Error logging room activity:', error);
    }
}

// Update the deleteRoom function
async function deleteRoom(roomId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to delete rooms');
            return;
        }

        // Get room details before deletion
        const roomDoc = await getDoc(doc(db, 'rooms', roomId));
        if (!roomDoc.exists()) {
            throw new Error('Room not found');
        }

        const roomData = roomDoc.data();
        const roomDetails = `${roomData.propertyDetails.name} - Room ${roomData.propertyDetails.roomNumber} (${roomData.propertyDetails.roomType})`;

        // Confirm deletion
        if (!confirm(`Are you sure you want to delete ${roomDetails}?`)) {
            return;
        }

        // Delete the room
        await deleteDoc(doc(db, 'rooms', roomId));

        // Log the deletion activity
        await activityLogger.logActivity(
            'room_deletion',
            `Room deleted: ${roomDetails}`,
            'Room Management'
        );

        // Show success message
        alert('Room deleted successfully');

    } catch (error) {
        console.error('Error deleting room:', error);
        alert('Error deleting room: ' + error.message);
    }
}

new Vue({
    el: '#app',
    data: {
        bookings: [],
        rooms: [],  // Remove default rooms, we'll fetch all from Firestore
        searchQuery: '',
        loading: true,
        selectedBooking: null,
        isAuthenticated: false,
        showAddRoomModal: false,
        showManualBookingModal: false,
        showClientRoomsModal: false, // Add this new property
        newRoom: {
            establishment: '',
            roomNumber: '',
            roomType: '',
            floorLevel: '',
            price: '',
            description: '',
            status: 'Available'
        },
        establishments: {
            lodge1: {
                name: 'Pine Haven Lodge',
                location: 'Baguio City'
            },
            lodge2: {
                name: 'Mountain View Lodge',
                location: 'La Trinidad'
            }
        },
        selectedImages: [], // Array to store selected images
        maxImages: 5,
        maxImageSize: 5 * 1024 * 1024, // 5MB in bytes
        showManualBookingModal: false,
        availableRooms: [],
        manualBooking: {
            guestName: '',
            email: '',
            contactNumber: '',
            establishment: '',
            roomId: '',
            checkIn: '',
            checkOut: '',
            numberOfGuests: 1,
            paymentStatus: 'Pending'
            },
        clientRooms: [],
        allClientLodges: [], // Add this missing property here
        showClientRoomEditModal: false,
        selectedClientRoom: null,
        // Add new properties for pagination and view mode
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 12,
        viewMode: 'grid',
        lastVisible: null,
        defaultImage: '../../ClientSide/components/default-room.jpg', // Use image from components folder
        // or alternatively:
        // defaultImage: 'https://via.placeholder.com/300x200?text=No+Image', // Use a placeholder image service
        roomsToDisplay: [],
        roomSourceTab: 'database', // Default tab selection
    },
    computed: {
        filteredBookings() {
            const query = this.searchQuery.toLowerCase();
            return this.bookings.filter(booking => {
                const roomNumber = (booking.propertyDetails?.roomNumber || '').toString().toLowerCase();
                const roomType = (booking.propertyDetails?.roomType || '').toString().toLowerCase();
                const guestName = (booking.guestName || '').toLowerCase();
                const status = (booking.status || '').toLowerCase();
                
                return roomNumber.includes(query) || 
                       roomType.includes(query) ||
                       guestName.includes(query) ||
                       status.includes(query);
            });
        },

        minCheckInDate() {
            const now = new Date();
            return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
        },

        calculateNights() {
            if (!this.manualBooking.checkIn || !this.manualBooking.checkOut) return 0;
            const checkIn = new Date(this.manualBooking.checkIn);
            const checkOut = new Date(this.manualBooking.checkOut);
            const diffTime = Math.abs(checkOut - checkIn);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        },

        calculateRoomRate() {
            if (!this.manualBooking.roomId) return 0;
            const selectedRoom = this.availableRooms.find(room => room.id === this.manualBooking.roomId);
            return selectedRoom ? selectedRoom.price : 0;
        },

        calculateSubtotal() {
            return this.calculateRoomRate * this.calculateNights;
        },

        calculateServiceFee() {
            return this.calculateSubtotal * 0.10; // 10% service fee
        },

        calculateTotal() {
            return this.calculateSubtotal + this.calculateServiceFee;
        }
    },
    methods: {
        async fetchBookings() {
            try {
                console.log('Starting to fetch bookings...');
                this.loading = true;

                // Fetch all bookings
                const bookingsRef = collection(db, 'bookings');
                const bookingsQuery = query(bookingsRef, orderBy('createdAt', 'desc')); // Sort by creation date
                const bookingsSnapshot = await getDocs(bookingsQuery);

                // Map the bookings data
                this.bookings = bookingsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log('Raw booking data:', data);

                    return {
                        id: doc.id,
                        ...data,
                        propertyDetails: {
                            roomNumber: data.roomNumber || data.propertyDetails?.roomNumber || 'N/A',
                            roomType: data.roomType || data.propertyDetails?.roomType || 'N/A',
                            floorLevel: data.floorLevel || data.propertyDetails?.floorLevel || 'N/A',
                            name: data.propertyName || data.propertyDetails?.name || 'N/A',
                            location: data.location || data.propertyDetails?.location || 'N/A'
                        },
                        guestName: data.guestName || data.guest?.name || 'N/A',
                        email: data.email || data.guest?.email || 'N/A',
                        contactNumber: data.contactNumber || data.guest?.contact || 'N/A',
                        checkIn: data.checkIn?.toDate?.() || new Date(data.checkIn) || null,
                        checkOut: data.checkOut?.toDate?.() || new Date(data.checkOut) || null,
                        status: this.determineStatus(data),
                        totalPrice: data.totalPrice || 0,
                        serviceFee: data.serviceFee || 0,
                        paymentStatus: data.paymentStatus || 'Pending',
                        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
                        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt) || new Date()
                    };
                });

                console.log('Processed bookings:', this.bookings);
                this.loading = false;
            } catch (error) {
                console.error('Error fetching bookings:', error);
                alert('Error fetching bookings: ' + error.message);
            }
        },

        determineStatus(booking) {
            if (!booking.checkIn || !booking.checkOut) return 'Available';
            
            const now = new Date();
            const checkIn = booking.checkIn?.toDate?.() || new Date(booking.checkIn);
            const checkOut = booking.checkOut?.toDate?.() || new Date(booking.checkOut);

            if (now < checkIn) return 'Confirmed';
            if (now >= checkIn && now <= checkOut) return 'Checked In';
            if (now > checkOut) return 'Checked Out';
            
            return booking.status || 'Pending';
        },

        formatDate(date) {
            if (!date) return '-';
            try {
                if (typeof date === 'string') date = new Date(date);
                if (date.toDate) date = date.toDate();
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                console.error('Date formatting error:', error);
                return '-';
            }
        },

        async checkAdminStatus(user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    return userDoc.data().role === 'admin';
                }
                return false;
            } catch (error) {
                console.error('Error checking admin status:', error);
                return false;
            }
        },

        async updateBookingStatus(booking) {
            try {
                if (!booking.id) {
                    alert('Cannot update a room without a booking');
                    return;
                }

                // Check if user is authenticated and is admin
                const user = auth.currentUser;
                if (!user) {
                    alert('Please log in to update booking status');
                    return;
                }

                // Check admin status
                const isAdmin = await this.checkAdminStatus(user);
                if (!isAdmin) {
                    alert('You need administrator privileges to update bookings');
                    return;
                }

                const newStatus = prompt(
                    'Update status to (type exactly):\n- Pending\n- Confirmed\n- Checked In\n- Checked Out\n- Cancelled',
                    booking.status
                );

                if (!newStatus) return;

                const bookingRef = doc(db, 'bookings', booking.id);
                await updateDoc(bookingRef, {
                    status: newStatus,
                    updatedAt: Timestamp.now(),
                    updatedBy: user.uid
                });

                // Update local state
                const index = this.bookings.findIndex(b => b.id === booking.id);
                if (index !== -1) {
                    this.bookings[index].status = newStatus;
                }

                alert('Booking status updated successfully!');
            } catch (error) {
                console.error('Error updating booking status:', error);
                if (error.code === 'permission-denied') {
                    alert('You do not have permission to update bookings. Please contact your administrator.');
                } else {
                    alert('Failed to update booking status: ' + error.message);
                }
            }
        },

        // Update the deleteBooking function
        async deleteBooking(booking) {
            try {
                if (!booking.id) {
                    alert('Cannot delete a room without a booking');
                    return;
                }

                const user = auth.currentUser;
                if (!user) {
                    alert('Please log in to delete bookings');
                    return;
                }

                // Check admin status
                const isAdmin = await this.checkAdminStatus(user);
                if (!isAdmin) {
                    alert('You need administrator privileges to delete bookings');
                    return;
                }

                if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
                    return;
                }

                // Create detailed room information for logging
                const roomDetails = {
                    roomNumber: booking.propertyDetails?.roomNumber || 'Unknown',
                    propertyName: booking.propertyDetails?.name || 'Unknown Property',
                    roomType: booking.propertyDetails?.roomType || 'Unknown Type'
                };

                // Delete the booking
                const bookingRef = doc(db, 'bookings', booking.id);
                await deleteDoc(bookingRef);

                // Log the deletion with detailed information
                await activityLogger.logActivity(
                    'room_deletion',
                    `Deleted booking for ${roomDetails.propertyName} - Room ${roomDetails.roomNumber} (${roomDetails.roomType})`,
                    'Room Management'
                );

                // Remove from local state
                this.bookings = this.bookings.filter(b => b.id !== booking.id);
                
                alert('Booking deleted successfully!');
                
            } catch (error) {
                console.error('Error deleting booking:', error);
                alert('Failed to delete booking: ' + error.message);
            }
        },

        viewBookingDetails(booking) {
            this.selectedBooking = booking;
        },

        closeModal() {
            this.selectedBooking = null;
        },

        openAddRoomModal() {
            this.showAddRoomModal = true;
        },

        closeAddRoomModal() {
            this.showAddRoomModal = false;
        },

        async addNewRoom() {
            try {
                this.loading = true;

                if (!this.newRoom.establishment) {
                    alert('Please select an establishment');
                    return;
                }

                const establishment = this.establishments[this.newRoom.establishment];

                // Get amenities from checkboxes
                const amenityCheckboxes = document.querySelectorAll('input[name="amenity"]:checked');
                const selectedAmenities = Array.from(amenityCheckboxes).map(cb => cb.value);

                // Create room data object with structure matching client-side
                const roomData = {
                    name: `${establishment.name} - Room ${this.newRoom.roomNumber}`,
                    location: establishment.location,
                    barangay: this.newRoom.establishment === 'lodge1' ? 'Camp 7' : 'Session Road',
                    price: parseFloat(this.newRoom.price),
                    amenities: selectedAmenities,
                    rating: 4.5, // Default rating for new rooms
                    propertyType: this.newRoom.roomType.toLowerCase(),
                    coordinates: {
                        lat: this.newRoom.establishment === 'lodge1' ? 16.4096 : 16.4145,
                        lng: this.newRoom.establishment === 'lodge1' ? 120.6010 : 120.5960
                    },
                    propertyDetails: {
                        roomNumber: this.newRoom.roomNumber,
                        roomType: this.newRoom.roomType,
                        floorLevel: this.newRoom.floorLevel,
                        name: establishment.name,
                        location: establishment.location
                    },
                    description: this.newRoom.description,
                    status: 'Available',
                    establishment: this.newRoom.establishment,
                    showOnClient: true, // Flag to show on client side
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // Add to Firestore
                const roomsRef = collection(db, 'rooms');
                const docRef = await addDoc(roomsRef, roomData);

                // Upload images if any
                if (this.selectedImages.length > 0) {
                    const imageUrls = await this.uploadImages(docRef.id);
                    // Update room document with image URLs
                    await updateDoc(docRef, { 
                        image: imageUrls[0], // Main image for card display
                        additionalImages: imageUrls // All images for detail view
                    });
                    
                    // Add this room to client rooms list
                    roomData.id = docRef.id;
                    roomData.image = imageUrls[0];
                    this.clientRooms.push(roomData);
                }

                // Reset form and close modal
                this.resetNewRoomForm();
                this.closeAddRoomModal();
                
                // Refresh the rooms list
                await this.fetchBookings();
                
                alert('Room added successfully! It will now appear on the client website.');
                await logRoomActivity('room_add', `Added new room ${roomData.propertyDetails.roomNumber} visible on client website`);
            } catch (error) {
                console.error('Error adding room:', error);
                alert('Failed to add room: ' + error.message);
                await logRoomActivity('room_error', `Failed to add room: ${error.message}`);
            } finally {
                this.loading = false;
            }
        },

        resetNewRoomForm() {
            this.newRoom = {
                establishment: '',
                roomNumber: '',
                roomType: '',
                floorLevel: '',
                price: '',
                description: '',
                status: 'Available'
            };
            this.selectedImages = [];
        },

        closeAddRoomModal() {
            this.showAddRoomModal = false;
            this.resetNewRoomForm();
        },

        async handleImageUpload(event) {
            const files = Array.from(event.target.files);
            
            // Validate number of images
            if (this.selectedImages.length + files.length > this.maxImages) {
                alert(`You can only upload up to ${this.maxImages} images`);
                return;
            }

            // Process each file
            for (const file of files) {
                // Validate file size
                if (file.size > this.maxImageSize) {
                    alert(`Image ${file.name} is too large. Maximum size is 5MB`);
                    continue;
                }

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert(`File ${file.name} is not an image`);
                    continue;
                }

                // Create preview URL
                const url = URL.createObjectURL(file);
                this.selectedImages.push({
                    file,
                    url,
                    name: file.name
                });
            }
        },

        removeImage(index) {
            URL.revokeObjectURL(this.selectedImages[index].url);
            this.selectedImages.splice(index, 1);
        },

        async uploadImages(roomId) {
            const imageUrls = [];
            
            for (const image of this.selectedImages) {
                const storageRef = ref(storage, `rooms/${roomId}/${image.name}`);
                
                try {
                    const snapshot = await uploadBytes(storageRef, image.file);
                    const url = await getDownloadURL(snapshot.ref);
                    imageUrls.push(url);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    throw error;
                }
            }
            
            return imageUrls;
        },

        openManualBookingModal() {
            this.showManualBookingModal = true;
            this.resetManualBookingForm();
        },

        closeManualBookingModal() {
            this.showManualBookingModal = false;
            this.resetManualBookingForm();
        },

        resetManualBookingForm() {
            this.manualBooking = {
                guestName: '',
                email: '',
                contactNumber: '',
                establishment: '',
                roomId: '',
                checkIn: '',
                checkOut: '',
                numberOfGuests: 1,
                paymentStatus: 'Pending'
            };
            this.availableRooms = [];
        },

        async fetchAvailableRooms() {
            if (!this.manualBooking.establishment) return;

            try {
                // Generate 50 rooms for the selected establishment
                const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Family'];
                const floorLevels = ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];
                const prices = {
                    'Standard': 2500,
                    'Deluxe': 3500,
                    'Suite': 5000,
                    'Family': 4500
                };

                this.availableRooms = Array.from({ length: 50 }, (_, i) => {
                    const roomNumber = (i + 1).toString().padStart(2, '0');
                    const floorLevel = floorLevels[Math.floor(i / 10)]; // 10 rooms per floor
                    const roomType = roomTypes[i % 4]; // Distribute room types evenly
                    
                    return {
                        id: `room_${this.manualBooking.establishment}_${roomNumber}`,
                        propertyDetails: {
                            roomNumber: roomNumber,
                            roomType: roomType,
                            floorLevel: floorLevel,
                            name: this.establishments[this.manualBooking.establishment].name,
                            location: this.establishments[this.manualBooking.establishment].location
                        },
                        price: prices[roomType],
                        status: 'Available'
                    };
                });

                // Check existing bookings to mark rooms as unavailable
                const bookingsRef = collection(db, 'bookings');
                const bookingsSnapshot = await getDocs(
                    query(
                        bookingsRef,
                        where('establishment', '==', this.manualBooking.establishment),
                        where('status', 'in', ['Confirmed', 'Checked In'])
                    )
                );

                const bookedRoomIds = bookingsSnapshot.docs.map(doc => doc.data().roomId);
                this.availableRooms = this.availableRooms.filter(room => !bookedRoomIds.includes(room.id));

            } catch (error) {
                console.error('Error fetching available rooms:', error);
                alert('Failed to fetch available rooms');
            }
        },

        async submitManualBooking() {
            try {
                this.loading = true;

                const selectedRoom = this.availableRooms.find(room => room.id === this.manualBooking.roomId);
                if (!selectedRoom) {
                    alert('Please select a valid room');
                    return;
                }

                const bookingData = {
                    guestName: this.manualBooking.guestName,
                    email: this.manualBooking.email,
                    contactNumber: this.manualBooking.contactNumber,
                    establishment: this.manualBooking.establishment,
                    roomId: this.manualBooking.roomId,
                    propertyDetails: selectedRoom.propertyDetails,
                    checkIn: new Date(this.manualBooking.checkIn),
                    checkOut: new Date(this.manualBooking.checkOut),
                    numberOfGuests: parseInt(this.manualBooking.numberOfGuests),
                    numberOfNights: this.calculateNights,
                    nightlyRate: this.calculateRoomRate,
                    serviceFee: this.calculateServiceFee,
                    totalPrice: this.calculateTotal,
                    paymentStatus: this.manualBooking.paymentStatus,
                    status: 'Confirmed',
                    bookingType: 'Walk-in',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // First, create or update the room document
                const roomRef = doc(db, 'rooms', this.manualBooking.roomId);
                await setDoc(roomRef, {
                    propertyDetails: selectedRoom.propertyDetails,
                    price: selectedRoom.price,
                    status: 'Occupied',
                    establishment: this.manualBooking.establishment,
                    currentBooking: bookingData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // Then add the booking
                const bookingsRef = collection(db, 'bookings');
                await addDoc(bookingsRef, bookingData);

                // Reset form and close modal
                this.closeManualBookingModal();
                
                // Refresh bookings list
                await this.fetchBookings();
                
                alert('Booking created successfully!');
            } catch (error) {
                console.error('Error creating booking:', error);
                alert('Failed to create booking: ' + error.message);
            } finally {
                this.loading = false;
            }
        },

        async handleLogout() {
            try {
                await signOut(auth);
                window.location.href = '../Login/index.html';
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Error signing out. Please try again.');
            }
        },

        checkAuthState() {
            auth.onAuthStateChanged(user => {
                this.isAuthenticated = !!user;
                if (!user) {
                    window.location.href = '../Login/index.html';
                } else {

                    this.fetchBookings(); // Fetch bookings when user is authenticated
                }
                this.loading = false;
            });
        },

        // Update fetchClientLodges method to extract lodge cards directly from the DOM
        async fetchClientLodges() {
            try {
                this.loading = true;
                
                // Try to fetch the actual lodges from the client-side rooms.html
                try {
                    // First, try to fetch the HTML content
                    const response = await fetch('../../ClientSide/Homepage/rooms.html');
                    if (!response.ok) throw new Error('Could not load rooms.html');
                    
                    const htmlContent = await response.text();
                    
                    // Use DOMParser to parse the HTML content
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlContent, 'text/html');
                    
                    // Extract lodges from script first if available
                    const scriptElements = doc.querySelectorAll('script');
                    let lodgesFromScript = null;
                    
                    for (const script of scriptElements) {
                        const scriptContent = script.textContent;
                        if (scriptContent.includes('const lodges =') || scriptContent.includes('let lodges =')) {
                            const scriptRegex = /(?:const|let)\s+lodges\s*=\s*(\[[\s\S]*?\]);/;
                            const match = scriptContent.match(scriptRegex);
                            
                            if (match && match[1]) {
                                try {
                                    // Clean up the extracted code to make it valid JSON
                                    const jsonStr = match[1].replace(/'/g, '"')
                                                       .replace(/(\w+):/g, '"$1":')
                                                       .replace(/\s+/g, ' ')
                                                       .replace(/,\s*]/g, ']');
                                    lodgesFromScript = JSON.parse(jsonStr);
                                    console.log('Successfully extracted lodges from script:', lodgesFromScript);
                                    break;
                                } catch (jsonError) {
                                    console.error('Failed to parse extracted lodge data from script:', jsonError);
                                }
                            }
                        }
                    }
                    
                    // If we have lodges from script, use them
                    if (lodgesFromScript && lodgesFromScript.length > 0) {
                        this.allClientLodges = lodgesFromScript;
                    } else {
                        // Otherwise, try to extract lodges directly from the DOM elements
                        console.log('Extracting lodge cards directly from DOM...');
                        const lodgeCards = doc.querySelectorAll('.lodge-card');
                        
                        if (lodgeCards.length > 0) {
                            console.log(`Found ${lodgeCards.length} lodge cards in the DOM`);
                            
                            this.allClientLodges = Array.from(lodgeCards).map((card, index) => {
                                try {
                                    // Extract lodge information from the card
                                    const nameElement = card.querySelector('.lodge-title');
                                    const ratingElement = card.querySelector('.lodge-rating span');
                                    const locationElement = card.querySelector('.lodge-location span');
                                    const priceElement = card.querySelector('.lodge-price .price');
                                    const promoPriceElement = card.querySelector('.lodge-price .text-green-600');
                                    const imageElement = card.querySelector('img');
                                    const amenityElements = card.querySelectorAll('.amenity');
                                    
                                    // Convert price strings to numbers
                                    let price = 0;
                                    let promoPrice = null;
                                    
                                    if (priceElement) {
                                        const priceText = priceElement.textContent.trim();
                                        price = parseFloat(priceText.replace(/[₱,]/g, '')) || 0;
                                    }
                                    
                                    if (promoPriceElement) {
                                        const promoPriceText = promoPriceElement.textContent.trim();
                                        promoPrice = parseFloat(promoPriceText.replace(/[₱,]/g, '')) || 0;
                                    }
                                    
                                    // Determine the property type based on amenities or other clues
                                    let propertyType = 'Lodge';
                                    if (amenityElements.length > 0) {
                                        const amenitiesText = Array.from(amenityElements)
                                            .map(el => el.textContent.trim())
                                            .join(' ').toLowerCase();
                                        
                                        if (amenitiesText.includes('pool') || amenitiesText.includes('spa')) {
                                            propertyType = 'Resort';
                                        } else if (amenitiesText.includes('kitchen')) {
                                            propertyType = 'Apartment';
                                        } else if (amenitiesText.includes('fireplace')) {
                                            propertyType = 'Cabin';
                                        }
                                    }
                                    
                                    return {
                                        id: `dom-lodge-${index + 1}`,
                                        name: nameElement ? nameElement.textContent.trim() : `Lodge ${index + 1}`,
                                        rating: ratingElement ? ratingElement.textContent.trim() : '4.5',
                                        location: locationElement ? locationElement.textContent.trim() : 'Baguio City',
                                        price: price,
                                        promoPrice: promoPrice,
                                        image: imageElement ? imageElement.src : '../../ClientSide/components/default-room.jpg',
                                        amenities: Array.from(amenityElements).map(el => el.textContent.trim()),
                                        propertyType: propertyType,
                                        description: `Beautiful ${propertyType.toLowerCase()} in Baguio City with amazing views and comfortable accommodations.`
                                    };
                                } catch (cardError) {
                                    console.error('Error parsing lodge card:', cardError);
                                    return {
                                        id: `dom-lodge-error-${index + 1}`,
                                        name: `Lodge ${index + 1}`,
                                        rating: '4.5',
                                        location: 'Baguio City',
                                        price: 3000,
                                        image: '../../ClientSide/components/default-room.jpg',
                                        amenities: ['WiFi', 'Parking', 'Mountain View'],
                                        propertyType: 'Lodge',
                                        description: 'A comfortable lodge in Baguio City.'
                                    };
                                }
                            });
                            
                            console.log('Extracted lodge data from DOM:', this.allClientLodges);
                        } else {
                            // Fallback to fetching from lodgeData.json
                            console.log('No lodge cards found in DOM, trying lodgeData.json...');
                            const dataResponse = await fetch('../../ClientSide/Homepage/lodgeData.json');
                            if (!dataResponse.ok) throw new Error('Could not load lodgeData.json');
                            
                            this.allClientLodges = await dataResponse.json();
                            console.log('Loaded lodges from lodgeData.json:', this.allClientLodges);
                        }
                    }
                } catch (fetchError) {
                    console.warn('Could not fetch from actual source, using sample data:', fetchError);
                    
                    // Use fallback sample lodges if all extraction methods fail
                    this.allClientLodges = [
                        {
                            id: 'lodge1',
                            name: 'Pine Haven Lodge',
                            location: 'Baguio City',
                            price: 6500,
                            rating: '4.9',
                            image: '../../ClientSide/components/1.jpg',
                            amenities: ['WiFi', 'Fireplace', 'Mountain View'],
                            description: 'A cozy mountain retreat with spectacular views.',
                            propertyType: 'Cabin'
                        },
                        {
                            id: 'lodge2',
                            name: 'Mountain View Suite',
                            location: 'La Trinidad',
                            price: 5200,
                            rating: '4.8',
                            image: '../../ClientSide/components/2.jpg',
                            amenities: ['Pool', 'Restaurant', 'Spa'],
                            description: 'Luxury accommodations with modern amenities.',
                            propertyType: 'Hotel'
                        },
                        // ...existing sample lodges...
                    ];
                }
                
                // If we have extracted a lot of lodges, log the count for verification
                if (this.allClientLodges.length > 0) {
                    console.log(`Successfully loaded ${this.allClientLodges.length} lodges`);
                } else {
                    console.warn('No lodges loaded - using empty array');
                    this.allClientLodges = [];
                }

                // Add additional lodges from the Lodge folder
                const additionalLodges = [
                    {
                        id: 'lodge3',
                        name: "Baguio Hillside Retreat",
                        location: "Burnham Park, Baguio City",
                        barangay: "Burnham-Legarda",
                        image: "../../ClientSide/components/3.jpg",
                        price: 4800,
                        amenities: ["Mountain View", "Kitchen", "WiFi", "Parking"],
                        rating: 4.7,
                        propertyType: "vacation-home",
                        coordinates: {
                            lat: 16.4123,
                            lng: 120.5925
                        },
                        description: "A beautiful retreat with stunning mountain views and modern amenities."
                    },
                    {
                        id: 'lodge4',
                        name: "The Forest Lodge",
                        location: "Session Road Area, Baguio City",
                        barangay: "Session Road",
                        image: "../../ClientSide/components/4.jpg",
                        price: 2800,
                        amenities: ["City View", "WiFi", "Restaurant"],
                        rating: 4.3,
                        propertyType: "hotel",
                        coordinates: {
                            lat: 16.4156,
                            lng: 120.5964
                        },
                        description: "Comfortable accommodation in the heart of Baguio City with excellent city views."
                    },
                    {
                        id: 'lodge5',
                        name: "Super Apartment - Room 6",
                        location: "City Center, Baguio City",
                        barangay: "City Camp Central",
                        image: "../../ClientSide/components/SuperApartmentRoom6.jpg",
                        price: 6000,
                        amenities: ["City View", "WiFi", "Kitchen", "Near Eatery"],
                        rating: 4.4,
                        propertyType: "apartment",
                        description: "Located in Upper Bonifacion Street, offering affordable rooms with comfort and security."
                    },
                    {
                        id: 'lodge6',
                        name: "Wright Park Manor",
                        location: "Wright Park, Baguio City",
                        barangay: "Kisad",
                        image: "../../ClientSide/components/7.jpg",
                        price: 5200,
                        amenities: ["Mountain View", "Kitchen", "Parking", "Pet Friendly"],
                        rating: 4.6,
                        propertyType: "bed-breakfast",
                        coordinates: {
                            lat: 16.4105,
                            lng: 120.6287
                        },
                        description: "Charming bed & breakfast near the famous Wright Park with pet-friendly accommodations."
                    },
                    {
                        id: 'lodge7',
                        name: "Highland Haven",
                        location: "Burnham Park, Baguio City",
                        barangay: "Burnham-Legarda",
                        image: "../../ClientSide/components/8.jpg",
                        price: 4100,
                        amenities: ["City View", "WiFi", "Fitness Center"],
                        rating: 4.4,
                        propertyType: "hotel",
                        coordinates: {
                            lat: 16.4115,
                            lng: 120.5932
                        },
                        description: "Modern hotel with fitness center and great views of Burnham Park."
                    },
                    {
                        id: 'lodge8',
                        name: "Sunset View Villa",
                        location: "Camp John Hay, Baguio City",
                        barangay: "Camp 7",
                        image: "../../ClientSide/components/9.jpg",
                        price: 8900,
                        amenities: ["Mountain View", "Pool", "Kitchen", "Fireplace"],
                        rating: 4.9,
                        propertyType: "vacation-home",
                        coordinates: {
                            lat: 16.4089,
                            lng: 120.6015
                        },
                        description: "Luxurious villa with private pool and stunning sunset views over the mountains."
                    },
                    {
                        id: 'lodge9',
                        name: "Cozy Corner B&B",
                        location: "Wright Park, Baguio City",
                        barangay: "Kisad",
                        image: "../../ClientSide/components/10.jpg",
                        price: 3500,
                        amenities: ["Garden View", "Free Breakfast", "WiFi"],
                        rating: 4.5,
                        propertyType: "bed-breakfast",
                        coordinates: {
                            lat: 16.4112,
                            lng: 120.6291
                        },
                        description: "Homey bed & breakfast with beautiful garden views and complimentary breakfast."
                    },
                    {
                        id: 'lodge10',
                        name: "The Manor Hotel",
                        location: "Camp John Hay, Baguio City",
                        barangay: "Camp 7",
                        image: "../../ClientSide/components/11.jpg",
                        price: 9500,
                        amenities: ["Mountain View", "Spa", "Restaurant", "Room Service"],
                        rating: 4.8,
                        propertyType: "hotel",
                        coordinates: {
                            lat: 16.4098,
                            lng: 120.6018
                        },
                        description: "Prestigious hotel in Camp John Hay with full-service spa and gourmet dining."
                    },
                    {
                        id: 'lodge11',
                        name: "Session Suites",
                        location: "Session Road, Baguio City",
                        barangay: "Session Road",
                        image: "../../ClientSide/components/5.jpg",
                        price: 5800,
                        amenities: ["City View", "WiFi", "24/7 Security", "Kitchen"],
                        rating: 4.6,
                        propertyType: "apartment",
                        description: "Modern suites in the heart of Baguio's commercial district with 24/7 security."
                    },
                    {
                        id: 'lodge12',
                        name: "Burnham Lake House",
                        location: "Burnham Park, Baguio City",
                        barangay: "Burnham-Legarda",
                        image: "../../ClientSide/components/2.jpg",
                        price: 4200,
                        amenities: ["Lake View", "Free Parking", "WiFi", "Garden"],
                        rating: 4.4,
                        propertyType: "guest-house",
                        description: "Charming guest house with beautiful views of Burnham Lake and a private garden."
                    },
                    {
                        id: 'lodge13',
                        name: "Ever Lodge",
                        location: "Baguio City Center, Baguio City",
                        barangay: "Session Road",
                        image: "../../ClientSide/components/6.jpg",
                        price: 1300,
                        promoPrice: 580,
                        amenities: ["Mountain View", "High-speed WiFi", "Fitness Center", "Coffee Shop"],
                        rating: 4.9,
                        propertyType: "hotel",
                        coordinates: {
                            lat: 16.4088,
                            lng: 120.6013
                        },
                        description: "Affordable and modern accommodation with promotional night rates and excellent amenities."
                    }
                ];
                
                // Merge the additional lodges with any existing lodges
                // Make sure we don't have duplicates by checking IDs
                const existingIds = new Set(this.allClientLodges.map(lodge => lodge.id));
                
                for (const lodge of additionalLodges) {
                    if (!existingIds.has(lodge.id)) {
                        this.allClientLodges.push(lodge);
                        existingIds.add(lodge.id);
                    }
                }
                
                console.log(`Successfully loaded ${this.allClientLodges.length} lodges (including Lodge folder ones)`);
                
            } catch (error) {
                console.error('Error fetching client lodges:', error);
                // Don't reset this.allClientLodges here, as we might have partly loaded some lodges
            } finally {
                this.loading = false;
            }
        },

        // Modify openClientRoomsModal to only fetch homepage lodges
        async openClientRoomsModal() {
            // Load saved view preference
            this.viewMode = localStorage.getItem('roomViewMode') || 'grid';
            
            this.showClientRoomsModal = true;
            this.currentPage = 1;
            
            // Only fetch homepage lodges, not database rooms
            await this.fetchClientLodges();
        },

        closeClientRoomsModal() {
            this.showClientRoomsModal = false;
            this.clientRooms = [];  // Clear data to free memory
            this.lastVisible = null;  // Reset pagination
        },

        // Handle image loading errors with fallback to a local image
        handleImageError(e) {
            console.log("Image loading error, using local default image");
            // Use image from components folder
            e.target.src = "../../ClientSide/components/default-room.jpg";
            
            // If the default image also fails, use a simpler fallback
            e.target.onerror = function() {
                e.target.src = "../../ClientSide/components/LodgeEaseLogo.png";
                e.target.onerror = null; // Prevent infinite loop
            };
        },

        // Toggle between grid and list view
        toggleViewMode() {
            this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
            // Save preference
            localStorage.setItem('roomViewMode', this.viewMode);
        },

        // Change pagination page
        async changePage(pageNumber) {
            if (pageNumber >= 1 && pageNumber <= this.totalPages) {
                this.currentPage = pageNumber;
                await this.fetchClientRooms(pageNumber);
            }
        },

        // Add method to view homepage lodge details
        viewHomepageLodge(lodge) {
            // Create a simple modal to display lodge information
            const modalHtml = `
        handleImageError(e) {
                <div id="homepageLodgeModal" class="fixed inset-0 bg-black bg-opacity-50 z-[1001] flex items-center justify-center">
                    <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-bold">${lodge.name}</h2>
                            <button id="closeHomepageLodgeModal" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>
                        <div class="mb-4">
                            <img src="${lodge.image || '../../ClientSide/components/default-room.jpg'}" 
                                 alt="${lodge.name}" 
                                 class="w-full h-64 object-cover rounded-lg">
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p class="text-gray-600">Location</p>
                                <p class="font-semibold">${lodge.location}</p>
                            </div>
                            <div>
                                <p class="text-gray-600">Price</p>
                                <p class="font-semibold">₱${lodge.price?.toLocaleString()} / night</p>
                                ${lodge.promoPrice ? `<p class="text-green-600 font-bold">Promo: ₱${lodge.promoPrice?.toLocaleString()}</p>` : ''}
                            </div>
                            <div>
                                <p class="text-gray-600">Rating</p>
                                <p class="font-semibold">${lodge.rating} <i class="fas fa-star text-yellow-400"></i></p>
                            </div>
                            <div>
                                <p class="text-gray-600">Property Type</p>
                                <p class="font-semibold">${lodge.propertyType || 'Not specified'}</p>
                            </div>
                        </div>
                        <div class="mb-4">
                            <p class="text-gray-600">Amenities</p>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${(lodge.amenities || []).map(amenity => 
                                    `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">${amenity}</span>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="border-t pt-4">
                            <p class="text-sm text-gray-500">This lodge is defined in the homepage data and cannot be edited directly.</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to document
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add event listener to close button
            document.getElementById('closeHomepageLodgeModal').addEventListener('click', () => {
                document.getElementById('homepageLodgeModal').remove();
            });
        },
    },
    async mounted() {
        this.checkAuthState(); // This will handle auth check and fetch bookings
    }
});
