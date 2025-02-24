// Import Firebase functions
import { auth, db } from '../firebase.js';
import { collection, getDocs, query, where, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { checkAuth } from '../AInalysis/auth-check.js';

// Update chart configuration with enhanced styling
const chartConfig = {
    plugins: {
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            bodyFont: { family: 'Roboto' },
            titleFont: { family: 'Montserrat' },
            padding: 12,
            displayColors: true,
            intersect: false,
            mode: 'index',
            callbacks: {
                label: function(context) {
                    if (!context || !context.dataset || context.parsed.y === null || context.parsed.y === undefined) {
                        return '';
                    }

                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }

                    const value = context.parsed.y;
                    try {
                        if (label.toLowerCase().includes('revenue')) {
                            label += '₱' + (value || 0).toLocaleString();
                        } else if (label.toLowerCase().includes('rate') || 
                                 label.toLowerCase().includes('occupancy')) {
                            label += (value || 0).toFixed(1) + '%';
                        } else {
                            label += (value || 0).toLocaleString();
                        }
                    } catch (error) {
                        console.error('Error formatting tooltip:', error);
                        label += '0';
                    }
                    return label;
                }
            }
        },
        legend: {
            position: 'bottom',
            labels: {
                boxWidth: 12,
                padding: 15,
                font: { family: 'Roboto' },
                usePointStyle: true
            }
        },
        datalabels: {
            color: '#666',
            font: { 
                weight: 'bold',
                size: 11
            },
            padding: 6,
            backgroundColor: function(context) {
                return context.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)';
            },
            borderRadius: 4,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
            anchor: 'end',
            align: 'top',
            offset: 8,
            display: function(context) {
                return context.dataset.data[context.dataIndex] > 0;
            }
        }
    },
    interaction: {
        intersect: false,
        mode: 'nearest',
        axis: 'x'
    },
    animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
    },
    elements: {
        point: {
            radius: 4,
            hoverRadius: 6,
            borderWidth: 2,
            backgroundColor: 'white'
        },
        line: {
            tension: 0.4, // Increase tension for smoother curves
            borderWidth: 2,
            borderCapStyle: 'round',
            borderJoinStyle: 'round', // Add this for smoother line joins
            fill: true,
            spanGaps: true // Add this to connect points across gaps
        },
        bar: {
            borderRadius: 4,
            borderSkipped: false
        }
    },
    layout: {
        padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                padding: 10,
                font: {
                    size: 11,
                    family: 'Roboto'
                }
            }
        },
        y: {
            grid: {
                borderDash: [4, 4],
                color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
                padding: 10,
                font: {
                    size: 11,
                    family: 'Roboto'
                }
            }
        }
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
                seasonalityIndex: 0,
                revenueGrowth: 0,
                revPAR: 0,
                revPARGrowth: 0,
                bookingEfficiency: 0,
                performanceScore: 0,
                growthIndex: 0,          // Add default
                stabilityScore: 0,       // Add default
                volatilityIndex: 0       // Add default
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
                if (typeof value !== 'number') return '0.00';
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
                    
                    // Properly destroy existing charts
                    Object.entries(chartInstances).forEach(([key, chart]) => {
                        if (chart) {
                            chart.destroy();
                            chartInstances[key] = null;
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
                    
                    // Initialize metrics with safe defaults
                    const calculatedMetrics = calculateAdvancedMetrics(data);
                    this.metrics = {
                        ...this.metrics,
                        ...calculatedMetrics,
                        stabilityScore: calculatedMetrics.stabilityScore,
                        growthIndex: calculatedMetrics.growthIndex,
                        volatilityIndex: calculatedMetrics.volatilityIndex
                    };
                    
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
                const continuousData = ensureContinuousData(data);
                const movingAverage = this.calculateMovingAverage(continuousData.map(d => d.rate), 3);
                
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: continuousData.map(item => item.month),
                        datasets: [{
                            label: 'Occupancy Rate',
                            data: continuousData.map(item => item.rate),
                            borderColor: '#4CAF50',
                            tension: 0.4,
                            fill: true,
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            spanGaps: true
                        }, {
                            label: '3-Month Moving Average',
                            data: movingAverage,
                            borderColor: '#2196F3',
                            borderDash: [5, 5],
                            tension: 0.4,
                            fill: false,
                            spanGaps: true
                        }]
                    },
                    options: {
                        ...chartConfig,
                        scales: {
                            x: {
                                ...chartConfig.scales.x,
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                ...chartConfig.scales.y,
                                suggestedMin: 0,
                                suggestedMax: 100,
                                ticks: {
                                    stepSize: 20,
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
                const continuousData = ensureContinuousData(data);
                const gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
                gradientFill.addColorStop(0, 'rgba(33, 150, 243, 0.3)');
                gradientFill.addColorStop(1, 'rgba(33, 150, 243, 0.0)');

                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: continuousData.map(item => item.month),
                        datasets: [{
                            label: 'Actual Revenue',
                            data: continuousData.map(item => item.amount),
                            borderColor: '#2196F3',
                            backgroundColor: gradientFill,
                            fill: true,
                            tension: 0.4,
                            parsing: {
                                yAxisKey: 'amount'
                            },
                            spanGaps: true
                        }, {
                            label: 'Projected Revenue',
                            data: this.calculateRevenueProjection(continuousData),
                            borderColor: '#FF9800',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.4,
                            spanGaps: true
                        }]
                    },
                    options: {
                        ...chartConfig,
                        scales: {
                            x: {
                                ...chartConfig.scales.x,
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                ...chartConfig.scales.y,
                                suggestedMin: 0,
                                ticks: {
                                    maxTicksLimit: 8,
                                    callback: value => '₱' + value.toLocaleString()
                                }
                            }
                        },
                        plugins: {
                            ...chartConfig.plugins,
                            tooltip: {
                                ...chartConfig.plugins.tooltip,
                                callbacks: {
                                    label: function(context) {
                                        const value = context.raw;
                                        return `${context.dataset.label}: ₱${value.toLocaleString()}`;
                                    }
                                }
                            }
                        }
                    }
                });
            },

            initializeBookingsChart(ctx, data) {
                const continuousData = ensureContinuousData(data);
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: continuousData.map(item => item.month),
                        datasets: [{
                            label: 'Number of Bookings',
                            data: continuousData.map(item => item.count),
                            borderColor: '#FF9800',
                            tension: 0.4,
                            spanGaps: true
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
                const continuousData = ensureContinuousData(data);
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: continuousData.map(item => item.month),
                        datasets: [{
                            label: 'Seasonal Trend',
                            data: continuousData.map(item => item.value),
                            borderColor: '#9C27B0',
                            tension: 0.4,
                            fill: true,
                            backgroundColor: 'rgba(156, 39, 176, 0.1)',
                            spanGaps: true
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
                        ...chartConfig,
                        cutout: '65%',
                        plugins: {
                            ...chartConfig.plugins,
                            legend: {
                                position: 'right',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20,
                                    font: {
                                        size: 11,
                                        family: 'Roboto'
                                    }
                                }
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
                if (value === undefined || value === null) return '0';
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
            },

            getScoreArc(score) {
                if (score === undefined || score === null) score = 0;
                const normalizedScore = Math.min(Math.max(score, 0), 100);
                const angle = (normalizedScore / 100) * Math.PI;
                const x = 50 - 40 * Math.cos(angle);
                const y = 50 - 40 * Math.sin(angle);
                return `M 10,50 A 40,40 0 ${angle > Math.PI/2 ? 1 : 0},1 ${x},${y}`;
            },

            getScoreColor(score) {
                if (score === undefined || score === null) return '#F44336';
                if (score >= 80) return '#4CAF50';
                if (score >= 60) return '#FFC107';
                return '#F44336';
            },

            calculatePeriodRevPAR(data, periodOffset) {
                const period = data.revenue.slice(periodOffset)[0];
                if (!period) return 0;
                
                const roomCount = Object.values(data.roomTypes || {}).reduce((sum, count) => sum + count, 0) || 1;
                return period.amount / (roomCount * getDaysInMonth(period.month));
            },

            getDaysInMonth(monthStr) {
                const [month, year] = monthStr.split(' ');
                const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
                return new Date(year, monthIndex + 1, 0).getDate();
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

        const ensureMonthlyData = (data) => ensureContinuousData(data);

        return {
            occupancy: ensureMonthlyData(monthlyData.map(m => ({
                month: m.month,
                rate: m.occupancyRate
            }))),
            revenue: ensureMonthlyData(monthlyData.map(m => ({
                month: m.month,
                amount: m.revenue
            }))),
            bookings: ensureMonthlyData(monthlyData.map(m => ({
                month: m.month,
                count: m.bookingCount
            }))),
            seasonalTrends: ensureMonthlyData(monthlyData.map(m => ({
                month: m.month,
                value: m.occupancyRate
            }))),
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

// Add enhanced metrics calculations
function calculateAdvancedMetrics(data) {
    if (!data || !data.revenue || !data.occupancy || !data.bookings) {
        return {
            totalRevenue: 0,
            averageOccupancy: 0,
            totalBookings: 0,
            revenueGrowth: 0,
            occupancyTrend: 0,
            seasonalityScore: 0,
            performanceScore: 0,
            forecastAccuracy: 0,
            revPAR: 0,
            revPARGrowth: 0,
            bookingEfficiency: 0,
            stabilityScore: 0,
            growthIndex: 0,
            volatilityIndex: 0
        };
    }

    const metrics = {
        totalRevenue: data.revenue?.reduce((sum, item) => sum + item.amount, 0) || 0,
        averageOccupancy: data.occupancy?.reduce((sum, item) => sum + item.rate, 0) / (data.occupancy?.length || 1) || 0,
        totalBookings: data.bookings?.reduce((sum, item) => sum + item.count, 0) || 0,
        revenueGrowth: calculateRevenueGrowth(data.revenue),
        occupancyTrend: calculateOccupancyTrend(data.occupancy),
        seasonalityScore: calculateSeasonalityScore(data.occupancy),
        forecastAccuracy: calculateForecastAccuracy(data.revenue),
        revPAR: calculateRevPAR(data),
        bookingEfficiency: calculateBookingEfficiency(data)
    };

    // Calculate overall performance score
    metrics.performanceScore = (
        calculateRevenueScore(data.revenue) * 0.4 +
        calculateOccupancyScore(data.occupancy) * 0.4 +
        calculateBookingScore(data.bookings) * 0.2
    );

    // Calculate RevPAR growth
    metrics.revPARGrowth = calculateRevPARGrowth(data);

    // Add stability metrics
    metrics.stabilityScore = calculateStabilityScore(data);
    metrics.growthIndex = calculateGrowthIndex(data);
    metrics.volatilityIndex = calculateVolatilityIndex(data);

    return metrics;
}

// Add new metric calculation functions
function calculateRevPAR(data) {
    const totalRevenue = data.revenue.reduce((sum, item) => sum + item.amount, 0);
    const totalRoomNights = data.occupancy.length * 100; // Assuming 100 rooms for example
    return totalRevenue / totalRoomNights;
}

function calculateBookingEfficiency(data) {
    const confirmedBookings = data.bookings.reduce((sum, item) => sum + item.count, 0);
    const totalInquiries = confirmedBookings * 1.5; // Assuming 50% conversion rate
    return (confirmedBookings / totalInquiries) * 100;
}

function calculatePerformanceScore(data) {
    const revenueScore = calculateRevenueScore(data.revenue);
    const occupancyScore = calculateOccupancyScore(data.occupancy);
    const bookingScore = calculateBookingScore(data.bookings);
    
    return (revenueScore * 0.4 + occupancyScore * 0.4 + bookingScore * 0.2);
}

function calculateRevenueGrowth(revenue) {
    if (!revenue || revenue.length < 2) return 0;
    const lastMonth = revenue[revenue.length - 1].amount;
    const previousMonth = revenue[revenue.length - 2].amount;
    return previousMonth ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
}

function calculateOccupancyTrend(occupancy) {
    if (!occupancy || occupancy.length < 2) return 0;
    const lastMonth = occupancy[occupancy.length - 1].rate;
    const previousMonth = occupancy[occupancy.length - 2].rate;
    return previousMonth ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
}

function calculateSeasonalityScore(occupancy) {
    if (!occupancy || occupancy.length === 0) return 0;
    const rates = occupancy.map(o => o.rate);
    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
    return Math.sqrt(variance);
}

function calculateForecastAccuracy(revenue) {
    if (!revenue || revenue.length < 2) return 0;
    // Simple implementation - can be enhanced with actual forecast comparison
    return 85; // Default accuracy score
}

function calculateBookingScore(bookings) {
    if (!bookings || bookings.length === 0) return 0;
    const totalBookings = bookings.reduce((sum, b) => sum + b.count, 0);
    const avgBookings = totalBookings / bookings.length;
    return Math.min((avgBookings / 10) * 100, 100); // Normalize to 0-100
}

function calculateRevenueScore(revenue) {
    if (!revenue || revenue.length === 0) return 0;
    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
    const targetRevenue = 1000000; // Example target
    return Math.min((totalRevenue / targetRevenue) * 100, 100);
}

function calculateOccupancyScore(occupancy) {
    if (!occupancy || occupancy.length === 0) return 0;
    const avgOccupancy = occupancy.reduce((sum, o) => sum + o.rate, 0) / occupancy.length;
    return Math.min(avgOccupancy, 100);
}

function calculateRevPARGrowth(data) {
    if (!data || !data.revenue || data.revenue.length < 2) return 0;
    
    // Calculate current and previous RevPAR
    const currentRevPAR = calculatePeriodRevPAR(data, -1);
    const previousRevPAR = calculatePeriodRevPAR(data, -2);
    
    // Calculate growth percentage
    return previousRevPAR ? ((currentRevPAR - previousRevPAR) / previousRevPAR) * 100 : 0;
}

function calculatePeriodRevPAR(data, periodOffset) {
    if (!data || !data.revenue) return 0;
    const period = data.revenue.slice(periodOffset)[0];
    if (!period) return 0;
    
    const roomCount = Object.values(data.roomTypes || {}).reduce((sum, count) => sum + count, 0) || 1;
    return period.amount / (roomCount * getDaysInMonth(period.month));
}

function getDaysInMonth(monthStr) {
    if (!monthStr) return 30; // Default fallback
    const [month, year] = monthStr.split(' ');
    const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
    return new Date(year, monthIndex + 1, 0).getDate();
}

// Add this helper function to ensure continuous data
function ensureContinuousData(data) {
    if (!data || data.length < 2) return data;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    let currentIndex = months.indexOf(data[0].month.split(' ')[0]);
    const currentYear = data[0].month.split(' ')[1];
    
    for (let i = 0; i < data.length - 1; i++) {
        result.push(data[i]);
        
        const nextIndex = months.indexOf(data[i + 1].month.split(' ')[0]);
        const expectedNextIndex = (currentIndex + 1) % 12;
        
        if (nextIndex !== expectedNextIndex) {
            // Insert missing month with interpolated data
            const prevValue = data[i].rate || data[i].amount || data[i].count || data[i].value || 0;
            const nextValue = data[i + 1].rate || data[i + 1].amount || data[i + 1].count || data[i + 1].value || 0;
            const interpolatedValue = (prevValue + nextValue) / 2;
            
            result.push({
                month: `${months[expectedNextIndex]} ${currentYear}`,
                rate: interpolatedValue,
                amount: interpolatedValue,
                count: Math.round(interpolatedValue),
                value: interpolatedValue
            });
        }
        
        currentIndex = nextIndex;
    }
    
    result.push(data[data.length - 1]);
    return result;
}

// Initialize Chart.js
Chart.defaults.font.family = 'Roboto, sans-serif';
Chart.defaults.font.size = 11;
Chart.defaults.color = '#666';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
Chart.defaults.plugins.tooltip.titleFont = { size: 13, weight: 'bold' };
Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
Chart.defaults.plugins.tooltip.cornerRadius = 4;
Chart.defaults.plugins.tooltip.displayColors = true;
Chart.defaults.plugins.tooltip.boxPadding = 4;

// Register Chart.js plugins if not already registered
if (typeof Chart !== 'undefined' && Chart.register) {
    Chart.register(ChartDataLabels);
}

function calculateStabilityScore(data) {
    if (!data.revenue || !data.occupancy) return 0;
    
    const revenueStability = calculateMetricStability(data.revenue.map(r => r.amount));
    const occupancyStability = calculateMetricStability(data.occupancy.map(o => o.rate));
    
    // Weighted average of stability scores
    return (revenueStability * 0.6 + occupancyStability * 0.4);
}

function calculateMetricStability(values) {
    if (!values.length) return 0;
    
    // Calculate moving average
    const movingAvg = calculateMovingAverage(values, 3);
    
    // Calculate deviation from moving average
    const deviations = values.map((value, i) => {
        if (movingAvg[i] === undefined) return 0;
        return Math.abs((value - movingAvg[i]) / movingAvg[i]);
    });
    
    // Convert deviations to stability score (100 - average deviation percentage)
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    return Math.max(0, 100 - (avgDeviation * 100));
}

function calculateGrowthIndex(data) {
    if (!data.revenue || data.revenue.length < 2) return 0;
    
    // Calculate various growth indicators
    const revenueGrowth = calculateCompoundGrowthRate(data.revenue.map(r => r.amount));
    const bookingGrowth = calculateCompoundGrowthRate(data.bookings.map(b => b.count));
    const occupancyGrowth = calculateCompoundGrowthRate(data.occupancy.map(o => o.rate));
    
    // Weighted average of growth indicators
    return (revenueGrowth * 0.5 + bookingGrowth * 0.3 + occupancyGrowth * 0.2);
}

function calculateCompoundGrowthRate(values) {
    if (values.length < 2) return 0;
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const periods = values.length - 1;
    
    if (firstValue <= 0) return 0;
    
    // Calculate compound growth rate
    const growthRate = Math.pow(lastValue / firstValue, 1 / periods) - 1;
    return growthRate * 100;
}

function calculateVolatilityIndex(data) {
    if (!data.revenue || !data.revenue.length) return 0;
    
    // Calculate standard deviation of percentage changes
    const revenueChanges = calculatePercentageChanges(data.revenue.map(r => r.amount));
    const occupancyChanges = calculatePercentageChanges(data.occupancy.map(o => o.rate));
    
    const revenueVolatility = calculateStandardDeviation(revenueChanges);
    const occupancyVolatility = calculateStandardDeviation(occupancyChanges);
    
    // Normalize and combine volatility scores
    return Math.min(100, ((revenueVolatility + occupancyVolatility) / 2));
}

function calculatePercentageChanges(values) {
    return values.slice(1).map((value, index) => {
        const previousValue = values[index];
        if (previousValue === 0) return 0;
        return ((value - previousValue) / previousValue) * 100;
    });
}

function calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance);
}

function calculateMovingAverage(values, window) {
    return values.map((_, index) => {
        const start = Math.max(0, index - window + 1);
        const windowValues = values.slice(start, index + 1);
        return windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
    });
}
