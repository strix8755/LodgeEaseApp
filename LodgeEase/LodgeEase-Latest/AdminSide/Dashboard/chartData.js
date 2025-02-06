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
        const bookingTrendData = calculateBookingTrends(months, bookingsData);

        // Calculate metrics
        const metrics = calculateMetrics(bookingsData, paymentsData, roomsData);

        return {
            revenueData,
            occupancyData,
            roomTypeData,
            bookingTrendData,
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
    const currentDate = new Date();

    bookings.forEach(booking => {
        const bookingDate = parseDate(booking.checkIn);
        if (bookingDate) {
            const monthDiff = (currentDate.getMonth() + 12 * currentDate.getFullYear()) -
                            (bookingDate.getMonth() + 12 * bookingDate.getFullYear());
            if (monthDiff >= 0 && monthDiff < 12) {
                monthlyBookings[11 - monthDiff]++;
            }
        }
    });

    return {
        labels: months,
        datasets: [{
            label: 'Monthly Bookings',
            data: monthlyBookings,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            fill: true
        }]
    };
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
