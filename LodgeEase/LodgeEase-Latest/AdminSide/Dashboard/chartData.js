import { db } from '../firebase.js';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Format currency in PHP
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
};

// Helper function for date parsing
function parseDate(dateField) {
    if (!dateField) return null;
    
    if (dateField.toDate && typeof dateField.toDate === 'function') {
        return dateField.toDate();
    }
    
    if (typeof dateField === 'string') {
        const parsedDate = new Date(dateField);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
    
    if (dateField instanceof Date) {
        return dateField;
    }
    
    return null;
}

export async function getChartData() {
    try {
        // Get all necessary data from Firestore
        const [bookings, rooms, payments, lodges] = await Promise.all([
            getDocs(query(collection(db, 'bookings'), orderBy('checkIn', 'desc'))),
            getDocs(collection(db, 'rooms')),
            getDocs(collection(db, 'payments')),
            getDocs(collection(db, 'lodges'))
        ]);

        const bookingsData = bookings.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        const roomsData = rooms.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        const paymentsData = payments.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        const lodgesData = lodges.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        // Calculate months for trend analysis
        const months = [];
        const currentDate = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
        }

        // Get area-specific data for Baguio web chart
        const areaData = calculateAreaDistribution(lodgesData);

        // Calculate all chart data
        const revenueData = calculateRevenueData(months, bookingsData, paymentsData);
        const occupancyData = calculateOccupancyData(months, bookingsData, roomsData);
        const roomTypeData = calculateRoomTypeData(bookingsData);
        const bookingTrendData = calculateBookingTrends(months, bookingsData); // Ensure this is called

        // Calculate metrics
        const metrics = calculateMetrics(bookingsData, paymentsData, roomsData);

        return {
            revenueData,
            occupancyData,
            roomTypeData,
            bookingTrends: bookingTrendData, // Add this line to include booking trends
            areaData,
            metrics,
            todayCheckIns: calculateTodayCheckIns(bookingsData),
            availableRooms: calculateAvailableRooms(bookingsData, roomsData),
            occupiedRooms: calculateOccupiedRooms(bookingsData)
        };
    } catch (error) {
        console.error('Error getting chart data:', error);
        throw error;
    }
}

