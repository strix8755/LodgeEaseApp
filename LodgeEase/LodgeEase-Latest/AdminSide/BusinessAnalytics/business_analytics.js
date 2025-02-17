// Import Firebase functions
import { auth, db } from '../firebase.js';
import { collection, getDocs, query, where, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { checkAuth } from '../AInalysis/auth-check.js';

// Add advanced chart configurations
const chartConfig = {
    plugins: {
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            bodyFont: { family: 'Roboto' },
            titleFont: { family: 'Montserrat' },
            padding: 12,
            displayColors: true,
            intersect: false,
            mode: 'index'
        },
        legend: {
            position: 'bottom',
            labels: {
                boxWidth: 12,
                padding: 15,
                font: { family: 'Roboto' }
            }
        }
    },
    interaction: {
        intersect: false,
        mode: 'nearest'
    },
    animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
    }
};

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
                establishments: false,
                analysis: false
            },
            showAnalysisModal: false,
            selectedPeriod: null,
            selectedValue: null,
            analysisData: {
                trendData: [],
                growth: 0,
                contributingFactors: []
            },
            items: [] // For chart legend items
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
                const movingAverage = this.calculateMovingAverage(data.map(d => d.rate), 3);
                
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map(item => item.month),
                        datasets: [{
                            label: 'Occupancy Rate',
                            data: data.map(item => item.rate),
                            borderColor: '#4CAF50',
                            tension: 0.3,
                            fill: true,
                            backgroundColor: 'rgba(76, 175, 80, 0.1)'
                        }, {
                            label: '3-Month Moving Average',
                            data: movingAverage,
                            borderColor: '#2196F3',
                            borderDash: [5, 5],
                            tension: 0.3,
                            fill: false
                        }]
                    },
                    options: {
                        ...chartConfig,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: value => value + '%'
                                }
                            }
                        },
                        plugins: {
                            ...chartConfig.plugins,
                            tooltip: {
                                ...chartConfig.plugins.tooltip,
                                callbacks: {
                                    afterLabel: (context) => {
                                        const dataset = context.dataset;
                                        const value = context.raw;
                                        if (dataset.label === 'Occupancy Rate') {
                                            const targetOccupancy = 75;
                                            const variance = value - targetOccupancy;
                                            return `Variance from target: ${variance.toFixed(1)}%`;
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            },

            initializeRevenueChart(ctx, data) {
                const yearlyGrowth = this.calculateYearlyGrowth(data);
                const projectedRevenue = this.calculateRevenueProjection(data);

                return new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(item => item.month),
                        datasets: [{
                            type: 'bar',
                            label: 'Actual Revenue',
                            data: data.map(item => item.amount),
                            backgroundColor: '#2196F3',
                            order: 2
                        }, {
                            type: 'line',
                            label: 'Projected Revenue',
                            data: projectedRevenue,
                            borderColor: '#FF9800',
                            borderDash: [5, 5],
                            fill: false,
                            order: 1
                        }]
                    },
                    options: {
                        ...chartConfig,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: value => '₱' + this.formatCurrency(value)
                                }
                            }
                        },
                        plugins: {
                            ...chartConfig.plugins,
                            tooltip: {
                                ...chartConfig.plugins.tooltip,
                                callbacks: {
                                    afterLabel: (context) => {
                                        if (context.datasetIndex === 0) {
                                            const growth = yearlyGrowth[context.dataIndex];
                                            return `YoY Growth: ${growth?.toFixed(1)}%`;
                                        }
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

            calculateMovingAverage(data, window) {
                return data.map((_, index) => {
                    const start = Math.max(0, index - window + 1);
                    const values = data.slice(start, index + 1);
                    return values.reduce((sum, val) => sum + val, 0) / values.length;
                });
            },

            calculateYearlyGrowth(data) {
                return data.map((item, index) => {
                    if (index >= 12) {
                        const prevYear = data[index - 12].amount;
                        return ((item.amount - prevYear) / prevYear) * 100;
                    }
                    return null;
                });
            },

            calculateRevenueProjection(data) {
                const values = data.map(item => item.amount);
                const trend = this.calculateTrendLine(values);
                return values.map((_, index) => trend.slope * index + trend.intercept);
            },

            calculateTrendLine(values) {
                const n = values.length;
                const xSum = (n * (n - 1)) / 2;
                const ySum = values.reduce((sum, val) => sum + val, 0);
                const xySum = values.reduce((sum, val, i) => sum + (val * i), 0);
                const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
                
                const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
                const intercept = (ySum - slope * xSum) / n;
                
                return { slope, intercept };
            },

            // Add interaction handlers
            handleChartClick(chart, event) {
                const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const point = points[0];
                    this.showDetailedAnalysis(chart.data.labels[point.index], chart.data.datasets[point.datasetIndex].data[point.index]);
                }
            },

            showDetailedAnalysis(period, value) {
                // Implementation of detailed analysis modal/popup
                // This would be connected to a modal component in your HTML
                this.selectedPeriod = period;
                this.selectedValue = value;
                this.showAnalysisModal = true;
            },

            updateDateRange(range) {
                this.dateRange = range;
                this.refreshCharts();
            },

            updateEstablishment(establishment) {
                this.selectedEstablishment = establishment;
                this.refreshCharts();
            },

            formatMetricValue(value) {
                if (typeof value === 'number') {
                    if (this.selectedPeriod?.toLowerCase().includes('revenue')) {
                        return '₱' + this.formatCurrency(value);
                    }
                    return value.toFixed(1) + (this.selectedPeriod?.toLowerCase().includes('percentage') ? '%' : '');
                }
                return value;
            },

            calculateGrowth(period) {
                if (!period || !this.analysisData) return 0;
                return this.analysisData.growth.toFixed(1);
            },

            getContributingFactors(period) {
                if (!period || !this.analysisData) return [];
                return this.analysisData.contributingFactors;
            },

            async showDetailedAnalysis(period, value) {
                try {
                    this.loading.analysis = true;
                    this.selectedPeriod = period;
                    this.selectedValue = value;
                    
                    // Calculate analysis data
                    this.analysisData = await this.calculateAnalysisData(period, value);
                    
                    // Initialize trend chart in modal
                    this.$nextTick(() => {
                        const ctx = this.$refs.trendChart?.getContext('2d');
                        if (ctx) {
                            new Chart(ctx, {
                                type: 'line',
                                data: {
                                    labels: this.analysisData.trendData.map(d => d.period),
                                    datasets: [{
                                        label: 'Trend',
                                        data: this.analysisData.trendData.map(d => d.value),
                                        borderColor: '#1e3c72',
                                        tension: 0.3
                                    }]
                                },
                                options: {
                                    ...chartConfig,
                                    interaction: {
                                        mode: 'nearest',
                                        axis: 'x',
                                        intersect: false
                                    }
                                }
                            });
                        }
                    });

                    this.showAnalysisModal = true;
                } catch (error) {
                    console.error('Error showing analysis:', error);
                    this.error = 'Failed to load detailed analysis';
                } finally {
                    this.loading.analysis = false;
                }
            },

            async calculateAnalysisData(period, value) {
                // Implement your analysis logic here
                return {
                    trendData: this.calculateTrendData(period, value),
                    growth: this.calculateHistoricalGrowth(period, value),
                    contributingFactors: this.identifyContributingFactors(period, value)
                };
            },

            calculateTrendData(period, value) {
                // Example implementation - replace with your actual logic
                const data = [];
                const now = new Date();
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now);
                    date.setMonth(date.getMonth() - i);
                    data.push({
                        period: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                        value: value * (0.8 + Math.random() * 0.4) // Simulate historical data
                    });
                }
                return data;
            },

            calculateHistoricalGrowth(period, value) {
                // Example implementation - replace with your actual logic
                return ((value - value * 0.8) / (value * 0.8)) * 100;
            },

            identifyContributingFactors(period, value) {
                // Example implementation - replace with your actual logic
                return [
                    { name: 'Seasonal Impact', value: '+15%' },
                    { name: 'Market Conditions', value: '-5%' },
                    { name: 'Pricing Strategy', value: '+8%' }
                ];
            },

            closeAnalysisModal() {
                this.showAnalysisModal = false;
                this.selectedPeriod = null;
                this.selectedValue = null;
                this.analysisData = {
                    trendData: [],
                    growth: 0,
                    contributingFactors: []
                };
            }
        },
        watch: {
            // Add watcher for items if needed
            items: {
                handler(newItems) {
                    // Handle changes to legend items
                    console.log('Legend items updated:', newItems);
                },
                deep: true
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
