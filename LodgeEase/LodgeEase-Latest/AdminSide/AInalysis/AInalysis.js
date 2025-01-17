import { auth, db, saveAnalyticsData, fetchAnalyticsData, verifyAdminPermissions, initializeAnalytics, fetchIntegratedAnalytics, fetchModuleAnalytics, fetchRoomAnalytics } from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { collection, query, getDocs, where, orderBy, limit, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { SuggestionService } from '../js/suggestionService.js'; // Add this import

// Wait for both DOM and Firebase Auth to be ready
Promise.all([
    new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
    }),
    new Promise(resolve => {
        auth.onAuthStateChanged(user => {
            console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user');
            resolve(user);
        });
    })
]).then(([_, user]) => {
    new Vue({
        el: '#app',
        data: {
            isAuthenticated: false,
            loading: true,
            error: null, // Add the missing error property
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
            },
            loading: {
                charts: true,
                roomTypes: true,
                occupancy: true,
                bookings: true,
                satisfaction: true
            },
            chartVisibility: {
                roomTypes: false, // Changed from true to false
                occupancy: false, // Changed from true to false
                bookingTrends: false, // Changed from true to false
                satisfaction: false  // Changed from true to false
            },
            initialSuggestions: [
                { text: 'How is our current occupancy rate?' },
                { text: 'Show me revenue trends' },
                { text: 'What are the peak booking hours?' },
                { text: 'Generate a performance report' }
            ]
        },
        async created() {
            // Initialize auth state first
            await this.checkAuthState();
            console.log('Auth state checked');
        },
        async mounted() {
            try {
                console.log('Component mounting...');
                await this.checkAuthState();
                
                // Wait for the DOM to be fully ready
                await this.$nextTick();
                
                // Initialize analytics with initial data
                const initialData = await this.fetchInitialData();
                if (!initialData) {
                    throw new Error('Failed to fetch initial data');
                }
                
                // Initialize analytics and charts
                await this.initializeAnalytics(initialData);
                
                console.log('Component mounted successfully');
            } catch (error) {
                console.error('Error in mounted:', error);
                this.handleError(error, 'mounted');
            }
        },
        beforeDestroy() {
            // Cleanup interval and charts
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
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
                return new Promise((resolve, reject) => {
                    const user = auth.currentUser;
                    console.log('Current user in checkAuthState:', user?.email);
                    
                    if (!user) {
                        this.isAuthenticated = false;
                        window.location.href = '../Login/index.html';
                        reject(new Error('Not authenticated'));
                        return;
                    }

                    this.isAuthenticated = true;
                    this.loading = false;
                    resolve(user);
                });
            },

            // Chart Creation Methods
            createOccupancyChart() {
                return {
                    type: 'line',
                    data: {
                        labels: this.getLast12Months(),
                        datasets: [{
                            label: 'Room Occupancy Rate (%)',
                            data: [],  // Will be populated with actual data
                            borderColor: '#1e3c72',
                            backgroundColor: 'rgba(30, 60, 114, 0.1)',
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            title: {
                                display: true,
                                text: 'Monthly Occupancy Rate'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                title: {
                                    display: true,
                                    text: 'Occupancy Rate (%)'
                                }
                            }
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

            createRoomTypesChart() {
                try {
                    const ctx = document.getElementById('roomTypesChart')?.getContext('2d');
                    if (!ctx) {
                        throw new Error('Room types chart context not found');
                    }

                    // Explicitly create new Chart instance
                    return new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Standard', 'Deluxe', 'Suite', 'Family'],
                            datasets: [{
                                data: [0, 0, 0, 0],
                                backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c'],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: {
                                duration: 750
                            },
                            plugins: {
                                legend: {
                                    position: 'right',
                                    labels: {
                                        padding: 20,
                                        font: {
                                            size: 12
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error creating room types chart:', error);
                    this.error = 'Failed to create room types chart';
                    return null;
                }
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
                try {
                    const lowerMessage = message.toLowerCase();
                    
                    // Get fresh data from Firestore
                    const [bookings, rooms, revenue] = await Promise.all([
                        this.fetchBookingData(),
                        this.fetchRoomData(),
                        this.fetchRevenueData()
                    ]);

                    let response = '';

                    // Process based on query type
                    if (lowerMessage.includes('occupancy') || lowerMessage.includes('occupied')) {
                        const occupancyStats = this.calculateOccupancyStats(rooms, bookings);
                        response = `Current Occupancy Analysis:\n` +
                                  `- Overall Occupancy Rate: ${occupancyStats.rate.toFixed(1)}%\n` +
                                  `- Occupied Rooms: ${occupancyStats.occupied}\n` +
                                  `- Available Rooms: ${occupancyStats.available}\n` +
                                  `- Peak Occupancy Month: ${occupancyStats.peakMonth}\n` +
                                  `- Average Stay Duration: ${occupancyStats.avgStayDuration.toFixed(1)} days`;

                    } else if (lowerMessage.includes('revenue') || lowerMessage.includes('income') || lowerMessage.includes('earnings')) {
                        const revenueStats = this.calculateRevenueStats(revenue, bookings);
                        response = `Revenue Analysis:\n` +
                                  `- Total Revenue: $${revenueStats.total.toLocaleString()}\n` +
                                  `- Average Revenue per Booking: $${revenueStats.avgPerBooking.toFixed(2)}\n` +
                                  `- Most Profitable Month: ${revenueStats.bestMonth}\n` +
                                  `- Revenue Trend: ${revenueStats.trend}\n` +
                                  `- Year-over-Year Growth: ${revenueStats.yoyGrowth.toFixed(1)}%`;

                    } else if (lowerMessage.includes('booking') || lowerMessage.includes('reservation')) {
                        const bookingStats = this.calculateBookingStats(bookings);
                        response = `Booking Analysis:\n` +
                                  `- Total Bookings: ${bookingStats.total}\n` +
                                  `- Current Active Bookings: ${bookingStats.active}\n` +
                                  `- Peak Booking Hours: ${bookingStats.peakHours.join(', ')}\n` +
                                  `- Most Popular Room Type: ${bookingStats.popularRoomType}\n` +
                                  `- Average Booking Value: $${bookingStats.avgValue.toFixed(2)}`;

                    } else if (lowerMessage.includes('performance') || lowerMessage.includes('report')) {
                        const performance = await this.generatePerformanceReport(rooms, bookings, revenue);
                        response = performance;

                    } else {
                        response = `I can help you analyze:\n` +
                                  `- Occupancy trends and room statistics\n` +
                                  `- Revenue and financial performance\n` +
                                  `- Booking patterns and guest preferences\n` +
                                  `- Overall business performance\n\n` +
                                  `Please ask me about any of these topics!`;
                    }

                    return response;

                } catch (error) {
                    console.error('Error processing query:', error);
                    return "I apologize, but I'm having trouble accessing the data right now. Please try again in a moment.";
                }
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
                
                if (!message) return;

                try {
                    // Add user message
                    this.addMessage(message, 'user');
                    
                    // Clear input
                    this.currentMessage = '';

                    // Show typing indicator
                    this.addTypingIndicator();

                    // Process the query and get response
                    const response = await this.processQuery(message);

                    // Remove typing indicator and add bot response
                    this.removeTypingIndicator();
                    this.addMessage(response, 'bot');

                    // Add follow-up suggestions based on the response
                    this.addSuggestions(response);
                } catch (error) {
                    console.error('Error sending message:', error);
                    this.removeTypingIndicator();
                    this.addMessage('Sorry, I encountered an error processing your request.', 'bot');
                }
            },

            submitSuggestion(suggestion) {
                this.currentMessage = suggestion;
                this.sendMessage();
            },

            startNewChat() {
                const chatContainer = document.getElementById('chatContainer');
                chatContainer.innerHTML = '';
                this.addMessage('Welcome to Lodge Ease AI Assistant! How can I help you today?', 'bot');
            },

            async initializeCharts(data) {
                try {
                    console.log('Initializing charts with data:', data);
                    
                    // Set default sample data if no data is provided
                    const defaultData = {
                        roomTypes: {
                            Standard: 10,
                            Deluxe: 8,
                            Suite: 6,
                            Family: 4
                        },
                        occupancy: Array.from({length: 12}, () => ({
                            month: 'Jan',
                            rate: Math.floor(Math.random() * 60) + 40
                        })),
                        bookings: Array.from({length: 24}, () => Math.floor(Math.random() * 20)),
                        satisfaction: [30, 45, 15, 10]
                    };

                    // Use provided data or default data
                    const chartData = {
                        roomTypes: data?.roomTypes || defaultData.roomTypes,
                        occupancy: data?.occupancy || defaultData.occupancy,
                        bookings: data?.bookings || defaultData.bookings,
                        satisfaction: data?.satisfaction || defaultData.satisfaction
                    };

                    // Initialize room types chart
                    const roomTypesCtx = document.getElementById('roomTypesChart')?.getContext('2d');
                    if (roomTypesCtx) {
                        if (this.charts.roomTypes) {
                            this.charts.roomTypes.destroy();
                        }
                        this.charts.roomTypes = new Chart(roomTypesCtx, {
                            type: 'doughnut',
                            data: {
                                labels: Object.keys(chartData.roomTypes),
                                datasets: [{
                                    data: Object.values(chartData.roomTypes),
                                    backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'right',
                                        labels: {
                                            padding: 20,
                                            font: { size: 12 }
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // Initialize occupancy chart
                    const occupancyCtx = document.getElementById('occupancyChart')?.getContext('2d');
                    if (occupancyCtx) {
                        if (this.charts.occupancy) {
                            this.charts.occupancy.destroy();
                        }
                        this.charts.occupancy = new Chart(occupancyCtx, {
                            type: 'line',
                            data: {
                                labels: this.getLast12Months(),
                                datasets: [{
                                    label: 'Occupancy Rate (%)',
                                    data: chartData.occupancy.map(d => d.rate),
                                    borderColor: '#1e3c72',
                                    fill: true,
                                    backgroundColor: 'rgba(30, 60, 114, 0.1)',
                                    tension: 0.4
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
                                            callback: value => `${value}%`
                                        }
                                    }
                                },
                                plugins: {
                                    legend: {
                                        display: true,
                                        position: 'bottom'
                                    }
                                }
                            }
                        });
                    }

                    // Initialize booking trends chart
                    const bookingTrendsCtx = document.getElementById('bookingTrendsChart')?.getContext('2d');
                    if (bookingTrendsCtx) {
                        if (this.charts.bookingTrends) {
                            this.charts.bookingTrends.destroy();
                        }
                        this.charts.bookingTrends = new Chart(bookingTrendsCtx, {
                            type: 'bar',
                            data: {
                                labels: this.getHoursOfDay(),
                                datasets: [{
                                    label: 'Bookings',
                                    data: chartData.bookings,
                                    backgroundColor: '#4CAF50',
                                    borderRadius: 4
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
                                },
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                }
                            }
                        });
                    }

                    // Initialize satisfaction chart
                    const satisfactionCtx = document.getElementById('customerSatisfactionChart')?.getContext('2d');
                    if (satisfactionCtx) {
                        if (this.charts.satisfaction) {
                            this.charts.satisfaction.destroy();
                        }
                        this.charts.satisfaction = new Chart(satisfactionCtx, {
                            type: 'doughnut',
                            data: {
                                labels: ['Excellent', 'Good', 'Average', 'Poor'],
                                datasets: [{
                                    data: chartData.satisfaction,
                                    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#F44336']
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'right',
                                        labels: {
                                            padding: 20,
                                            font: { size: 12 }
                                        }
                                    }
                                }
                            }
                        });
                    }

                    console.log('All charts initialized with data:', chartData);
                    return true;
                } catch (error) {
                    console.error('Error initializing charts:', error);
                    this.error = 'Failed to initialize charts';
                    return false;
                }
            },

            createChart(canvasId, config) {
                const canvas = document.getElementById(canvasId);
                if (!canvas) {
                    console.error(`Canvas ${canvasId} not found`);
                    return null;
                }

                // Destroy existing chart if it exists
                if (this.charts[canvasId]) {
                    this.charts[canvasId].destroy();
                }

                // Create new chart
                return new Chart(canvas, config);
            },

            async fetchInitialData() {
                try {
                    console.log('Starting to fetch initial data...');
                    const [rooms, bookings] = await Promise.all([
                        this.fetchRoomData(),
                        this.fetchBookingData()
                    ]);

                    console.log('Raw room data:', rooms);
                    console.log('Raw booking data:', bookings);

                    const processedData = {
                        roomTypes: this.processRoomTypes(rooms),
                        occupancy: this.processOccupancy(bookings),
                        bookings: this.processBookings(bookings),
                        satisfaction: this.processSatisfaction(bookings)
                    };

                    console.log('Processed data:', processedData);
                    return processedData;
                } catch (error) {
                    console.error('Error in fetchInitialData:', error);
                    return null;
                }
            },

            // Update the chart initialization method
            async initializeCharts() {
                try {
                    this.error = null;
                    this.loading = { charts: true, roomTypes: true, occupancy: true };
                    console.log('Initializing charts...');

                    await this.$nextTick();
                    const data = await this.fetchInitialData();
                    
                    if (!data) {
                        throw new Error('Failed to fetch initial data');
                    }

                    // Create room types chart
                    this.charts.roomTypes = this.createChart('roomTypesChart', 'doughnut', {
                        labels: Object.keys(data.roomTypes),
                        datasets: [{
                            data: Object.values(data.roomTypes),
                            backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                        }]
                    });

                    // Create occupancy chart
                    this.charts.occupancy = this.createChart('occupancyChart', 'line', {
                        labels: data.occupancy.map(d => d.month),
                        datasets: [{
                            label: 'Occupancy Rate',
                            data: data.occupancy.map(d => d.rate),
                            borderColor: '#1e3c72',
                            fill: true,
                            backgroundColor: 'rgba(30, 60, 114, 0.1)'
                        }]
                    });

                    // Force update after creation
                    Object.values(this.charts).forEach(chart => {
                        if (chart && typeof chart.update === 'function') {
                            chart.update();
                        }
                    });

                    this.loading = { charts: false, roomTypes: false, occupancy: false };
                    console.log('Charts initialized with data:', data);

                } catch (error) {
                    console.error('Error initializing charts:', error);
                    this.error = 'Failed to initialize charts';
                    this.loading = { charts: false, roomTypes: false, occupancy: false };
                }
            },

            async fetchInitialData() {
                try {
                    const [rooms, bookings] = await Promise.all([
                        this.fetchRoomData(),
                        this.fetchBookingData()
                    ]);

                    return {
                        roomTypes: this.processRoomTypes(rooms),
                        occupancy: this.processOccupancy(bookings),
                        bookings: this.processBookings(bookings),
                        satisfaction: this.processSatisfaction(bookings)
                    };
                } catch (error) {
                    console.error('Error fetching initial data:', error);
                    return null;
                }
            },

            async fetchRoomData() {
                const roomsRef = collection(db, 'rooms');
                const snapshot = await getDocs(roomsRef);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            },

            async fetchBookingData() {
                const bookingsRef = collection(db, 'bookings');
                const snapshot = await getDocs(bookingsRef);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            },

            processRoomTypes(rooms) {
                return rooms.reduce((acc, room) => {
                    const type = this.normalizeRoomType(room.type || room.propertyDetails?.roomType);
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {
                    'Standard': 0,
                    'Deluxe': 0,
                    'Suite': 0,
                    'Family': 0
                });
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

            async ensureCollectionsExist() {
                try {
                    const collections = ['analytics', 'bookings', 'revenue', 'customers', 'rooms'];
                    
                    // First verify auth
                    const user = auth.currentUser;
                    if (!user) {
                        console.warn('User not authenticated');
                        return false;
                    }

                    // Create basic documents in each collection
                    for (const collName of collections) {
                        try {
                            const collRef = collection(db, collName);
                            const configRef = doc(collRef, '_config');
                            
                            // Use merge to avoid overwriting existing data
                            await setDoc(configRef, {
                                lastUpdated: new Date(),
                                initialized: true
                            }, { merge: true });
                            
                            console.log(`Collection ${collName} initialized`);
                        } catch (error) {
                            console.warn(`Error initializing ${collName}:`, error);
                            // Continue with other collections
                        }
                    }
                    return true;
                } catch (error) {
                    console.error('Error in ensureCollectionsExist:', error);
                    return false;
                }
            },

            async initializeAnalytics(initialData) {
                try {
                    if (!auth.currentUser) {
                        throw new Error('User not authenticated');
                    }

                    console.log('Starting analytics initialization...');
                    this.loading = { charts: true, roomTypes: true, occupancy: true };

                    // Initialize collections first
                    await this.ensureCollectionsExist();
                    
                    // Use the provided initial data or fetch new data
                    const data = initialData || await this.fetchInitialData();
                    if (!data) {
                        throw new Error('Failed to get analytics data');
                    }

                    // Initialize charts with data
                    await this.initializeCharts(data);
                    
                    // Set up automatic updates
                    this.setupRealTimeUpdates();
                    
                    this.loading = { charts: false, roomTypes: false, occupancy: false };
                    console.log('Analytics initialization completed');
                    return true;
                } catch (error) {
                    console.error('Error in initializeAnalytics:', error);
                    this.handleError(error, 'analytics-initialization');
                    this.loading = { charts: false, roomTypes: false, occupancy: false };
                    return false;
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
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
                this.updateInterval = setInterval(async () => {
                    console.log('Performing real-time update');
                    const roomData = await this.fetchAndProcessRoomData();
                    if (roomData) {
                        await this.updateAllCharts({
                            roomTypes: roomData.analytics.roomTypes,
                            occupancy: roomData.analytics.occupancyTrends,
                            bookingTrends: roomData.analytics.bookingTrends,
                            satisfaction: roomData.analytics.satisfaction
                        });
                    }
                }, 600000); // Update every 10 minutes instead of 5
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
                if (this.integratedData.rooms.length > 0) {
                    console.log('Using cached integrated data');
                    return;
                }
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
            },

            async fetchAndProcessRoomData() {
                try {
                    const [roomsSnapshot, bookingsSnapshot] = await Promise.all([
                        getDocs(collection(db, 'rooms')),
                        getDocs(collection(db, 'bookings'))
                    ]);

                    // Process room types
                    const rooms = roomsSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            floor: data.floor || '',
                            roomNumber: data.roomNumber || '',
                            status: data.status || 'Available',
                            type: this.normalizeRoomType(data.type || data.propertyDetails?.roomType || 'Standard')
                        };
                    });

                    // Process bookings
                    const bookings = bookingsSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            checkIn: data.checkIn?.toDate?.() || new Date(data.checkIn),
                            checkOut: data.checkOut?.toDate?.() || new Date(data.checkOut),
                            status: data.status || 'pending',
                            guestName: data.guestName,
                            propertyDetails: data.propertyDetails || {}
                        };
                    });

                    // Calculate room type distribution
                    const roomTypeData = rooms.reduce((acc, room) => {
                        const type = room.type;
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                    }, {
                        'Standard': 0,
                        'Deluxe': 0,
                        'Suite': 0,
                        'Family': 0
                    });

                    // Calculate occupancy trends
                    const now = new Date();
                    const last12Months = this.getLast12Months();
                    const occupancyTrends = last12Months.map(month => {
                        const monthlyBookings = bookings.filter(booking => {
                            const bookingMonth = booking.checkIn.toLocaleString('default', { month: 'short' });
                            return bookingMonth === month && booking.status === 'confirmed';
                        });
                        return {
                            month,
                            occupancyRate: (monthlyBookings.length / rooms.length) * 100 || 0
                        };
                    });

                    // Calculate booking trends
                    const bookingTrends = new Array(24).fill(0);
                    bookings.forEach(booking => {
                        const hour = booking.checkIn.getHours();
                        bookingTrends[hour]++;
                    });

                    // Calculate satisfaction metrics
                    const satisfactionData = [0, 0, 0, 0]; // Excellent, Good, Average, Poor
                    bookings.forEach(booking => {
                        switch(booking.status) {
                            case 'confirmed': satisfactionData[0]++; break;
                            case 'completed': satisfactionData[1]++; break;
                            case 'pending': satisfactionData[2]++; break;
                            case 'cancelled': satisfactionData[3]++; break;
                        }
                    });

                    // Log processed data for debugging
                    console.log('Processed Data:', {
                        roomTypes: roomTypeData,
                        occupancy: occupancyTrends,
                        bookings: bookingTrends,
                        satisfaction: satisfactionData
                    });

                    // Update analytics state
                    this.analyticsData = {
                        ...this.analyticsData,
                        roomTypes: roomTypeData,
                        occupancyTrend: occupancyTrends,
                        bookingTrends,
                        satisfactionMetrics: satisfactionData,
                        totalRooms: rooms.length,
                        occupiedRooms: rooms.filter(r => r.status === 'Occupied').length,
                        availableRooms: rooms.filter(r => r.status === 'Available').length
                    };

                    // Update charts with validated data
                    const chartData = {
                        roomTypes: roomTypeData,
                        occupancy: occupancyTrends,
                        bookingTrends,
                        satisfaction: satisfactionData
                    };

                    await this.updateAllCharts(chartData);

                    return {
                        rooms,
                        bookings,
                        analytics: chartData
                    };

                } catch (error) {
                    console.error('Error processing data:', error);
                    this.handleError(error, 'data-processing');
                }
            },

            updateAllCharts(data) {
                try {
                    // Validate data first
                    if (!this.validateChartData(data)) {
                        console.error('Invalid chart data:', data);
                        return;
                    }

                    // Update Room Types Chart
                    if (this.charts.roomTypes) {
                        const roomTypeData = {
                            labels: Object.keys(data.roomTypes),
                            datasets: [{
                                data: Object.values(data.roomTypes),
                                backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                            }]
                        };
                        this.charts.roomTypes.data = roomTypeData;
                        this.charts.roomTypes.update('none');
                    }

                    // Update Occupancy Chart
                    if (this.charts.occupancy) {
                        const occupancyData = data.occupancy.map(item => item.occupancyRate);
                        const labels = data.occupancy.map(item => item.month);
                        
                        // Update only the data, not the entire configuration
                        this.charts.occupancy.data.labels = labels;
                        this.charts.occupancy.data.datasets[0].data = occupancyData;
                        this.charts.occupancy.update('none');
                    }

                    // Update Booking Trends Chart
                    if (this.charts.bookingTrends) {
                        this.charts.bookingTrends.data = {
                            labels: this.getHoursOfDay(),
                            datasets: [{
                                label: 'Bookings per Hour',
                                data: data.bookingTrends,
                                borderColor: '#2ecc71',
                                tension: 0.3
                            }]
                        };
                        this.charts.bookingTrends.update('none');
                    }

                    // Update Satisfaction Chart
                    if (this.charts.satisfaction) {
                        this.charts.satisfaction.data = {
                            labels: ['Excellent', 'Good', 'Average', 'Poor'],
                            datasets: [{
                                data: data.satisfaction,
                                backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                            }]
                        };
                        this.charts.satisfaction.update('none');
                    }

                    console.log('All charts updated successfully');
                } catch (error) {
                    console.error('Error updating charts:', error);
                    this.handleError(error, 'chart-update');
                }
            },

            // Update the initialization sequence
            async initializeAnalytics() {
                try {
                    if (!auth.currentUser) {
                        throw new Error('User not authenticated');
                    }

                    // Initialize collections and fetch real data
                    await this.ensureCollectionsExist();
                    await this.fetchAndProcessRoomData();
                    await this.initializeCharts();
                    
                    // Set up automatic updates
                    this.setupRealTimeUpdates();

                    return true;
                } catch (error) {
                    console.error('Error in initializeAnalytics:', error);
                    this.handleError(error, 'analytics-initialization');
                    return false;
                }
            },

            // Update the real-time updates
            setupRealTimeUpdates() {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
                this.updateInterval = setInterval(async () => {
                    await this.fetchAndProcessRoomData();
                }, 300000); // Update every 5 minutes
            },

            async analyzeBookingData() {
                try {
                    const bookingsRef = collection(db, 'bookings');
                    const snapshot = await getDocs(bookingsRef);
                    const bookings = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Process booking data
                    const bookingAnalytics = {
                        totalBookings: bookings.length,
                        statusDistribution: this.calculateBookingStatusDistribution(bookings),
                        averageStayDuration: this.calculateAverageStayDuration(bookings),
                        revenueByMonth: this.calculateRevenueByMonth(bookings),
                        bookingTrends: this.calculateBookingTrends(bookings),
                        popularCheckInDays: this.calculatePopularCheckInDays(bookings),
                        repeatCustomers: this.analyzeRepeatCustomers(bookings)
                    };

                    // Update charts with new booking data
                    this.updateBookingCharts(bookingAnalytics);
                    return bookingAnalytics;
                } catch (error) {
                    console.error('Error analyzing booking data:', error);
                    this.handleError(error, 'booking-analysis');
                }
            },

            calculateBookingStatusDistribution(bookings) {
                return bookings.reduce((acc, booking) => {
                    acc[booking.status] = (acc[booking.status] || 0) + 1;
                    return acc;
                }, {});
            },

            calculateAverageStayDuration(bookings) {
                const durations = bookings.map(booking => {
                    const checkIn = new Date(booking.checkIn?.toDate?.() || booking.checkIn);
                    const checkOut = new Date(booking.checkOut?.toDate?.() || booking.checkOut);
                    return (checkOut - checkIn) / (1000 * 60 * 60 * 24); // Convert to days
                });
                return durations.reduce((acc, curr) => acc + curr, 0) / durations.length;
            },

            calculateRevenueByMonth(bookings) {
                return bookings.reduce((acc, booking) => {
                    const month = new Date(booking.checkIn?.toDate?.() || booking.checkIn)
                        .toLocaleString('default', { month: 'short' });
                    acc[month] = (acc[month] || 0) + (booking.totalAmount || 0);
                    return acc;
                }, {});
            },

            calculateBookingTrends(bookings) {
                const trends = {
                    daily: new Array(24).fill(0),
                    weekly: new Array(7).fill(0),
                    monthly: {}
                };

                bookings.forEach(booking => {
                    const date = new Date(booking.createdAt?.toDate?.() || booking.createdAt);
                    trends.daily[date.getHours()]++;
                    trends.weekly[date.getDay()]++;
                    
                    const month = date.toLocaleString('default', { month: 'short' });
                    trends.monthly[month] = (trends.monthly[month] || 0) + 1;
                });

                return trends;
            },

            calculatePopularCheckInDays(bookings) {
                const dayCount = new Array(7).fill(0);
                bookings.forEach(booking => {
                    const checkIn = new Date(booking.checkIn?.toDate?.() || booking.checkIn);
                    dayCount[checkIn.getDay()]++;
                });
                return dayCount;
            },

            analyzeRepeatCustomers(bookings) {
                const customerBookings = bookings.reduce((acc, booking) => {
                    acc[booking.userId] = (acc[booking.userId] || 0) + 1;
                    return acc;
                }, {});

                return {
                    total: Object.keys(customerBookings).length,
                    repeat: Object.values(customerBookings).filter(count => count > 1).length
                };
            },

            updateBookingCharts(bookingAnalytics) {
                // Update booking trends chart
                if (this.charts.bookingTrends) {
                    const trends = bookingAnalytics.bookingTrends;
                    this.charts.bookingTrends.data.datasets = [{
                        label: 'Hourly Bookings',
                        data: trends.daily,
                        borderColor: '#2ecc71',
                        tension: 0.3
                    }, {
                        label: 'Weekly Trends',
                        data: trends.weekly,
                        borderColor: '#3498db',
                        tension: 0.3
                    }];
                    this.charts.bookingTrends.update();
                }

                // Update revenue chart
                if (this.charts.revenue) {
                    const revenueData = bookingAnalytics.revenueByMonth;
                    this.charts.revenue.data.datasets[0].data = Object.values(revenueData);
                    this.charts.revenue.data.labels = Object.keys(revenueData);
                    this.charts.revenue.update();
                }

                // Update other charts as needed
                this.updateOtherCharts(bookingAnalytics);
            },

            updateOtherCharts(bookingAnalytics) {
                // Update satisfaction chart (if exists)
                if (this.charts.satisfaction) {
                    const statusData = bookingAnalytics.statusDistribution;
                    this.charts.satisfaction.data.datasets[0].data = Object.values(statusData);
                    this.charts.satisfaction.data.labels = Object.keys(statusData);
                    this.charts.satisfaction.update();
                }
            },

            generateBookingAnalysisResponse(analytics) {
                return `Booking Analysis:
                - Total Bookings: ${analytics.totalBookings}
                - Average Stay Duration: ${analytics.averageStayDuration.toFixed(1)} days
                - Most Popular Check-in Day: ${this.getDayName(analytics.popularCheckInDays.indexOf(Math.max(...analytics.popularCheckInDays)))}
                - Booking Status:
                  ${Object.entries(analytics.statusDistribution)
                    .map(([status, count]) => `  • ${status}: ${count}`)
                    .join('\n')}
                - Peak Booking Hours: ${this.findPeakHours(analytics.bookingTrends.daily)}`;
            },

            generateRevenueAnalysisResponse(analytics) {
                const totalRevenue = Object.values(analytics.revenueByMonth).reduce((a, b) => a + b, 0);
                const avgRevenuePerBooking = totalRevenue / analytics.totalBookings;

                return `Revenue Analysis:
                - Total Revenue: $${totalRevenue.toLocaleString()}
                - Average Revenue per Booking: $${avgRevenuePerBooking.toFixed(2)}
                - Monthly Revenue Breakdown:
                  ${Object.entries(analytics.revenueByMonth)
                    .map(([month, revenue]) => `  • ${month}: $${revenue.toLocaleString()}`)
                    .join('\n')}`;
            },

            generateCustomerAnalysisResponse(analytics) {
                return `Customer Analysis:
                - Total Unique Customers: ${analytics.repeatCustomers.total}
                - Repeat Customers: ${analytics.repeatCustomers.repeat}
                - Customer Loyalty Rate: ${((analytics.repeatCustomers.repeat / analytics.repeatCustomers.total) * 100).toFixed(1)}%`;
            },

            getDayName(index) {
                return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
            },

            findPeakHours(hourlyData) {
                const peakHours = hourlyData
                    .map((count, hour) => ({ hour, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map(({ hour }) => `${hour}:00`);
                return peakHours.join(', ');
            },

            // Add this helper method to normalize room types
            normalizeRoomType(type) {
                if (!type) return 'Standard';
                
                // Convert to string and normalize
                const normalizedInput = String(type).trim().toLowerCase();
                
                // Mapping of variations to standard types
                const typeMap = {
                    'standard': 'Standard',
                    'std': 'Standard',
                    'deluxe': 'Deluxe',
                    'dlx': 'Deluxe',
                    'suite': 'Suite',
                    'ste': 'Suite',
                    'family': 'Family',
                    'fam': 'Family',
                    'standard room': 'Standard',
                    'deluxe room': 'Deluxe',
                    'suite room': 'Suite',
                    'family room': 'Family'
                };

                return typeMap[normalizedInput] || 'Standard';
            },

            // Update the chart creation method
            createRoomTypesChart() {
                // Debug: Log chart creation
                console.log('Creating room types chart');
                
                return {
                    type: 'pie',
                    data: {
                        labels: ['Standard', 'Deluxe', 'Suite', 'Family'],
                        datasets: [{
                            data: [0, 0, 0, 0], // Initialize with zeros
                            backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            title: {
                                display: true,
                                text: 'Room Type Distribution'
                            }
                        }
                    }
                };
            },

            // Update the chart update method
            updateRoomCharts() {
                if (this.charts.roomTypes && this.roomAnalytics.roomTypes) {
                    const roomTypeData = {
                        labels: Object.keys(this.roomAnalytics.roomTypes),
                        datasets: [{
                            data: Object.values(this.roomAnalytics.roomTypes),
                            backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                        }]
                    };

                    console.log('Updating room types chart with data:', roomTypeData);
                    this.charts.roomTypes.data = roomTypeData;
                    this.charts.roomTypes.update();
                }
            },

            // Add these helper methods
            calculateBookingTrendsFromData(bookings) {
                const hourlyBookings = new Array(24).fill(0);
                bookings.forEach(doc => {
                    const booking = doc.data();
                    if (booking.createdAt) {
                        const date = booking.createdAt?.toDate?.() || new Date(booking.createdAt);
                        const hour = date.getHours();
                        hourlyBookings[hour]++;
                    }
                });
                return hourlyBookings;
            },

            calculateSatisfactionFromBookings(bookings) {
                const satisfactionData = [0, 0, 0, 0]; // [Excellent, Good, Average, Poor]
                bookings.forEach(doc => {
                    const booking = doc.data();
                    switch(booking.status) {
                        case 'confirmed':
                            satisfactionData[0]++;
                            break;
                        case 'completed':
                            satisfactionData[1]++;
                            break;
                        case 'pending':
                            satisfactionData[2]++;
                            break;
                        case 'cancelled':
                            satisfactionData[3]++;
                            break;
                    }
                });
                return satisfactionData;
            },

            // Add data validation method
            validateChartData(data) {
                if (!data || typeof data !== 'object') return false;
                
                const requiredKeys = ['roomTypes', 'occupancy', 'bookingTrends', 'satisfaction'];
                if (!requiredKeys.every(key => key in data)) return false;
                
                if (!Array.isArray(data.occupancy) || !data.occupancy.every(item => 'month' in item && 'occupancyRate' in item)) {
                    return false;
                }
                
                return true;
            },

            async fetchRoomTypeDistribution() {
                try {
                    const roomsRef = collection(db, 'rooms');
                    const snapshot = await getDocs(roomsRef);
                    
                    const distribution = {
                        'Standard': 0,
                        'Deluxe': 0,
                        'Suite': 0,
                        'Family': 0
                    };
            
                    snapshot.docs.forEach(doc => {
                        const roomData = doc.data();
                        const type = this.normalizeRoomType(roomData.type || roomData.propertyDetails?.roomType);
                        if (distribution.hasOwnProperty(type)) {
                            distribution[type]++;
                        }
                    });
            
                    // Check if chart exists and is valid
                    if (this.charts.roomTypes && typeof this.charts.roomTypes.update === 'function') {
                        this.charts.roomTypes.data.datasets[0].data = Object.values(distribution);
                        this.charts.roomTypes.update();
                    } else {
                        console.warn('Room types chart not properly initialized');
                        this.error = 'Chart initialization error';
                    }
            
                    return distribution;
                } catch (error) {
                    console.error('Error fetching room type distribution:', error);
                    this.error = 'Failed to fetch room type data';
                    return null;
                }
            },

            processOccupancy(bookings) {
                const months = this.getLast12Months();
                const occupancyData = months.map(month => {
                    const monthlyBookings = bookings.filter(booking => {
                        const bookingMonth = new Date(booking.checkIn).toLocaleString('default', { month: 'short' });
                        return bookingMonth === month;
                    });
                    return {
                        month,
                        rate: (monthlyBookings.length > 0) ? 
                            (monthlyBookings.filter(b => b.status === 'confirmed').length / monthlyBookings.length) * 100 : 0
                    };
                });
                return occupancyData;
            },

            processBookings(bookings) {
                const hourlyDistribution = new Array(24).fill(0);
                bookings.forEach(booking => {
                    const hour = new Date(booking.checkIn).getHours();
                    hourlyDistribution[hour]++;
                });
                return hourlyDistribution;
            },

            processSatisfaction(bookings) {
                const ratings = [0, 0, 0, 0]; // [Excellent, Good, Average, Poor]
                bookings.forEach(booking => {
                    if (!booking.rating) return;
                    if (booking.rating >= 4.5) ratings[0]++;
                    else if (booking.rating >= 3.5) ratings[1]++;
                    else if (booking.rating >= 2.5) ratings[2]++;
                    else ratings[3]++;
                });
                return ratings;
            },

            async fetchInitialData() {
                try {
                    console.log('Fetching initial data...');
                    const [rooms, bookings] = await Promise.all([
                        this.fetchRoomData(),
                        this.fetchBookingData()
                    ]);

                    if (!rooms || !bookings) {
                        throw new Error('Failed to fetch rooms or bookings data');
                    }

                    console.log('Processing data...');
                    const processedData = {
                        roomTypes: this.processRoomTypes(rooms),
                        occupancy: this.processOccupancy(bookings),
                        bookings: this.processBookings(bookings),
                        satisfaction: this.processSatisfaction(bookings)
                    };

                    console.log('Processed data:', processedData);
                    return processedData;
                } catch (error) {
                    console.error('Error in fetchInitialData:', error);
                    return null;
                }
            },

            async initializeCharts(data) {
                try {
                    console.log('Initializing charts with data:', data);
                    
                    // Default data structure if data is missing or invalid
                    const defaultData = {
                        roomTypes: {
                            Standard: 0,
                            Deluxe: 0,
                            Suite: 0,
                            Family: 0
                        },
                        occupancy: Array(12).fill().map(() => ({ 
                            month: '', 
                            rate: 0 
                        })),
                        bookings: Array(24).fill(0),
                        satisfaction: [0, 0, 0, 0]
                    };

                    // Merge provided data with defaults
                    const chartData = {
                        roomTypes: data?.roomTypes || defaultData.roomTypes,
                        occupancy: data?.occupancy || defaultData.occupancy,
                        bookings: data?.bookings || defaultData.bookings,
                        satisfaction: data?.satisfaction || defaultData.satisfaction
                    };

                    // Initialize room types chart
                    const roomTypesCtx = document.getElementById('roomTypesChart')?.getContext('2d');
                    if (roomTypesCtx && !this.charts.roomTypes) {
                        this.charts.roomTypes = new Chart(roomTypesCtx, {
                            type: 'doughnut',
                            data: {
                                labels: Object.keys(chartData.roomTypes),
                                datasets: [{
                                    data: Object.values(chartData.roomTypes),
                                    backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'right',
                                        labels: {
                                            padding: 20,
                                            font: {
                                                size: 12
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // Initialize other charts with similar protection
                    const occupancyCtx = document.getElementById('occupancyChart')?.getContext('2d');
                    if (occupancyCtx && !this.charts.occupancy) {
                        this.charts.occupancy = new Chart(occupancyCtx, {
                            type: 'line',
                            data: {
                                labels: this.getLast12Months(),
                                datasets: [{
                                    label: 'Occupancy Rate (%)',
                                    data: chartData.occupancy.map(d => d.rate),
                                    borderColor: '#1e3c72',
                                    fill: true,
                                    backgroundColor: 'rgba(30, 60, 114, 0.1)'
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        max: 100
                                    }
                                }
                            }
                        });
                    }

                    // Initialize booking trends chart
                    const bookingTrendsCtx = document.getElementById('bookingTrendsChart')?.getContext('2d');
                    if (bookingTrendsCtx && !this.charts.bookingTrends) {
                        this.charts.bookingTrends = new Chart(bookingTrendsCtx, {
                            type: 'bar',
                            data: {
                                labels: this.getHoursOfDay(),
                                datasets: [{
                                    label: 'Bookings',
                                    data: chartData.bookings,
                                    backgroundColor: '#4CAF50'
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                }
                            }
                        });
                    }

                    // Initialize satisfaction chart
                    const satisfactionCtx = document.getElementById('customerSatisfactionChart')?.getContext('2d');
                    if (satisfactionCtx && !this.charts.satisfaction) {
                        this.charts.satisfaction = new Chart(satisfactionCtx, {
                            type: 'doughnut',
                            data: {
                                labels: ['Excellent', 'Good', 'Average', 'Poor'],
                                datasets: [{
                                    data: chartData.satisfaction,
                                    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#F44336']
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
                    }

                    console.log('Charts initialized successfully');
                    return true;
                } catch (error) {
                    console.error('Error initializing charts:', error);
                    this.error = 'Failed to initialize charts';
                    return false;
                }
            },

            async initializeChartsWithSampleData() {
                const sampleData = {
                    roomTypes: {
                        Standard: 10,
                        Deluxe: 8,
                        Suite: 6,
                        Family: 4
                    },
                    occupancy: Array.from({length: 12}, () => ({
                        month: 'Jan',
                        occupancyRate: Math.floor(Math.random() * 100)
                    })),
                    bookingTrends: Array.from({length: 24}, () => Math.floor(Math.random() * 20)),
                    satisfaction: [30, 45, 15, 10]
                };

                // Initialize room types chart
                const roomTypesCtx = document.getElementById('roomTypesChart');
                if (roomTypesCtx) {
                    this.charts.roomTypes = new Chart(roomTypesCtx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(sampleData.roomTypes),
                            datasets: [{
                                data: Object.values(sampleData.roomTypes),
                                backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false
                        }
                    });
                }

                // Initialize occupancy chart
                const occupancyCtx = document.getElementById('occupancyChart');
                if (occupancyCtx) {
                    this.charts.occupancy = new Chart(occupancyCtx, {
                        type: 'line',
                        data: {
                            labels: this.getLast12Months(),
                            datasets: [{
                                label: 'Occupancy Rate (%)',
                                data: sampleData.occupancy.map(d => d.occupancyRate),
                                borderColor: '#1e3c72',
                                fill: true,
                                backgroundColor: 'rgba(30, 60, 114, 0.1)'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: 100
                                }
                            }
                        }
                    });
                }

                // Initialize other charts similarly...
                // Add similar initialization for bookingTrends and satisfaction charts
            },

            calculateOccupancyStats(rooms, bookings) {
                const occupied = rooms.filter(r => r.status === 'Occupied').length;
                const total = rooms.length;
                const rate = (occupied / total) * 100;

                // Calculate monthly occupancy
                const monthlyOccupancy = this.getLast12Months().map(month => {
                    const monthlyBookings = bookings.filter(b => {
                        const bookingMonth = new Date(b.checkIn).toLocaleString('default', { month: 'short' });
                        return bookingMonth === month;
                    }).length;
                    return { month, count: monthlyBookings };
                });

                const peakMonth = monthlyOccupancy.reduce((a, b) => a.count > b.count ? a : b).month;

                // Calculate average stay duration
                const avgStayDuration = bookings.reduce((acc, booking) => {
                    const checkIn = new Date(booking.checkIn);
                    const checkOut = new Date(booking.checkOut);
                    return acc + (checkOut - checkIn) / (1000 * 60 * 60 * 24);
                }, 0) / bookings.length;

                return {
                    rate,
                    occupied,
                    available: total - occupied,
                    peakMonth,
                    avgStayDuration
                };
            },

            calculateRevenueStats(revenue, bookings) {
                const total = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
                const avgPerBooking = total / bookings.length;

                // Calculate monthly revenue
                const monthlyRevenue = {};
                revenue.forEach(r => {
                    const month = new Date(r.date).toLocaleString('default', { month: 'short' });
                    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + r.amount;
                });

                const bestMonth = Object.entries(monthlyRevenue)
                    .reduce((a, b) => a[1] > b[1] ? a : b)[0];

                // Calculate trend
                const trend = this.calculateRevenueTrend(monthlyRevenue);

                // Calculate YoY growth
                const yoyGrowth = this.calculateYearOverYearGrowth().revenue;

                return {
                    total,
                    avgPerBooking,
                    bestMonth,
                    trend,
                    yoyGrowth
                };
            },

            calculateBookingStats(bookings) {
                const total = bookings.length;
                const active = bookings.filter(b => b.status === 'confirmed').length;

                // Calculate peak booking hours
                const hourlyBookings = Array(24).fill(0);
                bookings.forEach(booking => {
                    const hour = new Date(booking.createdAt).getHours();
                    hourlyBookings[hour]++;
                });

                const peakHours = hourlyBookings
                    .map((count, hour) => ({ hour, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map(({ hour }) => `${hour}:00`);

                // Calculate most popular room type
                const roomTypes = bookings.reduce((acc, booking) => {
                    const type = booking.propertyDetails?.roomType || 'Standard';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {});

                const popularRoomType = Object.entries(roomTypes)
                    .reduce((a, b) => a[1] > b[1] ? a : b)[0];

                // Calculate average booking value
                const avgValue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / total;

                return {
                    total,
                    active,
                    peakHours,
                    popularRoomType,
                    avgValue
                };
            },

            async generatePerformanceReport(rooms, bookings, revenue) {
                const occupancyStats = this.calculateOccupancyStats(rooms, bookings);
                const revenueStats = this.calculateRevenueStats(revenue, bookings);
                const bookingStats = this.calculateBookingStats(bookings);

                return `Comprehensive Performance Report:\n\n` +
                       `Occupancy Metrics:\n` +
                       `- Current Occupancy Rate: ${occupancyStats.rate.toFixed(1)}%\n` +
                       `- Peak Occupancy Month: ${occupancyStats.peakMonth}\n\n` +
                       `Revenue Metrics:\n` +
                       `- Total Revenue: $${revenueStats.total.toLocaleString()}\n` +
                       `- Growth Rate: ${revenueStats.yoyGrowth.toFixed(1)}%\n\n` +
                       `Booking Performance:\n` +
                       `- Total Bookings: ${bookingStats.total}\n` +
                       `- Active Bookings: ${bookingStats.active}\n` +
                       `- Most Popular Room: ${bookingStats.popularRoomType}\n\n` +
                       `Key Insights:\n` +
                       `- ${this.generateInsights(occupancyStats, revenueStats, bookingStats)}`;
            },

            generateInsights(occupancy, revenue, bookings) {
                const insights = [];

                if (occupancy.rate < 50) {
                    insights.push("Occupancy is below target. Consider promotional campaigns.");
                } else if (occupancy.rate > 80) {
                    insights.push("High occupancy presents opportunity for rate optimization.");
                }

                if (revenue.yoyGrowth > 10) {
                    insights.push("Strong revenue growth indicates successful pricing strategy.");
                } else if (revenue.yoyGrowth < 0) {
                    insights.push("Revenue decline suggests need for market repositioning.");
                }

                if (bookings.active / bookings.total < 0.5) {
                    insights.push("Low booking conversion rate. Review cancellation policies.");
                }

                return insights.join('\n- ');
            },

            async fetchRevenueData() {
                const revenueRef = collection(db, 'revenue');
                const snapshot = await getDocs(revenueRef);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            },

            toggleChart(chartName) {
                this.chartVisibility[chartName] = !this.chartVisibility[chartName];
                
                // Re-render chart when showing to ensure proper sizing
                if (this.chartVisibility[chartName] && this.charts[chartName]) {
                    this.$nextTick(() => {
                        this.charts[chartName].resize();
                        this.charts[chartName].update();
                    });
                }
            },

            // Add new method to toggle all charts
            toggleAllCharts(show = true) {
                Object.keys(this.chartVisibility).forEach(chartName => {
                    this.chartVisibility[chartName] = show;
                    if (show && this.charts[chartName]) {
                        this.$nextTick(() => {
                            this.charts[chartName].resize();
                            this.charts[chartName].update();
                        });
                    }
                });
            },

            addTypingIndicator() {
                const chatContainer = document.getElementById('chatContainer');
                const typingDiv = document.createElement('div');
                typingDiv.className = 'message bot typing-indicator';
                typingDiv.innerHTML = `
                    <div class="message-avatar bot">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="typing-dots">
                            <span>.</span><span>.</span><span>.</span>
                        </div>
                    </div>
                `;
                chatContainer.appendChild(typingDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            },

            removeTypingIndicator() {
                const typingIndicator = document.querySelector('.typing-indicator');
                if (typingIndicator) {
                    typingIndicator.remove();
                }
            },

            addSuggestions(response) {
                const suggestions = new SuggestionService().getSuggestionsByResponse(response);
                const suggestionDiv = document.createElement('div');
                suggestionDiv.className = 'message-suggestions';
                suggestionDiv.innerHTML = `
                    <div class="chat-suggestions">
                        ${suggestions.map(s => `
                            <div class="suggestion-chip" onclick="app.submitSuggestion('${s.text}')">
                                ${s.text}
                            </div>
                        `).join('')}
                    </div>
                `;
                document.getElementById('chatContainer').appendChild(suggestionDiv);
            },
        }
    });
});

// Add error handling for script loading
window.addEventListener('error', (event) => {
    console.error('Script error:', event.error);
});