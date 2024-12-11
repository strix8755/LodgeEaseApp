document.addEventListener('DOMContentLoaded', function() {
    // Get booking details from localStorage
    const bookingDetails = JSON.parse(localStorage.getItem('currentBooking'));
    
    if (bookingDetails) {
        // Update booking information
        document.getElementById('room-number').textContent = bookingDetails.roomNumber;
        document.getElementById('check-in-date').textContent = bookingDetails.checkIn;
        document.getElementById('check-out-date').textContent = bookingDetails.checkOut;
        document.getElementById('guest-count').textContent = bookingDetails.guests;
        document.getElementById('rate-per-night').textContent = bookingDetails.rate;
        document.getElementById('total-amount').textContent = bookingDetails.total;
        
        // Update booking status
        document.getElementById('booking-status').textContent = 
            `Your stay is confirmed for ${bookingDetails.nights} nights`;
            
        // Calculate remaining time until checkout
        const checkoutDate = new Date(bookingDetails.checkOut);
        const now = new Date();
        const daysRemaining = Math.ceil((checkoutDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
            document.getElementById('booking-status').textContent += 
                ` (${daysRemaining} days remaining)`;
        }
    } else {
        // Handle case when no booking is found
        document.getElementById('booking-status').textContent = 
            'No active bookings found';
    }
}); 