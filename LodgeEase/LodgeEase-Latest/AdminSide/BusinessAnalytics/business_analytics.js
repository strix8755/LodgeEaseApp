// Import Firebase functions
import { auth, db } from '../firebase.js';
import { collection, getDocs, query, where, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { checkAuth } from '../AInalysis/auth-check.js';

// Ensure user is authenticated before mounting Vue app
checkAuth().then(user => {
    if (!user) {
        window.location.href = '../Login/index.html';
        return;
    }

    // Store chart instances outside of Vue instance to prevent reactivity issues
    const chartInstances = {
        occupancy: null,
        revenue: null,
        bookings: null,
        seasonalTrends: null,
        roomType: null,
        revenuePerRoom: null
    };

    new Vue({
        el: '#app',
        data: {
            isAuthenticated: true,
            selectedEstablishment: '',
            establishments: [],
            dateRange: 'month',
            error: null,
            metrics: {
                totalRevenue: 0,
                averageOccupancy: 0,
                totalBookings: 0,
                seasonalityIndex: 0
            },
            loading: {
                auth: false,
                data: false,
                charts: false,
                establishments: false
            }
        },
        methods: {
            formatCurrency(value) {
                return value.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            },
            
            async handleLogout() {
                try {
                    await signOut(auth);
                    window.location.href = '../Login/index.html';
                } catch (error) {
                    console.error('Error signing out:', error);
                    this.error = 'Failed to sign out. Please try again.';
                }
            },

            async fetchEstablishments() {
                try {
                    this.loading.establishments = true;
                    const roomsRef = collection(db, 'rooms');
                    const snapshot = await getDocs(roomsRef);
                    const establishments = new Set();
                    
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.propertyDetails?.name) {
                            establishments.add(data.propertyDetails.name);
                        }
                    });
                    
                    this.establishments = Array.from(establishments).sort();
                    
                    if (this.establishments.length > 0 && !this.selectedEstablishment) {
                        this.selectedEstablishment = this.establishments[0];
                    }
                } catch (error) {
                    console.error('Error fetching establishments:', error);
                    this.error = 'Failed to load establishments';
                } finally {
                    this.loading.establishments = false;
                }
            },

            handleEstablishmentChange(event) {
                this.selectedEstablishment = event.target.value;
                this.refreshCharts();
            },

            handleDateRangeChange(event) {
                this.dateRange = event.target.value;
                this.refreshCharts();
            },
            
            async refreshCharts() {
                try {
                    this.loading.charts = true;
                    this.error = null;
                    
                    // Destroy existing charts
                    Object.values(chartInstances).forEach(chart => {
                        if (chart) {
                            chart.destroy();
                        }
                    });
                    
                    // Re-initialize charts with new data
                    await this.initializeCharts();
                } catch (error) {
                    console.error('Error refreshing charts:', error);
                    this.error = 'Unable to update charts. Please try again.';
                } finally {
                    this.loading.charts = false;
                }
            },

            async getChartData() {
                try {
                    const data = await fetchAnalyticsData(this.selectedEstablishment, this.dateRange);
                    return data;
                } catch (error) {
                    console.error('Error fetching chart data:', error);
                    this.error = 'Failed to fetch analytics data';
                    return {
                        occupancy: [],
                        revenue: [],
                        bookings: [],
                        seasonalTrends: [],
                        roomTypes: {},
                        revenuePerRoom: []
                    };
                }
            },

            async initializeCharts() {
                try {
                    const data = await this.getChartData();
                    
                    // Calculate metrics
                    this.metrics.totalRevenue = data.revenue.reduce((sum, item) => sum + item.amount, 0);
                    this.metrics.averageOccupancy = data.occupancy.reduce((sum, item) => sum + item.rate, 0) / data.occupancy.length || 0;
                    this.metrics.totalBookings = data.bookings.reduce((sum, item) => sum + item.count, 0);
                    
                    // Calculate seasonality index
                    const occupancyRates = data.occupancy.map(item => item.rate);
                    const mean = occupancyRates.reduce((sum, rate) => sum + rate, 0) / occupancyRates.length;
                    const squaredDiffs = occupancyRates.map(rate => Math.pow(rate - mean, 2));
                    this.metrics.seasonalityIndex = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / occupancyRates.length) || 0;
                    
                    // Initialize charts
                    const ctx = {
                        occupancy: document.getElementById('occupancyChart')?.getContext('2d'),
                        revenue: document.getElementById('revenueChart')?.getContext('2d'),
                        bookings: document.getElementById('bookingsChart')?.getContext('2d'),
                        seasonalTrends: document.getElementById('seasonalTrendsChart')?.getContext('2d'),
                        roomType: document.getElementById('roomTypeChart')?.getContext('2d'),
                        revenuePerRoom: document.getElementById('revenuePerRoomChart')?.getContext('2d')
                    };

                    if (ctx.occupancy) chartInstances.occupancy = this.initializeOccupancyChart(ctx.occupancy, data.occupancy);
                    if (ctx.revenue) chartInstances.revenue = this.initializeRevenueChart(ctx.revenue, data.revenue);
                    if (ctx.bookings) chartInstances.bookings = this.initializeBookingsChart(ctx.bookings, data.bookings);
                    if (ctx.seasonalTrends) chartInstances.seasonalTrends = this.initializeSeasonalTrendsChart(ctx.seasonalTrends, data.seasonalTrends);
                    if (ctx.roomType) chartInstances.roomType = this.initializeRoomTypeChart(ctx.roomType, data.roomTypes);
                    if (ctx.revenuePerRoom) chartInstances.revenuePerRoom = this.initializeRevenuePerRoomChart(ctx.revenuePerRoom, data.revenuePerRoom);
                    
                } catch (error) {
                    console.error('Error initializing charts:', error);
                    this.error = 'Unable to load analytics data. Please try again later.';
                }
            },

            initializeOccupancyChart(ctx, data) {
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map(item => item.month),
                        datasets: [{
                            label: 'Occupancy Rate (%)',
                            data: data.map(item => item.rate),
                            borderColor: '#4CAF50',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: value => value + '%'
                                }
                            }
                        }
                    }
                });
            },

            initializeRevenueChart(ctx, data) {
                return new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(item => item.month),
                        datasets: [{
                            label: 'Revenue (₱)',
                            data: data.map(item => item.amount),
                            backgroundColor: '#2196F3'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: value => '₱' + this.formatCurrency(value)
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        return 'Revenue: ₱' + this.formatCurrency(context.raw);
                                    }
                                }
                            }
                        }
                    }
                });
            },

            initializeBookingsChart(ctx, data) {
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map(item => item.month),
                        datasets: [{
                            label: 'Number of Bookings',
                            data: data.map(item => item.count),
                            borderColor: '#FF9800',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            },

            initializeSeasonalTrendsChart(ctx, data) {
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map(item => item.month),
                        datasets: [{
                            label: 'Seasonal Trend',
                            data: data.map(item => item.value),
                            borderColor: '#9C27B0',
                            tension: 0.4,
                            fill: true,
                            backgroundColor: 'rgba(156, 39, 176, 0.1)'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: value => value + '%'
                                }
                            }
                        }
                    }
                });
            },

            initializeRoomTypeChart(ctx, data) {
                const labels = Object.keys(data);
                const values = Object.values(data);
                
                return new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: [
                                '#4CAF50',
                                '#2196F3',
                                '#FF9800',
                                '#9C27B0',
                                '#F44336'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right'
                            }
                        }
                    }
                });
            },

            initializeRevenuePerRoomChart(ctx, data) {
                return new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(item => item.roomType),
                        datasets: [{
                            label: 'Revenue per Room Type (₱)',
                            data: data.map(item => item.revenue),
                            backgroundColor: '#F44336'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: value => '₱' + this.formatCurrency(value)
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        return 'Revenue: ₱' + this.formatCurrency(context.raw);
                                    }
                                }
                            }
                        }
                    }
                });
            },

            updateDateRange(range) {
                this.dateRange = range;
                this.refreshCharts();
            },

            updateEstablishment(establishment) {
                this.selectedEstablishment = establishment;
                this.refreshCharts();
            }
        },
        async mounted() {
            try {
                await this.fetchEstablishments();
                await this.initializeCharts();
            } catch (error) {
                console.error('Error in mounted:', error);
                this.error = 'Failed to initialize analytics dashboard';
            }
        }
    });
});

