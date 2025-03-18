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

// PostgreSQL connection service - import the service module
import { pgService } from '../services/postgres-service.js';

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
        pgService, // Add the pgService import to data so it's available in templates
        bookings: [],
        rooms: [],  // Remove default rooms, we'll fetch all from Firestore
        searchQuery: '',
        loading: true,
        selectedBooking: null,
        isAuthenticated: false,
        showAddRoomModal: false,
        showManualBookingModal: false,
        showClientRoomsModal: false, // Add this new property
        newLodge: {
            name: '',
            location: '',
            barangay: '',
            price: '',
            promoPrice: '',
            amenities: [],
            rating: 4.5,
            propertyType: '',
            description: '',
            roomNumber: '',
            coordinates: {
                lat: 16.4023, // Default Baguio City coordinates
                lng: 120.5960
            }
        },
        availableAmenities: [
            'Mountain View', 'WiFi', 'Kitchen', 'Parking', 'Fireplace', 'City View',
            'Pool', 'Restaurant', 'Spa', 'Pet Friendly', 'Fitness Center', 'Free Breakfast',
            'Room Service', 'High-speed WiFi', 'Coffee Shop', '24/7 Security', 'Air Conditioning',
            'Hot Tub', 'Garden', 'Terrace', 'TV', 'Lake View', 'Near Eatery'
        ],
        barangays: [
            'Session Road', 'Camp 7', 'Burnham-Legarda', 'Kisad', 'City Camp Central',
            'Abanao-Zandueta-Kayong-Chugum-Otek', 'Alfonso Tabora', 'Ambiong',
            'Andres Bonifacio', 'Apugan-Loakan', 'Aurora Hill North Central',
            'Aurora Hill Proper', 'Aurora Hill South Central', 'Bagong Abreza',
            'BGH Compound', 'Cabinet Hill-Teachers Camp', 'Camp 8', 'Camp Allen',
        ],
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
        uploadProgress: [], // Track progress for each image upload
        imageSaveMethod: 'postgresql', // 'firebase' or 'postgresql'
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
        defaultImage: '../images/default-room.jpg', // Changed to use an image in the AdminSide/images folder
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
        },

        previewImage() {
            if (this.selectedImages.length > 0) {
                return this.selectedImages[0].url;
            }
            return this.defaultImage; // Use the instance property
        },
        
        isPreviewBestValue() {
            // Logic to determine if this lodge should be marked as "best value"
            // For example, if it has a promo price and the discount is substantial
            if (!this.newLodge.price || !this.newLodge.promoPrice) return false;
            
            const regularPrice = parseFloat(this.newLodge.price);
            const promoPrice = parseFloat(this.newLodge.promoPrice);
            
            // If discount is more than 50%
            return promoPrice < (regularPrice * 0.5);
        },
        
        isFormValid() {
            return this.newLodge.name && 
                   this.newLodge.location && 
                   this.newLodge.barangay && 
                   this.newLodge.price && 
                   this.newLodge.propertyType && 
                   this.newLodge.description &&
                   this.newLodge.amenities.length >= 2 &&
                   this.selectedImages.length > 0;
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

        async addNewLodge() {
            try {
                this.loading = true;

                if (!this.isFormValid) {
                    alert('Please fill in all required fields and add at least one image');
                    return;
                }

                // Check if PostgreSQL is available if that's the selected method
                if (this.imageSaveMethod === 'postgresql') {
                    const isPostgresAvailable = await this.checkPostgresAvailability();
                    
                    if (!isPostgresAvailable) {
                        console.warn('PostgreSQL service is unavailable, falling back to Firebase storage');
                        // Fall back to Firebase
                        this.imageSaveMethod = 'firebase';
                        
                        // Show a warning to the user
                        alert('PostgreSQL image service is unavailable. Your images will be saved using Firebase Storage instead.');
                    }
                }

                // Generate a unique ID for the lodge (timestamp + random number)
                const newLodgeId = Date.now().toString() + Math.floor(Math.random() * 1000);

                // Create lodge data object with structure matching client-side
                const lodgeData = {
                    id: parseInt(newLodgeId.slice(-5)), // Use last 5 digits as numeric ID
                    name: this.newLodge.name,
                    location: this.newLodge.location,
                    barangay: this.newLodge.barangay,
                    price: parseFloat(this.newLodge.price),
                    promoPrice: this.newLodge.promoPrice ? parseFloat(this.newLodge.promoPrice) : null,
                    amenities: [...this.newLodge.amenities],
                    rating: parseFloat(this.newLodge.rating),
                    propertyType: this.newLodge.propertyType,
                    coordinates: {
                        lat: parseFloat(this.newLodge.coordinates.lat),
                        lng: parseFloat(this.newLodge.coordinates.lng)
                    },
                    description: this.newLodge.description,
                    propertyDetails: {
                        roomNumber: this.newLodge.roomNumber || 'N/A',
                        roomType: this.newLodge.propertyType,
                        name: this.newLodge.name,
                        location: this.newLodge.location
                    },
                    status: 'Available',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    showOnClient: true // Flag to show on client side
                };

                // Add to Firestore
                const lodgesRef = collection(db, 'lodges');
                const docRef = await addDoc(lodgesRef, lodgeData);
                
                // Initialize image URLs array
                let imageUrls = [];
                
                // Upload images if any
                if (this.selectedImages.length > 0) {
                    try {
                        if (this.imageSaveMethod === 'postgresql') {
                            // Try uploading to PostgreSQL
                            imageUrls = await this.uploadImagesToPG(newLodgeId);
                        } else {
                            // Use Firebase Storage
                            imageUrls = await this.uploadImages(newLodgeId);
                        }
                    } catch (uploadError) {
                        console.error('Error during image upload:', uploadError);
                        
                        // If PostgreSQL fails, try Firebase as fallback
                        if (this.imageSaveMethod === 'postgresql') {
                            console.warn('Failed to upload to PostgreSQL, trying Firebase instead');
                            alert('PostgreSQL upload failed. Trying Firebase Storage as a fallback...');
                            this.imageSaveMethod = 'firebase';
                            imageUrls = await this.uploadImages(newLodgeId);
                        } else {
                            // If Firebase also fails, rethrow the error
                            throw uploadError;
                        }
                    }
                    
                    // Update lodge document with image URLs
                    await updateDoc(docRef, { 
                        image: imageUrls[0], // Main image for card display
                        additionalImages: imageUrls, // All images for detail view
                        imageStorage: this.imageSaveMethod // Track where images are stored
                    });
                    
                    // Update the lodge data with image URL
                    lodgeData.image = imageUrls[0];
                    lodgeData.additionalImages = imageUrls;
                    lodgeData.imageStorage = this.imageSaveMethod;
                }

                // Create a room reference in the rooms collection to connect the systems
                const roomsRef = collection(db, 'rooms');
                await addDoc(roomsRef, {
                    lodgeId: docRef.id,
                    ...lodgeData,
                });

                // Reset form and close modal
                this.resetNewLodgeForm();
                this.closeAddRoomModal();
                
                alert('Lodge added successfully! It will now appear on the client website.');
                await logRoomActivity('lodge_add', `Added new lodge "${lodgeData.name}" to client website using ${this.imageSaveMethod} storage`);
                
                // Refresh the client lodges list if the modal is open
                if (this.showClientRoomsModal) {
                    await this.fetchClientLodges();
                }
            } catch (error) {
                console.error('Error adding lodge:', error);
                alert('Failed to add lodge: ' + error.message);
                await logRoomActivity('lodge_error', `Failed to add lodge: ${error.message}`);
            } finally {
                this.loading = false;
            }
        },

        resetNewLodgeForm() {
            this.newLodge = {
                name: '',
                location: '',
                barangay: '',
                price: '',
                promoPrice: '',
                amenities: [],
                rating: 4.5,
                propertyType: '',
                description: '',
                roomNumber: '',
                coordinates: {
                    lat: 16.4023, // Default Baguio City coordinates
                    lng: 120.5960
                }
            };
            this.selectedImages = [];
        },

        closeAddRoomModal() {
            this.showAddRoomModal = false;
            this.resetNewLodgeForm();
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

                // Read file as DataURL for preview and PostgreSQL upload
                const reader = new FileReader();
                reader.onload = (e) => {
                    const url = URL.createObjectURL(file);
                    this.selectedImages.push({
                        file,
                        url,          // For preview (Object URL)
                        dataUrl: e.target.result,  // For PostgreSQL storage
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        progress: 0   // Upload progress
                    });
                };
                reader.readAsDataURL(file);
            }
        },

        removeImage(index) {
            URL.revokeObjectURL(this.selectedImages[index].url);
            this.selectedImages.splice(index, 1);
        },

        // Add new method to upload images to PostgreSQL
        async uploadImagesToPG(lodgeId) {
            const imageUrls = [];
            this.uploadProgress = this.selectedImages.map(() => 0);
            
            try {
                // For each image, upload to PostgreSQL through our backend API
                for (let i = 0; i < this.selectedImages.length; i++) {
                    const image = this.selectedImages[i];
                    
                    // Update progress for UI feedback
                    this.uploadProgress[i] = 10;
                    
                    try {
                        // Extract the base64 image data (remove data:image/jpeg;base64, prefix)
                        const base64Data = image.dataUrl.split(',')[1];
                        
                        // Prepare data for PostgreSQL insertion
                        const imageData = {
                            lodge_id: lodgeId,
                            image_name: image.name,
                            image_data: base64Data,
                            image_type: image.type,
                            image_size: image.size,
                            is_primary: i === 0 // First image is primary
                        };
                        
                        // Call the PostgreSQL service to store the image
                        this.uploadProgress[i] = 50;
                        
                        const response = await pgService.saveImage(imageData);
                        
                        this.uploadProgress[i] = 100;
                        
                        // Create a URL that will fetch this image from our API
                        const imageUrl = `/api/lodges/${lodgeId}/images/${response.image_id}`;
                        imageUrls.push(imageUrl);
                        
                        console.log(`Uploaded image ${i+1}/${this.selectedImages.length} to PostgreSQL`);
                    } catch (err) {
                        console.error(`Error uploading image ${i+1}:`, err);
                        throw new Error(`Failed to upload image ${i+1}: ${err.message}`);
                    }
                }
                
                return imageUrls;
                
            } catch (error) {
                console.error('Error uploading images to PostgreSQL:', error);
                throw new Error(`PostgreSQL image upload failed: ${error.message}`);
            }
        },

        // Keep existing Firebase uploadImages method as backup
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

        // Add method to toggle between Firebase and PostgreSQL storage
        toggleImageStorage() {
            this.imageSaveMethod = this.imageSaveMethod === 'firebase' ? 'postgresql' : 'firebase';
            console.log(`Image storage method changed to: ${this.imageSaveMethod}`);
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
                
                // First, fetch lodges from Firestore that we've added
                const lodgesRef = collection(db, 'lodges');
                const lodgesQuery = query(lodgesRef, where('showOnClient', '==', true));
                const lodgesSnapshot = await getDocs(lodgesQuery);
                
                // Map Firestore lodges
                const firestoreLodges = lodgesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    
                    // Handle PostgreSQL image URLs
                    let imageUrl = data.image;
                    if (data.imageStorage === 'postgresql' && imageUrl && !imageUrl.startsWith('http')) {
                        // Prepend API base URL if it's a relative PostgreSQL image path
                        imageUrl = `${window.location.origin}${imageUrl}`;
                    }
                    
                    return {
                        id: doc.id,
                        ...data,
                        image: imageUrl,
                        // Convert any server timestamps to JS dates
                        createdAt: data.createdAt?.toDate?.() || data.createdAt,
                        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
                    };
                });
                
                // Continue with existing code to fetch client-side lodges
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

                // Add our Firestore lodges to the mix and deduplicate
                const existingIds = new Set(this.allClientLodges.map(lodge => lodge.id));
                
                for (const lodge of firestoreLodges) {
                    if (!existingIds.has(lodge.id)) {
                        this.allClientLodges.push(lodge);
                        existingIds.add(lodge.id);
                    }
                }
                
                console.log(`Successfully loaded ${this.allClientLodges.length} lodges (including Firestore ones)`);
                
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
            console.log("Image loading error, trying to fix source URL");
            
            const imgSrc = e.target.src;
            
            // Check if this might be a PostgreSQL image path with missing base URL
            if (imgSrc && !imgSrc.startsWith('http') && imgSrc.includes('/api/lodges/')) {
                // Add origin to relative URL
                e.target.src = `${window.location.origin}${imgSrc}`;
                return;
            }
            
            // Fallback to default image if the above fix didn't work
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
        
        // Add this method to preload default images
        preloadDefaultImages() {
            // Create an array of all possible default image paths
            const imagePaths = [
                '../images/default-room.jpg',
                '../../ClientSide/components/default-room.jpg',
                '../images/LodgeEaseLogo.png',
                '../../ClientSide/components/LodgeEaseLogo.png'
            ];
            
            // Preload these images
            imagePaths.forEach(path => {
                const img = new Image();
                img.src = path;
            });
        },

        useDefaultCoordinates() {
            this.newLodge.coordinates = {
                lat: 16.4023,
                lng: 120.5960
            };
        },
        
        openMapsInNewTab() {
            const url = `https://www.google.com/maps/search/?api=1&query=Baguio+City+Philippines`;
            window.open(url, '_blank');
        },

        // Add this method to check if PostgreSQL service is available
        async checkPostgresAvailability() {
            try {
                const isAvailable = await pgService.checkConnection();
                console.log(`PostgreSQL service is ${isAvailable ? 'available' : 'unavailable'}`);
                return isAvailable;
            } catch (error) {
                console.error('Error checking PostgreSQL availability:', error);
                return false;
            }
        },
    },
    async mounted() {
        this.checkAuthState(); // This will handle auth check and fetch bookings
        
        // Preload default images
        this.preloadDefaultImages();
    }
});