export function generateEmailTemplate(bookingDetails) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4F46E5; text-align: center;">Booking Confirmation</h1>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
                <h2 style="color: #1F2937;">Booking Details</h2>
                <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
                <p><strong>Check-in:</strong> ${new Date(bookingDetails.checkIn).toLocaleDateString()}</p>
                <p><strong>Check-out:</strong> ${new Date(bookingDetails.checkOut).toLocaleDateString()}</p>
                <p><strong>Number of Guests:</strong> ${bookingDetails.guests}</p>
                <p><strong>Number of Nights:</strong> ${bookingDetails.numberOfNights}</p>
                
                <h3 style="color: #1F2937; margin-top: 20px;">Property Details</h3>
                <p><strong>Property:</strong> ${bookingDetails.propertyDetails.name}</p>
                <p><strong>Room Type:</strong> ${bookingDetails.propertyDetails.roomType}</p>
                <p><strong>Room Number:</strong> ${bookingDetails.propertyDetails.roomNumber}</p>
                
                <h3 style="color: #1F2937; margin-top: 20px;">Payment Details</h3>
                <p><strong>Nightly Rate:</strong> ₱${bookingDetails.nightlyRate.toLocaleString()}</p>
                <p><strong>Service Fee:</strong> ₱${bookingDetails.serviceFee.toLocaleString()}</p>
                <p><strong>Total Amount:</strong> ₱${bookingDetails.totalPrice.toLocaleString()}</p>
            </div>
            <p style="text-align: center; margin-top: 20px; color: #6B7280;">
                Thank you for choosing LodgeEase!
            </p>
        </div>
    `;
}
