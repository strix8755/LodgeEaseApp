import { db, collection, getDocs, query, where, Timestamp } from '../firebase.js';

export async function predictNextMonthOccupancy() {
    try {
        // Get next month's date range
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

        // Fetch confirmed bookings for next month
        const bookingsRef = collection(db, 'bookings');
        const bookingsSnapshot = await getDocs(
            query(bookingsRef, 
                where('checkIn', '>=', nextMonth),
                where('checkIn', '<=', nextMonthEnd),
                where('status', '==', 'Confirmed')
            )
        );
        const confirmedBookings = bookingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Fetch all rooms
        const roomsRef = collection(db, 'rooms');
        const roomsSnapshot = await getDocs(roomsRef);
        const totalRooms = roomsSnapshot.docs.length;

        // Calculate base prediction from confirmed bookings
        const daysInMonth = nextMonthEnd.getDate();
        const dailyOccupancy = new Array(daysInMonth).fill(0);

        // Count daily occupancy from confirmed bookings
        confirmedBookings.forEach(booking => {
            const checkIn = new Date(booking.checkIn?.toDate?.() || booking.checkIn);
            const checkOut = new Date(booking.checkOut?.toDate?.() || booking.checkOut);
            
            for (let d = new Date(checkIn); d <= checkOut; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === nextMonth.getMonth()) {
                    dailyOccupancy[d.getDate() - 1]++;
                }
            }
        });

        // Calculate predicted occupancy rate
        const averageOccupancy = dailyOccupancy.reduce((sum, count) => sum + count, 0) / daysInMonth;
        const predictedRate = (averageOccupancy / totalRooms) * 100;

        // Get historical data for adjustment
        const lastYear = new Date(today.getFullYear() - 1, today.getMonth() + 1, 1);
        const historicalSnapshot = await getDocs(
            query(bookingsRef, 
                where('checkIn', '>=', lastYear),
                where('status', '==', 'Confirmed')
            )
        );
        const historicalBookings = historicalSnapshot.docs.map(doc => doc.data());

        // Calculate historical booking pace
        const historicalPace = calculateBookingPace(historicalBookings);
        const currentPace = calculateBookingPace(confirmedBookings);
        const paceAdjustment = currentPace > 0 ? (currentPace / historicalPace) : 1;

        // Final prediction with adjustments
        const finalPrediction = Math.min(100, predictedRate * paceAdjustment);

        console.log('Occupancy Prediction Details:', {
            month: nextMonth.toLocaleString('default', { month: 'long' }),
            confirmedBookings: confirmedBookings.length,
            totalRooms,
            baseRate: predictedRate.toFixed(1) + '%',
            paceAdjustment: paceAdjustment.toFixed(2),
            finalPrediction: finalPrediction.toFixed(1) + '%'
        });

        return {
            predictedRate: finalPrediction,
            confidence: calculateConfidenceScore(confirmedBookings.length, totalRooms),
            details: {
                confirmedBookings: confirmedBookings.length,
                totalRooms,
                dailyOccupancy,
                bookingPace: currentPace
            }
        };
    } catch (error) {
        console.error('Error predicting occupancy:', error);
        throw error;
    }
}

function calculateBookingPace(bookings) {
    const now = new Date();
    const recentBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt?.toDate?.() || booking.createdAt);
        const daysDiff = (now - bookingDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
    });
    return recentBookings.length / 30;
}

function calculateConfidenceScore(confirmedBookings, totalRooms) {
    const baseConfidence = (confirmedBookings / totalRooms) * 100;
    return Math.min(100, baseConfidence);
}
