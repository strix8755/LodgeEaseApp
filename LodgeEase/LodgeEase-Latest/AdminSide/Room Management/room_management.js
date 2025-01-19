import { db, auth } from '../firebase.js';
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
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Initialize Firebase Storage
const storage = getStorage();

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
        }
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

        async deleteBooking(booking) {
            try {
                if (!booking.id) {
                    alert('Cannot delete a room without a booking');
                    return;
                }

                // Check if user is authenticated and is admin
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

                const bookingRef = doc(db, 'bookings', booking.id);
                await deleteDoc(bookingRef);

                // Remove from local state
                this.bookings = this.bookings.filter(b => b.id !== booking.id);
                
                alert('Booking deleted successfully!');
            } catch (error) {
                console.error('Error deleting booking:', error);
                if (error.code === 'permission-denied') {
                    alert('You do not have permission to delete bookings. Please contact your administrator.');
                } else {
                    alert('Failed to delete booking: ' + error.message);
                }
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

                // Create room data object
                const roomData = {
                    propertyDetails: {
                        roomNumber: this.newRoom.roomNumber,
                        roomType: this.newRoom.roomType,
                        floorLevel: this.newRoom.floorLevel,
                        name: establishment.name,
                        location: establishment.location
                    },
                    price: parseFloat(this.newRoom.price),
                    description: this.newRoom.description,
                    status: 'Available',
                    establishment: this.newRoom.establishment,
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
                    await updateDoc(docRef, { images: imageUrls });
                }

                // Reset form and close modal
                this.resetNewRoomForm();
                this.closeAddRoomModal();
                
                // Refresh the rooms list
                await this.fetchBookings();
                
                alert('Room added successfully!');
            } catch (error) {
                console.error('Error adding room:', error);
                alert('Failed to add room: ' + error.message);
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
        }
    },
    async mounted() {
        this.checkAuthState(); // This will handle auth check and fetch bookings
    }
});
