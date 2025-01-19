import { db } from '../firebase.js';
import { collection, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

export const chartDataService = {
    async getChartData(establishment, forceRefresh = false) {
        try {
            // Get data from cache if available and not forcing refresh
            if (!forceRefresh) {
                const cachedData = this.getCachedData();
                if (cachedData) return cachedData;
            }

            const data = {
                roomTypes: await this.getRoomTypeDistribution(establishment),
                occupancy: await this.getOccupancyTrends(establishment),
                revenue: await this.getRevenueAnalysis(establishment),
                bookings: await this.getBookingTrends(establishment)
            };

            // Cache the data
            this.cacheData(data);
            return data;
        } catch (error) {
            console.error('Error fetching chart data:', error);
            throw error;
        }
    },

    async getRoomTypeDistribution(establishment) {
        const roomsRef = collection(db, 'rooms');
        let q = establishment !== 'all' ? 
            query(roomsRef, where('establishment', '==', establishment)) : 
            roomsRef;

        const snapshot = await getDocs(q);
        const distribution = {
            types: {},
            metrics: {
                totalRooms: 0,
                averageRate: 0,
                occupancyByType: {},
                revenueByType: {}
            }
        };

        let totalRate = 0;
        snapshot.forEach(doc => {
            const room = doc.data();
            const roomType = room.propertyDetails?.roomType || 'Standard';
            
            // Count room types
            distribution.types[roomType] = (distribution.types[roomType] || 0) + 1;
            distribution.metrics.totalRooms++;
            
            // Calculate average rate
            totalRate += room.price || 0;
            
            // Track occupancy by type
            if (room.status === 'Occupied') {
                distribution.metrics.occupancyByType[roomType] = 
                    (distribution.metrics.occupancyByType[roomType] || 0) + 1;
            }
        });

        // Calculate average rate
        distribution.metrics.averageRate = totalRate / distribution.metrics.totalRooms;

        // Calculate occupancy percentages
        Object.keys(distribution.types).forEach(type => {
            const occupied = distribution.metrics.occupancyByType[type] || 0;
            const total = distribution.types[type];
            distribution.metrics.occupancyByType[type] = (occupied / total) * 100;
        });

        return distribution;
    },

    async getOccupancyTrends(establishment) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        const bookingsRef = collection(db, 'bookings');
        let q = query(
            bookingsRef,
            where('checkIn', '>=', Timestamp.fromDate(sixMonthsAgo))
        );

        if (establishment !== 'all') {
            q = query(q, where('establishment', '==', establishment));
        }

        const snapshot = await getDocs(q);
        const monthlyOccupancy = {};
        const detailedMetrics = {
            peakOccupancy: 0,
            lowOccupancy: 100,
            averageOccupancy: 0,
            occupancyTrend: [],
            weekdayVsWeekend: {
                weekday: 0,
                weekend: 0
            }
        };

        // Get total rooms for occupancy calculation
        const roomsRef = collection(db, 'rooms');
        const roomsQuery = establishment !== 'all' ? 
            query(roomsRef, where('establishment', '==', establishment)) : 
            roomsRef;
        const roomsSnapshot = await getDocs(roomsQuery);
        const totalRooms = roomsSnapshot.size || 1; // Prevent division by zero

        // Add detailed metrics calculation
        snapshot.forEach(doc => {
            const data = doc.data();
            const checkIn = data.checkIn.toDate();
            const month = checkIn.toLocaleString('default', { month: 'short' });
            const isWeekend = checkIn.getDay() === 0 || checkIn.getDay() === 6;

            // Update occupancy metrics
            if (!monthlyOccupancy[month]) {
                monthlyOccupancy[month] = {
                    occupied: 0,
                    total: totalRooms,
                    revenue: 0,
                    bookings: 0
                };
            }

            if (data.status === 'Confirmed') {
                monthlyOccupancy[month].occupied++;
                monthlyOccupancy[month].revenue += data.totalPrice || 0;
                monthlyOccupancy[month].bookings++;

                // Update weekday/weekend metrics
                if (isWeekend) {
                    detailedMetrics.weekdayVsWeekend.weekend++;
                } else {
                    detailedMetrics.weekdayVsWeekend.weekday++;
                }
            }
        });

        // Calculate additional metrics
        Object.entries(monthlyOccupancy).forEach(([month, data]) => {
            const rate = (data.occupied / data.total) * 100;
            detailedMetrics.peakOccupancy = Math.max(detailedMetrics.peakOccupancy, rate);
            detailedMetrics.lowOccupancy = Math.min(detailedMetrics.lowOccupancy, rate);
            detailedMetrics.occupancyTrend.push({ month, rate });
        });

        detailedMetrics.averageOccupancy = 
            detailedMetrics.occupancyTrend.reduce((sum, { rate }) => sum + rate, 0) / 
            detailedMetrics.occupancyTrend.length;

        return {
            monthly: Object.entries(monthlyOccupancy).map(([month, data]) => ({
                month,
                rate: (data.occupied / data.total) * 100,
                revenue: data.revenue,
                bookings: data.bookings
            })),
            metrics: detailedMetrics
        };
    },

    async getRevenueAnalysis(establishment) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        const bookingsRef = collection(db, 'bookings');
        let q = query(
            bookingsRef,
            where('checkIn', '>=', Timestamp.fromDate(sixMonthsAgo))
        );

        if (establishment !== 'all') {
            q = query(q, where('establishment', '==', establishment));
        }

        const snapshot = await getDocs(q);
        const monthlyRevenue = {};
        const revenueMetrics = {
            totalRevenue: 0,
            averageDaily: 0,
            peakRevenue: 0,
            revenueByRoomType: {},
            monthlyGrowth: [],
            forecastNextMonth: 0
        };

        // Enhanced revenue calculations
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'Confirmed') {
                const amount = data.totalPrice || 0;
                const month = new Date(data.checkIn.toDate()).toLocaleString('default', { month: 'short' });
                const roomType = data.propertyDetails?.roomType || 'Standard';

                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;
                revenueMetrics.totalRevenue += amount;
                revenueMetrics.peakRevenue = Math.max(revenueMetrics.peakRevenue, amount);
                revenueMetrics.revenueByRoomType[roomType] = 
                    (revenueMetrics.revenueByRoomType[roomType] || 0) + amount;
            }
        });

        // Calculate growth rates and forecast
        const sortedMonths = Object.entries(monthlyRevenue)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]));
        
        sortedMonths.forEach((month, index) => {
            if (index > 0) {
                const growth = ((month[1] - sortedMonths[index-1][1]) / sortedMonths[index-1][1]) * 100;
                revenueMetrics.monthlyGrowth.push({
                    month: month[0],
                    growth
                });
            }
        });

        // Simple forecast based on average growth
        const avgGrowth = revenueMetrics.monthlyGrowth.reduce((sum, { growth }) => sum + growth, 0) / 
                         revenueMetrics.monthlyGrowth.length;
        const lastMonth = sortedMonths[sortedMonths.length - 1][1];
        revenueMetrics.forecastNextMonth = lastMonth * (1 + (avgGrowth / 100));

        return {
            monthly: sortedMonths.map(([month, amount]) => ({ month, amount })),
            metrics: revenueMetrics
        };
    },

    async getBookingTrends(establishment) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        const bookingsRef = collection(db, 'bookings');
        let q = query(
            bookingsRef,
            where('checkIn', '>=', Timestamp.fromDate(sixMonthsAgo))
        );

        if (establishment !== 'all') {
            q = query(q, where('establishment', '==', establishment));
        }

        const snapshot = await getDocs(q);
        const monthlyBookings = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const month = new Date(data.checkIn.toDate()).toLocaleString('default', { month: 'short' });
            if (data.status === 'Confirmed') {
                monthlyBookings[month] = (monthlyBookings[month] || 0) + 1;
            }
        });

        return Object.entries(monthlyBookings)
            .map(([month, count]) => ({
                month,
                count
            }))
            .sort((a, b) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months.indexOf(a.month) - months.indexOf(b.month);
            });
    },

    cacheData(data) {
        localStorage.setItem('chartData', JSON.stringify({
            data,
            timestamp: new Date().getTime()
        }));
    },

    getCachedData() {
        const cached = localStorage.getItem('chartData');
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = new Date().getTime();
        
        // Cache expires after 5 minutes
        if (now - timestamp > 5 * 60 * 1000) {
            localStorage.removeItem('chartData');
            return null;
        }

        return data;
    }
};
