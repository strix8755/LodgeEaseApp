import { auth, db } from '../firebase.js';
// Remove chart-related imports

new Vue({
    el: '#app',
    data: {
        // Keep only chat-related data
        isAuthenticated: false,
        loading: false,
        currentMessage: '',
        messages: [],
        suggestions: [
            { label: 'Occupancy Analysis', text: 'Show me detailed occupancy trends for the last 6 months' },
            { label: 'Revenue Analysis', text: 'What is our revenue performance compared to last year?' },
            { label: 'Booking Patterns', text: 'Show booking patterns and peak hours' },
            { label: 'Performance Report', text: 'Give me a full business performance report' },
            { label: 'Customer Satisfaction', text: 'What are the current customer satisfaction metrics?' }
        ]
    },
    methods: {
        // Keep only chat-related methods
        // Remove all chart and visualization methods
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

        async fetchRevenueData() {
            const revenueRef = collection(db, 'revenue');
            const snapshot = await getDocs(revenueRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
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
    },
    async mounted() {
        await this.checkAuthState();
    }
});