function calculateAreaDistribution(lodgesData) {
    const areas = [
        'Session Road Area',
        'Mines View',
        'Burnham Park',
        'Camp John Hay',
        'Teachers Camp',
        'Upper General Luna',
        'Military Cut-off',
        'Legarda Road',
        'Baguio City Market'
    ];

    const areaCount = new Map(areas.map(area => [area, 0]));
    
    lodgesData.forEach(lodge => {
        const area = lodge.area?.trim() || 'Other';
        if (areaCount.has(area)) {
            areaCount.set(area, areaCount.get(area) + 1);
        }
    });

    return {
        labels: areas,
        datasets: [{
            label: 'Number of Lodges',
            data: areas.map(area => areaCount.get(area) || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2
        }]
    };
}

function calculateRevenueData(months, bookings, payments) {
    const monthlyRevenue = new Array(12).fill(0);
    const currentDate = new Date();
    
    // Create a map of booking IDs to payment amounts
    const bookingPayments = new Map();
    payments.forEach(payment => {
        if (payment.bookingId && payment.amount) {
            const amount = bookingPayments.get(payment.bookingId) || 0;
            bookingPayments.set(payment.bookingId, amount + parseFloat(payment.amount));
        }
    });
    
    // Calculate revenue based on completed bookings
    bookings.forEach(booking => {
        if (booking.status === 'completed' && booking.checkOut) {
            const checkOutDate = parseDate(booking.checkOut);
            if (!checkOutDate) return;
            
            const monthDiff = (currentDate.getMonth() + 12 * currentDate.getFullYear()) - 
                            (checkOutDate.getMonth() + 12 * checkOutDate.getFullYear());
            
            if (monthDiff >= 0 && monthDiff < 12) {
                const revenue = bookingPayments.get(booking.id) || parseFloat(booking.totalAmount) || 0;
                monthlyRevenue[11 - monthDiff] += revenue;
            }
        }
    });
    
    const nonZeroMonths = monthlyRevenue.filter(x => x > 0).length || 1;
    return {
        values: monthlyRevenue,
        total: monthlyRevenue.reduce((a, b) => a + b, 0),
        average: monthlyRevenue.reduce((a, b) => a + b, 0) / nonZeroMonths
    };
}

function calculateOccupancyData(months, bookings, rooms) {
    const monthlyOccupancy = new Array(12).fill(0);
    const currentDate = new Date();
    const totalRooms = rooms.length || 1; // Prevent division by zero
    
    // Calculate daily occupancy for each month
    const dailyOccupancy = new Map(); // key: 'YYYY-MM-DD', value: Set of occupied room IDs
    
    bookings.forEach(booking => {
        if (booking.status !== 'cancelled' && booking.checkIn && booking.checkOut && booking.roomId) {
            const checkIn = parseDate(booking.checkIn);
            const checkOut = parseDate(booking.checkOut);
            if (!checkIn || !checkOut) return;
            
            // Iterate through each day of the booking
            const currentDay = new Date(checkIn);
            while (currentDay < checkOut) {
                const dateKey = currentDay.toISOString().split('T')[0];
                const occupied = dailyOccupancy.get(dateKey) || new Set();
                occupied.add(booking.roomId);
                dailyOccupancy.set(dateKey, occupied);
                currentDay.setDate(currentDay.getDate() + 1);
            }
        }
    });
    
    // Calculate monthly averages
    const monthlyDays = new Map(); // Track days counted per month
    dailyOccupancy.forEach((occupied, dateStr) => {
        const date = new Date(dateStr);
        const monthDiff = (currentDate.getMonth() + 12 * currentDate.getFullYear()) - 
                        (date.getMonth() + 12 * date.getFullYear());
        
        if (monthDiff >= 0 && monthDiff < 12) {
            const monthIndex = 11 - monthDiff;
            const occupancyRate = (occupied.size / totalRooms) * 100;
            
            // Add to running total
            monthlyOccupancy[monthIndex] = (monthlyOccupancy[monthIndex] || 0) + occupancyRate;
            
            // Track number of days for this month
            monthlyDays.set(monthIndex, (monthlyDays.get(monthIndex) || 0) + 1);
        }
    });
    
    // Calculate averages
    return monthlyOccupancy.map((total, index) => {
        const days = monthlyDays.get(index) || 1;
        return Math.min(100, Math.round(total / days)); // Ensure we don't exceed 100%
    });
}

function calculateRoomTypeData(bookings) {
    const roomTypes = {};
    
    // Count bookings per room type
    bookings.forEach(booking => {
        if (booking.roomType) {
            roomTypes[booking.roomType] = (roomTypes[booking.roomType] || 0) + 1;
        }
    });
    
    return {
        labels: Object.keys(roomTypes),
        values: Object.values(roomTypes)
    };
}

function calculateBookingTrends(months, bookings) {
    const monthlyBookings = new Array(12).fill(0);
    const predictedBookings = new Array(12).fill(0);
    const industryAverage = new Array(12).fill(0);
    const currentDate = new Date();
    
    // Calculate current month's index (0-11)
    const currentMonthIndex = currentDate.getMonth();
    
    // Calculate actual bookings starting from current month
    bookings.forEach(booking => {
        const bookingDate = parseDate(booking.checkIn);
        if (bookingDate) {
            const monthDiff = (bookingDate.getMonth() + 12 * bookingDate.getFullYear()) -
                            (currentMonthIndex + 12 * currentDate.getFullYear());
            if (monthDiff >= -6 && monthDiff <= 5) { // -6 to 5 gives us last 6 months and next 6 months
                const arrayIndex = monthDiff + 6; // Shift index to 0-11 range
                monthlyBookings[arrayIndex]++;
            }
        }
    });

    // Calculate predicted bookings
    const seasonalFactors = calculateSeasonalFactors(bookings);
    for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonthIndex + i - 6) % 12; // Adjust to get proper month index
        const trend = calculateTrendValue(monthlyBookings);
        const seasonal = seasonalFactors[monthIndex >= 0 ? monthIndex : monthIndex + 12] || 1;
        
        if (i < 6) { // Historical data (past 6 months)
            predictedBookings[i] = monthlyBookings[i];
        } else { // Future predictions (next 6 months)
            const baseValue = trend * seasonal;
            predictedBookings[i] = Math.round(baseValue * (1 + (Math.random() * 0.2 - 0.1)));
        }
        
        // Simulate industry average
        industryAverage[i] = Math.round(predictedBookings[i] * (1 + (Math.random() * 0.3 - 0.15)));
    }

    // Generate labels starting from 6 months ago to 5 months ahead
    const monthLabels = [];
    for (let i = -6; i <= 5; i++) {
        const labelDate = new Date(currentDate.getFullYear(), currentMonthIndex + i, 1);
        monthLabels.push(labelDate.toLocaleString('default', { month: 'short', year: '2-digit' }));
    }

    return {
        labels: monthLabels,
        datasets: [{
            label: 'Actual Bookings',
            data: monthlyBookings,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            fill: true
        }, {
            label: 'Predicted Bookings',
            data: predictedBookings,
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: true
        }, {
            label: 'Industry Average',
            data: industryAverage,
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
            borderDash: [3, 3],
            fill: false
        }]
    };
}

