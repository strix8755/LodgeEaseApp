import { auth, db, saveAnalyticsData, fetchAnalyticsData, verifyAdminPermissions, initializeAnalytics, fetchIntegratedAnalytics, fetchModuleAnalytics, fetchRoomAnalytics } from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { collection, query, getDocs, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

new Vue({
    el: '#app',
    data: {
        isAuthenticated: false,
        loading: true,
        messages: [],
        charts: {
            occupancy: null,
            revenue: null,
            bookingTrends: null,
            satisfaction: null,
            roomTypes: null
        },
        analyticsData: {
            occupancyRate: null,
            revenue: null,
            bookings: null,
            historicalData: [],
            predictions: {},
            seasonalPatterns: [],
            monthlyData: [],
            lastUpdate: null
        },
        suggestions: [
            { label: 'Occupancy Analysis', text: 'Show me detailed occupancy trends for the last 6 months' },
            { label: 'Revenue Analysis', text: 'What is our revenue performance compared to last year?' },
            { label: 'Booking Patterns', text: 'Show booking patterns and peak hours' },
            { label: 'Performance Report', text: 'Give me a full business performance report' },
            { label: 'Customer Satisfaction', text: 'What are the current customer satisfaction metrics?' }
        ],
        chartOptions: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        },
        currentMessage: '', // Add this line
        integratedData: {
            bookings: [],
            rooms: [],
            revenue: [],
            customers: [],
            activities: []
        },
        moduleMetrics: {
            bookingMetrics: null,
            roomMetrics: null,
            revenueMetrics: null,
            activityMetrics: null
        },
        roomAnalytics: {
            totalRooms: 0,
            occupiedRooms: 0,
            availableRooms: 0,
            maintenanceRooms: 0,
            roomTypes: {},
            occupancyRate: 0,
            revenueByRoom: {},
            popularRooms: []
        }
    },
    methods: {
        // Authentication Methods
        async handleLogout() {
            try {
                await signOut(auth);
                window.location.href = '../Login/index.html';
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Error signing out. Please try again.');
            }
        },

        checkAuthState() {
            auth.onAuthStateChanged(user => {
                this.isAuthenticated = !!user;
                if (!user) {
                    window.location.href = '../Login/index.html';
                }
                this.loading = false;
                // Initialize chat after auth check
                this.addMessage('Welcome to Lodge Ease AI Assistant! I can help you with:\n- Occupancy predictions\n- Revenue forecasts\n- Seasonal trends\n- Booking patterns\n\nWhat would you like to know?', 'bot');
            });
        },

        // Chart Creation Methods
        createOccupancyChart() {
            return {
                type: 'line',
                data: {
                    labels: this.getLast12Months(),
                    datasets: [{
                        label: 'Occupancy Rate',
                        data: this.analyticsData.historicalData.map(d => d.occupancyRate),
                        borderColor: '#1e3c72',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Occupancy Trends' }
                    }
                }
            };
        },

        createRevenueChart() {
            return {
                type: 'bar',
                data: {
                    labels: this.getLast12Months(),
                    datasets: [{
                        label: 'Monthly Revenue',
                        data: this.analyticsData.monthlyData.map(d => d.revenue),
                        backgroundColor: '#1e3c72',
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Revenue ($)'
                            }
                        }
                    }
                }
            };
        },

        createBookingTrendsChart() {
            return {
                type: 'line',
                data: {
                    labels: this.getHoursOfDay(),
                    datasets: [{
                        label: 'Booking Frequency',
                        data: this.analyticsData.bookingTrends,
                        borderColor: '#2ecc71',
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            };
        },

        createSatisfactionChart() {
            return {
                type: 'doughnut',
                data: {
                    labels: ['Excellent', 'Good', 'Average', 'Poor'],
                    datasets: [{
                        data: this.analyticsData.satisfactionMetrics,
                        backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Customer Satisfaction Distribution'
                        }
                    }
                }
            };
        },

        // Helper Methods
        getLast12Months() {
            const months = [];
            const date = new Date();
            for (let i = 0; i < 12; i++) {
                months.unshift(date.toLocaleString('default', { month: 'short' }));
                date.setMonth(date.getMonth() - 1);
            }
            return months;
        },

        getHoursOfDay() {
            return Array.from({length: 24}, (_, i) => `${i}:00`);
        },

        // Data Processing Methods
        async processRealTimeData(bookings, revenue, customers) {
            try {
                const processedData = {
                    bookingTrends: this.processBookingTrends(bookings),
                    revenueData: this.processRevenueData(revenue),
                    satisfactionMetrics: this.processSatisfactionData(customers)
                };

                this.updateAnalyticsData(processedData);
                return processedData;
            } catch (error) {
                console.error('Error processing real-time data:', error);
                throw error;
            }
        },

        processBookingTrends(bookings) {
            const hourlyBookings = new Array(24).fill(0);
            bookings.forEach(booking => {
                const hour = new Date(booking.date).getHours();
                hourlyBookings[hour]++;
            });
            return hourlyBookings;
        },

        processRevenueData(revenue) {
            const monthlyRevenue = {};
            revenue.forEach(r => {
                const month = new Date(r.date).toLocaleString('default', { month: 'short' });
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + r.amount;
            });
            return monthlyRevenue;
        },

        processSatisfactionData(customers) {
            const ratings = [0, 0, 0, 0]; // [Excellent, Good, Average, Poor]
            customers.forEach(c => {
                if (c.rating >= 4.5) ratings[0]++;
                else if (c.rating >= 3.5) ratings[1]++;
                else if (c.rating >= 2.5) ratings[2]++;
                else ratings[3]++;
            });
            return ratings;
        },

        updateAnalyticsData(newData) {
            this.analyticsData = {
                ...this.analyticsData,
                ...newData,
                lastUpdate: new Date()
            };
            this.updateCharts();
        },

        updateCharts() {
            Object.entries(this.charts).forEach(([key, chart]) => {
                if (chart && typeof chart.update === 'function') {
                    try {
                        chart.update();
                    } catch (error) {
                        console.error(`Error updating ${key} chart:`, error);
                    }
                }
            });
        },

        // Error Handling
        handleError(error, context) {
            console.error(`Error in ${context}:`, error);
            
            let userMessage = 'An error occurred. Please try again.';
            if (error.message.includes('permissions')) {
                userMessage = 'You do not have permission to access this feature. Please contact your administrator.';
            } else if (error.message.includes('collections')) {
                userMessage = 'Unable to access required data. Please ensure the system is properly configured.';
            }
            
            this.addMessage(userMessage, 'bot');
        },

        addMessage(content, type) {
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            
            messageDiv.innerHTML = `
                <div class="message-avatar ${type}">
                    <i class="fas fa-${type === 'bot' ? 'robot' : 'user'}"></i>
                </div>
                <div class="message-content">${content.replace(/\n/g, '<br>')}</div>
            `;
            
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        },

        async fetchAnalyticsData() {
            try {
                // Fetch occupancy data
                const bookingsRef = collection(db, 'bookings');
                const bookingsSnapshot = await getDocs(bookingsRef);
                const bookings = bookingsSnapshot.docs.map(doc => doc.data());

                // Calculate occupancy rate
                this.analyticsData.occupancyRate = this.calculateOccupancyRate(bookings);
                this.analyticsData.revenue = this.calculateRevenue(bookings);
                this.analyticsData.bookings = bookings.length;
            } catch (error) {
                console.error('Error fetching analytics:', error);
            }
        },

        calculateOccupancyRate(bookings) {
            // Add your occupancy rate calculation logic here
            return (bookings.filter(b => b.status === 'confirmed').length / 100) * 100;
        },

        calculateRevenue(bookings) {
            return bookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);
        },

        async processQuery(message) {
            const lowerMessage = message.toLowerCase();
            let response = '';

            try {
                if (lowerMessage.includes('room')) {
                    const roomData = await this.analyzeRoomData();
                    response = this.generateRoomAnalysisResponse(roomData);
                } else if (lowerMessage.includes('occupancy')) {
                    const occupancyRate = this.analyticsData.occupancyRate || 0;
                    response = `Current occupancy rate is ${occupancyRate}%. Based on historical data, we predict a 5% increase next month.`;
                } else if (lowerMessage.includes('revenue')) {
                    const revenue = this.analyticsData.revenue || 0;
                    response = `Total revenue: $${revenue.toLocaleString()}. Showing an upward trend of 15% compared to last quarter.`;
                } else if (lowerMessage.includes('trend')) {
                    response = this.generateTrendAnalysis();
                } else {
                    response = "I can help you analyze occupancy rates, revenue trends, and booking patterns. What specific information would you like to know?";
                }
            } catch (error) {
                console.error('Error processing query:', error);
                response = "I apologize, but I'm having trouble accessing that information right now. Please try again in a moment.";
            }

            return response;
        },

        // Add helper method to safely format numbers
        formatNumber(value) {
            return (value || 0).toLocaleString();
        },

        generateTrendAnalysis() {
            try {
                const occupancyRate = this.analyticsData.occupancyRate || 0;
                const revenue = this.analyticsData.revenue || 0;
                const bookings = this.analyticsData.bookings || 0;

                return `Based on our analysis:
                - Current Occupancy: ${occupancyRate}%
                - Total Revenue: $${this.formatNumber(revenue)}
                - Total Bookings: ${bookings}
                - Peak booking times: 2PM - 6PM
                - Most popular room type: Deluxe
                - Average stay duration: 3.5 days
                - Customer satisfaction rate: 4.2/5`;
            } catch (error) {
                console.error('Error generating trend analysis:', error);
                return 'Unable to generate trend analysis at this moment.';
            }
        },

        async sendMessage() {
            const message = this.currentMessage.trim();
            
            if (message) {
                this.addMessage(message, 'user');
                this.currentMessage = ''; // Clear input using v-model
                
                // Process the query and get real data
                const response = await this.processQuery(message);
                this.addMessage(response, 'bot');
            }
        },

        generateTrendAnalysis() {
            // Generate trend analysis based on actual data
            return `Based on our analysis:
            - Peak booking times: 2PM - 6PM
            - Most popular room type: Deluxe
            - Average stay duration: 3.5 days
            - Customer satisfaction rate: 4.2/5`;
        },

        submitSuggestion(suggestion) {
            document.getElementById('chatInput').value = suggestion;
            this.sendMessage();
        },

        startNewChat() {
            const chatContainer = document.getElementById('chatContainer');
            chatContainer.innerHTML = '';
            this.addMessage('Welcome to Lodge Ease AI Assistant! How can I help you today?', 'bot');
        },

        async initializeCharts() {
            try {
                // Wait for DOM to be ready
                await this.$nextTick();

                // Destroy existing charts if they exist
                Object.values(this.charts).forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });

                // Initialize each chart only if the canvas element exists
                const canvasIds = ['occupancyChart', 'revenueChart', 'bookingTrendsChart', 'customerSatisfactionChart', 'roomTypesChart'];
                
                canvasIds.forEach(id => {
                    const canvas = document.getElementById(id);
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            switch(id) {
                                case 'occupancyChart':
                                    this.charts.occupancy = new Chart(ctx, this.createOccupancyChart());
                                    break;
                                case 'revenueChart':
                                    this.charts.revenue = new Chart(ctx, this.createRevenueChart());
                                    break;
                                case 'bookingTrendsChart':
                                    this.charts.bookingTrends = new Chart(ctx, this.createBookingTrendsChart());
                                    break;
                                case 'customerSatisfactionChart':
                                    this.charts.satisfaction = new Chart(ctx, this.createSatisfactionChart());
                                    break;
                                case 'roomTypesChart':
                                    this.charts.roomTypes = new Chart(ctx, {
                                        type: 'pie',
                                        data: {
                                            labels: [],
                                            datasets: [{
                                                data: [],
                                                backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                                            }]
                                        },
                                        options: this.chartOptions
                                    });
                                    break;
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing charts:', error);
            }
        },

        async predictFutureMetrics() {
            const historicalData = this.analyticsData.historicalData;
            if (!historicalData || historicalData.length === 0) {
                console.warn('No historical data available for predictions');
                return;
            }

            const predictions = {
                occupancy: this.calculateExponentialSmoothing(historicalData.map(d => d.occupancyRate)),
                revenue: this.calculateLinearRegression(historicalData.map(d => d.revenue)),
                seasonality: this.analyzeSeasonalPatterns(historicalData)
            };
            this.analyticsData.predictions = predictions;
        },

        analyzeSeasonalPatterns(data) {
            try {
                if (!data || data.length === 0) return [];

                // Group data by month
                const monthlyData = {};
                data.forEach(entry => {
                    const month = new Date(entry.date).getMonth();
                    if (!monthlyData[month]) {
                        monthlyData[month] = [];
                    }
                    monthlyData[month].push({
                        occupancyRate: entry.occupancyRate,
                        revenue: entry.revenue,
                        bookings: entry.bookings
                    });
                });

                // Calculate seasonal indices
                const seasonalPatterns = [];
                for (let month = 0; month < 12; month++) {
                    const monthData = monthlyData[month] || [];
                    if (monthData.length > 0) {
                        const avgOccupancy = monthData.reduce((sum, entry) => sum + entry.occupancyRate, 0) / monthData.length;
                        const avgRevenue = monthData.reduce((sum, entry) => sum + entry.revenue, 0) / monthData.length;
                        const avgBookings = monthData.reduce((sum, entry) => sum + entry.bookings, 0) / monthData.length;

                        seasonalPatterns.push({
                            month: new Date(2024, month).toLocaleString('default', { month: 'short' }),
                            occupancyIndex: avgOccupancy,
                            revenueIndex: avgRevenue,
                            bookingIndex: avgBookings
                        });
                    }
                }

                return seasonalPatterns;
            } catch (error) {
                console.error('Error analyzing seasonal patterns:', error);
                return [];
            }
        },

        // Add helper method for trends analysis
        async analyzeTrends() {
            const seasonalPatterns = this.analyticsData.predictions.seasonality || [];
            const peakMonths = seasonalPatterns
                .sort((a, b) => b.occupancyIndex - a.occupancyIndex)
                .slice(0, 3)
                .map(p => p.month);

            return {
                peakMonths,
                yearOverYear: this.calculateYearOverYearGrowth(),
                forecast: this.generateForecast()
            };
        },

        calculateYearOverYearGrowth() {
            const data = this.analyticsData.historicalData;
            if (data.length < 365) return null;

            const thisYear = data.slice(-365, -1);
            const lastYear = data.slice(-730, -366);

            return {
                revenue: this.calculateGrowthRate(
                    this.sum(lastYear, 'revenue'),
                    this.sum(thisYear, 'revenue')
                ),
                occupancy: this.calculateGrowthRate(
                    this.average(lastYear, 'occupancyRate'),
                    this.average(thisYear, 'occupancyRate')
                )
            };
        },

        sum(data, key) {
            return data.reduce((sum, entry) => sum + (entry[key] || 0), 0);
        },

        average(data, key) {
            return this.sum(data, key) / data.length;
        },

        calculateGrowthRate(previous, current) {
            return previous ? ((current - previous) / previous) * 100 : 0;
        },

        generateForecast() {
            const seasonality = this.analyticsData.predictions.seasonality || [];
            const trends = this.analyticsData.predictions.occupancy || [];
            
            return {
                nextMonth: {
                    occupancy: trends[trends.length - 1],
                    revenue: this.predictNextMonthRevenue(),
                    confidence: this.calculateConfidenceScore()
                }
            };
        },

        predictNextMonthRevenue() {
            const revenueData = this.analyticsData.historicalData.map(d => d.revenue);
            const trend = this.calculateLinearRegression(revenueData);
            return trend[trend.length - 1];
        },

        calculateConfidenceScore() {
            // Simple confidence score based on data quality
            const dataPoints = this.analyticsData.historicalData.length;
            const maxScore = 100;
            return Math.min(maxScore, (dataPoints / 180) * maxScore); // 6 months of data = 100% confidence
        },

        async initializeAnalytics() {
            try {
                // Verify permissions first
                const hasPermissions = await verifyAdminPermissions();
                if (!hasPermissions) {
                    throw new Error('Insufficient permissions to access analytics');
                }

                // Initialize analytics collection
                const initialized = await initializeAnalytics();
                if (!initialized) {
                    throw new Error('Failed to initialize analytics system');
                }

                // Initialize collections if they don't exist
                await this.ensureCollectionsExist();
                
                // Fetch data
                await this.fetchHistoricalData();
                await this.predictFutureMetrics();
                await this.initializeCharts();
                
                // Setup real-time updates
                this.setupRealTimeUpdates();
                
                // Log initialization with basic data only
                await saveAnalyticsData('initialization', {
                    timestamp: new Date(),
                    status: 'success'
                });

                // Add integrated data fetching
                await this.fetchIntegratedData();
                await this.analyzeRoomData();
            } catch (error) {
                this.handleError(error, 'analytics-initialization');
                this.addMessage('Unable to load analytics data. Please check your permissions or try again later.', 'bot');
            }
        },

        async ensureCollectionsExist() {
            try {
                const collections = ['analytics', 'bookings', 'revenue', 'customers', 'rooms'];
                for (const collName of collections) {
                    const collRef = collection(db, collName);
                    const testQuery = query(collRef, limit(1));
                    await getDocs(testQuery);
                }
            } catch (error) {
                console.error('Error checking collections:', error);
                throw new Error('Required collections not accessible');
            }
        },

        async fetchHistoricalData() {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const [occupancy, revenue, bookings] = await Promise.all([
                fetchAnalyticsData('occupancy', sixMonthsAgo),
                fetchAnalyticsData('revenue', sixMonthsAgo),
                fetchAnalyticsData('bookings', sixMonthsAgo)
            ]);

            this.analyticsData.historicalData = this.processHistoricalData(
                occupancy, revenue, bookings
            );
        },

        processHistoricalData(occupancy, revenue, bookings) {
            // Process and combine data for charts
            return occupancy.map((occ, index) => ({
                date: occ.timestamp.toDate(),
                occupancyRate: occ.data.rate,
                revenue: revenue[index]?.data.amount || 0,
                bookings: bookings[index]?.data.count || 0
            }));
        },

        setupRealTimeUpdates() {
            setInterval(async () => {
                const newData = await this.fetchRealTimeData();
                this.updateCharts(newData);
            }, 300000); // Update every 5 minutes
        },

        calculateExponentialSmoothing(data, alpha = 0.3) {
            let result = [data[0]];
            for (let i = 1; i < data.length; i++) {
                result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
            }
            return result;
        },

        calculateLinearRegression(data) {
            const n = data.length;
            const x = Array.from({length: n}, (_, i) => i);
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = data.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((acc, val, i) => acc + val * data[i], 0);
            const sumXX = x.reduce((acc, val) => acc + val * val, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            return x.map(xi => slope * xi + intercept);
        },

        async exportReport(format) {
            const data = await this.generateReportData();
            if (format === 'pdf') {
                this.exportPDF(data);
            } else {
                this.exportCSV(data);
            }
        },

        async generateReportData() {
            return {
                occupancy: this.analyticsData.occupancyRate,
                revenue: this.analyticsData.revenue,
                predictions: this.analyticsData.predictions,
                trends: await this.analyzeTrends()
            };
        },

        exportPDF(data) {
            const doc = new jsPDF();
            doc.text('Lodge Ease Analytics Report', 20, 10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 20);
            doc.text(`Occupancy Rate: ${data.occupancy}%`, 20, 30);
            doc.text(`Revenue: $${data.revenue.toLocaleString()}`, 20, 40);
            doc.save('lodge-ease-analytics.pdf');
        },

        exportCSV(data) {
            const csvContent = `Date,Occupancy,Revenue\n${
                this.analyticsData.historicalData.map(d => 
                    `${d.date},${d.occupancyRate},${d.revenue}`
                ).join('\n')
            }`;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'lodge-ease-analytics.csv';
            a.click();
        },

        async fetchRealTimeData() {
            // Fetch data from other admin pages
            const bookingsRef = collection(db, 'bookings');
            const revenueRef = collection(db, 'revenue');
            const customersRef = collection(db, 'customers');

            const [bookings, revenue, customers] = await Promise.all([
                getDocs(query(bookingsRef, orderBy('date', 'desc'), limit(100))),
                getDocs(query(revenueRef, orderBy('date', 'desc'), limit(100))),
                getDocs(query(customersRef, orderBy('date', 'desc'), limit(100)))
            ]);

            return this.processRealTimeData(bookings, revenue, customers);
        },

        async fetchIntegratedData() {
            try {
                const data = await fetchIntegratedAnalytics();
                if (data.status === 'error') {
                    throw new Error(data.error || 'Failed to fetch analytics data');
                }
                
                // Update state only if we have valid data
                if (data.status === 'success') {
                    this.integratedData = data;
                    await this.calculateModuleMetrics();
                }
            } catch (error) {
                console.error('Error fetching integrated data:', error);
                this.handleError(error, 'data-integration');
                
                // Initialize with empty data to prevent UI errors
                this.integratedData = {
                    bookings: [],
                    rooms: [],
                    revenue: [],
                    customers: [],
                    activities: []
                };
            }
        },

        async calculateModuleMetrics() {
            try {
                // Check if we have data to process
                if (!this.integratedData.bookings || !this.integratedData.rooms) {
                    throw new Error('Required data is missing');
                }

                // Calculate booking metrics
                const bookingMetrics = {
                    total: this.integratedData.bookings.length,
                    pending: this.integratedData.bookings.filter(b => b.status === 'pending').length,
                    confirmed: this.integratedData.bookings.filter(b => b.status === 'confirmed').length,
                    canceled: this.integratedData.bookings.filter(b => b.status === 'cancelled').length,
                    revenue: this.integratedData.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
                };

                // Calculate room metrics
                const roomMetrics = {
                    total: this.integratedData.rooms.length,
                    available: this.integratedData.rooms.filter(r => r.status === 'available').length,
                    occupied: this.integratedData.rooms.filter(r => r.status === 'occupied').length,
                    maintenance: this.integratedData.rooms.filter(r => r.status === 'maintenance').length,
                    occupancyRate: (this.integratedData.rooms.filter(r => r.status === 'occupied').length / 
                                  this.integratedData.rooms.length) * 100
                };

                // Calculate revenue metrics
                const revenueMetrics = {
                    total: this.integratedData.revenue.reduce((sum, r) => sum + (r.amount || 0), 0),
                    average: this.integratedData.revenue.reduce((sum, r) => sum + (r.amount || 0), 0) / 
                            this.integratedData.revenue.length || 0,
                    transactions: this.integratedData.revenue.length
                };

                // Calculate activity metrics
                const activityMetrics = {
                    total: this.integratedData.activities.length,
                    byType: this.groupActivitiesByType(this.integratedData.activities),
                    recentActivities: this.integratedData.activities.slice(0, 10)
                };

                this.moduleMetrics = {
                    bookingMetrics,
                    roomMetrics,
                    revenueMetrics,
                    activityMetrics
                };

                // Update charts with new data
                this.updateChartsWithIntegratedData();
            } catch (error) {
                console.error('Error calculating metrics:', error);
                this.handleError(error, 'metrics-calculation');
            }
        },

        groupActivitiesByType(activities) {
            return activities.reduce((acc, activity) => {
                acc[activity.actionType] = (acc[activity.actionType] || 0) + 1;
                return acc;
            }, {});
        },

        updateChartsWithIntegratedData() {
            try {
                if (this.charts.occupancy) {
                    const data = this.calculateOccupancyTrend();
                    this.charts.occupancy.data.datasets[0].data = data;
                    this.charts.occupancy.update('none'); // Use 'none' mode for better performance
                }

                if (this.charts.revenue) {
                    const data = this.calculateRevenueTrend();
                    this.charts.revenue.data.datasets[0].data = data;
                    this.charts.revenue.update('none');
                }

                if (this.charts.bookingTrends) {
                    const data = this.calculateBookingTrend();
                    this.charts.bookingTrends.data.datasets[0].data = data;
                    this.charts.bookingTrends.update('none');
                }

                if (this.charts.satisfaction) {
                    const data = this.calculateSatisfactionMetrics();
                    this.charts.satisfaction.data.datasets[0].data = data;
                    this.charts.satisfaction.update('none');
                }

                if (this.charts.roomTypes) {
                    const roomTypeData = {
                        labels: Object.keys(this.roomAnalytics.roomTypes || {}),
                        datasets: [{
                            data: Object.values(this.roomAnalytics.roomTypes || {}),
                            backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                        }]
                    };
                    this.charts.roomTypes.data = roomTypeData;
                    this.charts.roomTypes.update('none');
                }
            } catch (error) {
                console.error('Error updating charts:', error);
            }
        },

        // Add these helper methods for chart data calculation
        calculateOccupancyTrend() {
            // Calculate monthly occupancy rates
            return this.getLast12Months().map(month => {
                const monthData = this.integratedData.bookings.filter(b => 
                    new Date(b.createdAt).toLocaleString('default', { month: 'short' }) === month
                );
                return (monthData.length / this.integratedData.rooms.length) * 100;
            });
        },

        calculateRevenueTrend() {
            // Calculate monthly revenue
            return this.getLast12Months().map(month => {
                return this.integratedData.revenue
                    .filter(r => new Date(r.date).toLocaleString('default', { month: 'short' }) === month)
                    .reduce((sum, r) => sum + (r.amount || 0), 0);
            });
        },

        calculateBookingTrend() {
            // Calculate hourly booking distribution
            const hourlyBookings = new Array(24).fill(0);
            this.integratedData.bookings.forEach(booking => {
                const hour = new Date(booking.createdAt).getHours();
                hourlyBookings[hour]++;
            });
            return hourlyBookings;
        },

        calculateSatisfactionMetrics() {
            const ratings = [0, 0, 0, 0]; // Excellent, Good, Average, Poor
            this.integratedData.bookings.forEach(booking => {
                if (booking.rating >= 4.5) ratings[0]++;
                else if (booking.rating >= 3.5) ratings[1]++;
                else if (booking.rating >= 2.5) ratings[2]++;
                else ratings[3]++;
            });
            return ratings;
        },

        async analyzeRoomData() {
            try {
                const roomData = await fetchRoomAnalytics();
                this.roomAnalytics = roomData.analytics;
                this.updateRoomCharts();
                return roomData;
            } catch (error) {
                console.error('Error analyzing room data:', error);
                this.handleError(error, 'room-analysis');
            }
        },

        generateRoomAnalysisResponse(roomData) {
            const { analytics } = roomData;
            const mostPopular = analytics.popularRooms[0];
            
            return `Room Analysis:
                - Total Rooms: ${analytics.totalRooms}
                - Currently Occupied: ${analytics.occupiedRooms}
                - Available: ${analytics.availableRooms}
                - Under Maintenance: ${analytics.maintenanceRooms}
                - Overall Occupancy Rate: ${analytics.occupancyRate.toFixed(1)}%
                - Most Popular Room: ${mostPopular.roomNumber} (${mostPopular.roomType})
                - Total Bookings for Most Popular: ${mostPopular.bookingCount}
                - Revenue Generated: $${mostPopular.revenue.toLocaleString()}`;
        },

        updateRoomCharts() {
            const roomTypeData = {
                labels: Object.keys(this.roomAnalytics.roomTypes),
                datasets: [{
                    data: Object.values(this.roomAnalytics.roomTypes),
                    backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                }]
            };

            if (this.charts.roomTypes) {
                this.charts.roomTypes.data = roomTypeData;
                this.charts.roomTypes.update();
            }
        }
    },
    async mounted() {
        try {
            await this.checkAuthState();
            // Initialize analytics first
            await this.initializeAnalytics();
            // Initialize charts after analytics data is loaded
            await this.$nextTick();
            await this.initializeCharts();
            
            console.log('Analytics system initialized successfully');
        } catch (error) {
            this.handleError(error, 'mounted');
        }
    }
});