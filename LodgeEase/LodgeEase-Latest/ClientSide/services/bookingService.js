import { db } from '../../AdminSide/firebase.js';
import { collection, addDoc, updateDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

export class BookingService {
    constructor() {
        this.bookingsCollection = 'bookings';
    }

    /**
     * Save a new booking to Firestore
     * @param {Object} bookingData - The booking information
     * @returns {Promise<string>} The booking ID
     */
    async saveBooking(bookingData) {
        try {
            // Validate booking data
            this.validateBookingData(bookingData);

            // Format dates as Timestamps
            const formattedBooking = {
                ...bookingData,
                checkIn: Timestamp.fromDate(new Date(bookingData.checkIn)),
                checkOut: Timestamp.fromDate(new Date(bookingData.checkOut)),
                createdAt: Timestamp.fromDate(new Date()),
                status: 'pending',
                paymentStatus: 'pending'
            };

            // Save to Firestore
            const docRef = await addDoc(collection(db, this.bookingsCollection), formattedBooking);
            console.log('Booking saved with ID:', docRef.id);
            return docRef.id;

        } catch (error) {
            console.error('Error saving booking:', error);
            throw error;
        }
    }

    /**
     * Update an existing booking
     * @param {string} bookingId - The ID of the booking to update
     * @param {Object} updateData - The data to update
     */
    async updateBooking(bookingId, updateData) {
        try {
            const bookingRef = doc(db, this.bookingsCollection, bookingId);
            await updateDoc(bookingRef, {
                ...updateData,
                updatedAt: Timestamp.fromDate(new Date())
            });
            console.log('Booking updated successfully');
        } catch (error) {
            console.error('Error updating booking:', error);
            throw error;
        }
    }

    /**
     * Create a standardized booking object
     * @param {Object} params - Booking parameters
     * @returns {Object} Formatted booking object
     */
    createBookingObject({
        userInfo,
        dates,
        propertyDetails,
        guests,
        pricing
    }) {
        return {
            // Guest Information
            guestName: userInfo.guestName,
            email: userInfo.email,
            contactNumber: userInfo.contactNumber,
            
            // Dates
            checkIn: dates.checkIn,
            checkOut: dates.checkOut,
            
            // Property Details
            propertyDetails: {
                name: propertyDetails.name,
                location: propertyDetails.location,
                roomNumber: propertyDetails.roomNumber,
                roomType: propertyDetails.roomType,
                floorLevel: propertyDetails.floorLevel
            },
            
            // Booking Details
            guests: guests.count,
            numberOfNights: dates.nights,
            nightlyRate: pricing.nightlyRate,
            
            // Payment Information
            subtotal: pricing.subtotal,
            serviceFee: pricing.serviceFee,
            totalPrice: pricing.total,
            
            // Status (will be set in saveBooking)
            status: 'pending',
            paymentStatus: 'pending'
        };
    }

    /**
     * Validate required booking data
     * @param {Object} bookingData - The booking data to validate
     * @throws {Error} If required fields are missing
     */
    validateBookingData(bookingData) {
        const requiredFields = [
            'guestName',
            'email',
            'checkIn',
            'checkOut',
            'propertyDetails',
            'totalPrice'
        ];

        const missingFields = requiredFields.filter(field => !bookingData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        if (!bookingData.propertyDetails?.roomNumber || !bookingData.propertyDetails?.roomType) {
            throw new Error('Missing required property details');
        }
    }
}

// Create a singleton instance
const bookingService = new BookingService();
export default bookingService; 