// Helper function to calculate seasonal factors
function calculateSeasonalFactors(bookings) {
    const monthlyTotals = new Array(12).fill(0);
    const monthlyCount = new Array(12).fill(0);

    bookings.forEach(booking => {
        const date = parseDate(booking.checkIn);
        if (date) {
            const month = date.getMonth();
            monthlyTotals[month]++;
            monthlyCount[month]++;
        }
    });

    const average = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.filter(x => x > 0).length;
    return monthlyTotals.map((total, index) => 
        monthlyCount[index] ? total / monthlyCount[index] / average : 1
    );
}

// Helper function to calculate trend value
function calculateTrendValue(data) {
    const validData = data.filter(x => x > 0);
    if (validData.length === 0) return 0;
    
    const sum = validData.reduce((a, b) => a + b, 0);
    const avg = sum / validData.length;
    
    // Calculate trend based on recent values
    const recentValues = validData.slice(-3);
    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    
    return (avg + recentAvg) / 2;
}

function calculateMetrics(bookings, payments, rooms) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Filter current month's data
    const currentMonthBookings = bookings.filter(booking => {
        const bookingDate = parseDate(booking.checkIn);
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear;
    });

    const currentMonthPayments = payments.filter(payment => {
        const paymentDate = payment.timestamp.toDate();
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
    });

    // Calculate metrics
    const totalRevenue = currentMonthPayments.reduce((sum, payment) => 
        sum + (parseFloat(payment.amount) || 0), 0);
    
    const averageStayDuration = currentMonthBookings.reduce((sum, booking) => {
        if (booking.checkIn && booking.checkOut) {
            const duration = (parseDate(booking.checkOut) - parseDate(booking.checkIn)) / 
                           (1000 * 60 * 60 * 24);
            return sum + duration;
        }
        return sum;
    }, 0) / currentMonthBookings.length || 0;

    return {
        currentMonthRevenue: formatCurrency(totalRevenue),
        averageStayDuration: averageStayDuration.toFixed(1) + ' days',
        totalBookings: currentMonthBookings.length,
        occupancyRate: ((calculateOccupiedRooms(bookings) / rooms.length) * 100).toFixed(1) + '%'
    };
}

// Helper functions
function calculateTodayCheckIns(bookings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return bookings.filter(booking => {
        const checkIn = parseDate(booking.checkIn);
        if (!checkIn) return false;
        
        checkIn.setHours(0, 0, 0, 0);
        return checkIn.getTime() === today.getTime() && 
               (booking.status === 'pending' || booking.status === 'confirmed');
    }).length;
}

function calculateAvailableRooms(bookings, rooms) {
    const totalRooms = rooms.length;
    const unavailableRooms = bookings.filter(booking => 
        booking.status === 'occupied' || booking.status === 'checked-in'
    ).length;
    const maintenanceRooms = rooms.filter(room => room.status === 'maintenance').length;
    
    return totalRooms - unavailableRooms - maintenanceRooms;
}

function calculateOccupiedRooms(bookings) {
    return bookings.filter(booking => 
        booking.status === 'occupied' || booking.status === 'checked-in'
    ).length;
}