// Analytics functions
async function fetchAnalyticsData(establishment, dateRange) {
    try {
        const bookingsRef = collection(db, 'bookings');
        const roomsRef = collection(db, 'rooms');
        
        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        
        switch (dateRange) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(now.getMonth() - 1); // Default to last month
        }

        // Create Firestore timestamp
        const startTimestamp = Timestamp.fromDate(startDate);
        
        // Use simple queries and handle filtering in memory to avoid index requirements
        const [bookingsSnapshot, roomsSnapshot] = await Promise.all([
            getDocs(query(bookingsRef)),
            getDocs(query(roomsRef))
        ]);

        // Process bookings with client-side filtering
        const bookings = [];
        bookingsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.checkIn && data.checkIn instanceof Timestamp) {
                const checkInDate = data.checkIn.toDate();
                
                // Client-side filtering for date range and establishment
                if (checkInDate >= startDate && 
                    (!establishment || data.propertyDetails?.name === establishment)) {
                    const booking = {
                        id: doc.id,
                        checkIn: checkInDate,
                        checkOut: data.checkOut instanceof Timestamp ? data.checkOut.toDate() : null,
                        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
                        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
                        totalPrice: data.totalPrice || 0,
                        status: data.status || 'unknown',
                        roomType: data.propertyDetails?.roomType || 'unknown'
                    };
                    bookings.push(booking);
                }
            }
        });

        // Process rooms with client-side filtering
        const rooms = [];
        roomsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!establishment || data.propertyDetails?.name === establishment) {
                const room = {
                    id: doc.id,
                    roomType: data.propertyDetails?.roomType || 'unknown',
                    status: data.status || 'unknown',
                    price: data.price || 0
                };
                rooms.push(room);
            }
        });

        // Calculate monthly data
        const monthsMap = {};
        let monthIterator = new Date(startDate);
        while (monthIterator <= now) {
            const monthKey = monthIterator.toLocaleString('default', { month: 'short', year: 'numeric' });
            monthsMap[monthKey] = {
                month: monthKey,
                bookingCount: 0,
                revenue: 0,
                occupiedRooms: 0,
                occupancyRate: 0
            };
            monthIterator.setMonth(monthIterator.getMonth() + 1);
        }

        // Process bookings for monthly data
        bookings.forEach(booking => {
            if (!booking.checkIn || booking.status === 'cancelled') return;
            
            const monthKey = booking.checkIn.toLocaleString('default', { month: 'short', year: 'numeric' });
            if (monthsMap[monthKey]) {
                monthsMap[monthKey].bookingCount++;
                monthsMap[monthKey].revenue += booking.totalPrice;
            }
        });

        // Calculate room type distribution
        const roomTypes = rooms.reduce((acc, room) => {
            const type = room.roomType;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // Calculate occupancy rates
        const totalRooms = rooms.length || 1;
        Object.keys(monthsMap).forEach(monthKey => {
            const monthStart = new Date(monthKey);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);

            const occupiedRooms = bookings.filter(booking => {
                if (!booking.checkIn || booking.status === 'cancelled') return false;
                return booking.checkIn >= monthStart && booking.checkIn < monthEnd;
            }).length;

            monthsMap[monthKey].occupiedRooms = occupiedRooms;
            monthsMap[monthKey].occupancyRate = (occupiedRooms / totalRooms) * 100;
        });

        // Calculate revenue per room type
        const revenuePerRoom = Object.keys(roomTypes).map(type => ({
            roomType: type,
            revenue: bookings
                .filter(b => b.roomType === type && b.status !== 'cancelled')
                .reduce((sum, b) => sum + b.totalPrice, 0)
        }));

        // Convert to arrays for charts
        const monthlyData = Object.values(monthsMap).sort((a, b) => {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA - dateB;
        });

        return {
            occupancy: monthlyData.map(m => ({
                month: m.month,
                rate: m.occupancyRate
            })),
            revenue: monthlyData.map(m => ({
                month: m.month,
                amount: m.revenue
            })),
            bookings: monthlyData.map(m => ({
                month: m.month,
                count: m.bookingCount
            })),
            seasonalTrends: monthlyData.map(m => ({
                month: m.month,
                value: m.occupancyRate
            })),
            roomTypes,
            revenuePerRoom
        };
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        // Add user-friendly error message
        if (error.message?.includes('requires an index')) {
            console.warn('Indexes not yet ready, using client-side filtering');
            // Continue with empty data rather than throwing
            return {
                occupancy: [],
                revenue: [],
                bookings: [],
                seasonalTrends: [],
                roomTypes: {},
                revenuePerRoom: []
            };
        }
        throw error;
    }
}

// Initialize Chart.js
Chart.defaults.font.family = 'Roboto, sans-serif';
Chart.defaults.color = '#666';

// Register Chart.js plugins if not already registered
if (typeof Chart !== 'undefined' && Chart.register) {
    Chart.register(ChartDataLabels);
}
