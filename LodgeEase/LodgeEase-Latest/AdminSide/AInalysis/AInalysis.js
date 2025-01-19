// Add Vue production config
Vue.config.productionTip = false;

import { 
    auth, 
    db, 
    getCurrentUser, 
    checkAuth, 
    initializeFirebase,
    fetchAnalyticsData,
    logPageNavigation,
    // Add Firestore method imports
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    doc,
    getDoc
} from '../firebase.js';
import { SuggestionService } from './suggestionService.js';

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
        ],
        messageCache: new Map(),
        errorRetryCount: 0,
        maxRetries: 3,
        firebaseInitialized: false,
        connectionError: null,
        analyticsData: {
            occupancyRate: 0,
            revenue: 0,
            bookings: 0,
            satisfaction: 0
        },
        integratedData: {
            rooms: [],
            bookings: [],
            revenue: [],
            customers: [],
            activities: []
        }
    },
    methods: {
        // Add this new method
        addMessage(text, type = 'bot') {
            const message = {
                id: Date.now(),
                text: text,
                type: type,
                timestamp: new Date()
            };
            
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.innerHTML = `
                <div class="message-avatar ${type}">
                    <i class="fas ${type === 'bot' ? 'fa-robot' : 'fa-user'}"></i>
                </div>
                <div class="message-content">
                    ${text}
                </div>
            `;
            
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            this.messages.push(message);
        },

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

        async initializeApp() {
            try {
                this.loading = true;
                // Initialize Firebase
                const initialized = await initializeFirebase();
                if (!initialized) {
                    throw new Error('Failed to initialize Firebase');
                }
                this.firebaseInitialized = true;

                // Check authentication
                const user = await getCurrentUser();
                if (!user) {
                    window.location.href = '../Login/index.html';
                    return;
                }

                this.isAuthenticated = true;
                await logPageNavigation(user.uid, 'AI Analysis');

                // Start new chat after successful initialization
                this.startNewChat();
            } catch (error) {
                console.error('Initialization error:', error);
                this.connectionError = error.message;
            } finally {
                this.loading = false;
            }
        },

        async processQuery(message) {
            try {
                console.log('Processing query:', message);
                // Get fresh data directly from Firestore
                const data = await this.fetchIntegratedData();
                
                if (!data || data.status === 'error') {
                    console.warn('No data found:', data);
                    throw new Error('Failed to fetch current data');
                }

                console.log('Retrieved data:', { 
                    roomCount: data.rooms.length, 
                    bookingCount: data.bookings.length 
                });

                const lowerMessage = message.toLowerCase();
                let response = '';

                // Process based on query type
                if (lowerMessage.includes('occupancy') || lowerMessage.includes('occupied')) {
                    const stats = await this.calculateCurrentOccupancy(data.rooms, data.bookings);
                    console.log('Occupancy stats:', stats);
                    response = `Current Occupancy Analysis (Based on Firestore Data):\n` +
                              `- Overall Occupancy Rate: ${stats.rate}%\n` +
                              `- Currently Occupied Rooms: ${stats.occupied}\n` +
                              `- Available Rooms: ${stats.available}\n` +
                              `- Under Maintenance: ${stats.maintenance}\n` +
                              `- Most Popular Room Type: ${stats.popularType}\n` +
                              `- Average Stay Duration: ${stats.avgStayDuration} days`;
                              
                } else if (lowerMessage.includes('revenue') || lowerMessage.includes('income')) {
                    const revenueStats = await this.calculateCurrentRevenue(data.revenue, data.bookings);
                    response = `Revenue Analysis (Current Period):\n` +
                              `- Total Revenue: $${revenueStats.total.toLocaleString()}\n` +
                              `- Revenue This Month: $${revenueStats.currentMonth.toLocaleString()}\n` +
                              `- Average Daily Revenue: $${revenueStats.dailyAverage.toFixed(2)}\n` +
                              `- Revenue per Room: $${revenueStats.perRoom.toFixed(2)}\n` +
                              `- Growth Rate: ${revenueStats.growthRate > 0 ? '+' : ''}${revenueStats.growthRate.toFixed(1)}%`;

                } else if (lowerMessage.includes('booking') || lowerMessage.includes('reservation')) {
                    const bookingStats = await this.calculateCurrentBookings(data.bookings);
                    response = `Current Booking Analysis:\n` +
                              `- Total Active Bookings: ${bookingStats.active}\n` +
                              `- Pending Bookings: ${bookingStats.pending}\n` +
                              `- Today's Check-ins: ${bookingStats.todayCheckins}\n` +
                              `- Today's Check-outs: ${bookingStats.todayCheckouts}\n` +
                              `- Peak Booking Time: ${bookingStats.peakHours.join(', ')}\n` +
                              `- Most Requested Room: ${bookingStats.popularRoom}`;

                } else if (lowerMessage.includes('performance') || lowerMessage.includes('report')) {
                    response = await this.generateLivePerformanceReport(data);
                } else {
                    response = this.generateDefaultResponse(data);
                }

                console.log('Generated response:', response);
                return response;
            } catch (error) {
                console.error('Error processing query:', error);
                return "I apologize, but I'm having trouble accessing the latest data. Please try again in a moment.";
            }
        },

        async calculateCurrentOccupancy(rooms, bookings) {
            console.log('Calculating current occupancy with:', { rooms, bookings });
            const now = new Date();

            // Get active bookings
            const activeBookings = bookings.filter(booking => {
                const checkIn = new Date(booking.checkIn);
                const checkOut = new Date(booking.checkOut);
                return booking.status === 'confirmed' && checkIn <= now && checkOut >= now;
            });

            // Count room statuses
            const roomStatuses = {
                occupied: rooms.filter(r => r.status === 'occupied').length,
                available: rooms.filter(r => r.status === 'available').length,
                maintenance: rooms.filter(r => r.status === 'maintenance').length
            };

            // Count room types
            const roomTypes = rooms.reduce((acc, room) => {
                const type = room.type || 'Standard';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            // Calculate average stay duration for active bookings
            const avgStayDuration = activeBookings.reduce((sum, booking) => {
                const checkIn = new Date(booking.checkIn);
                const checkOut = new Date(booking.checkOut);
                return sum + (checkOut - checkIn) / (1000 * 60 * 60 * 24);
            }, 0) / (activeBookings.length || 1);

            const totalRooms = rooms.length || 1;
            const occupancyRate = (roomStatuses.occupied / totalRooms) * 100;

            console.log('Occupancy calculation result:', {
                roomStatuses,
                roomTypes,
                occupancyRate,
                avgStayDuration
            });

            return {
                rate: Number(occupancyRate.toFixed(1)),
                occupied: roomStatuses.occupied,
                available: roomStatuses.available,
                maintenance: roomStatuses.maintenance,
                popularType: Object.entries(roomTypes)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Standard',
                avgStayDuration: Number(avgStayDuration.toFixed(1))
            };
        },

        async calculateCurrentRevenue(revenue, bookings) {
            try {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Get confirmed bookings with case-insensitive status check
                const confirmedBookings = bookings.filter(b => 
                    b.status?.toLowerCase() === 'confirmed'
                );

                // Get current month's bookings
                const currentMonthBookings = confirmedBookings.filter(booking => {
                    const bookingDate = new Date(booking.checkIn);
                    return bookingDate.getMonth() === currentMonth && 
                           bookingDate.getFullYear() === currentYear;
                });

                // Get last month's bookings with proper date comparison
                const lastMonthBookings = confirmedBookings.filter(booking => {
                    const bookingDate = new Date(booking.checkIn);
                    const isLastMonth = bookingDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1);
                    const isLastYear = currentMonth === 0 ? 
                        bookingDate.getFullYear() === currentYear - 1 : 
                        bookingDate.getFullYear() === currentYear;
                    return isLastMonth && isLastYear;
                });

                // Calculate revenues
                const currentMonthRevenue = currentMonthBookings.reduce((sum, booking) => 
                    sum + (booking.totalPrice || 0), 0);

                const lastMonthRevenue = lastMonthBookings.reduce((sum, booking) => 
                    sum + (booking.totalPrice || 0), 0);

                // Calculate total revenue from all confirmed bookings
                const totalRevenue = confirmedBookings.reduce((sum, booking) => 
                    sum + (booking.totalPrice || 0), 0);

                // Calculate growth rate with proper validation
                const growthRate = lastMonthRevenue > 0 ? 
                    ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 
                    currentMonthRevenue > 0 ? 100 : 0;

                // Log calculations for debugging
                console.log('Revenue calculations:', {
                    totalRevenue,
                    currentMonthRevenue,
                    lastMonthRevenue,
                    currentMonthBookings: currentMonthBookings.length,
                    lastMonthBookings: lastMonthBookings.length,
                    growthRate
                });

                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                
                return {
                    total: totalRevenue,
                    currentMonth: currentMonthRevenue,
                    dailyAverage: currentMonthRevenue / daysInMonth,
                    perRoom: currentMonthRevenue / (confirmedBookings.length || 1),
                    growthRate
                };
            } catch (error) {
                console.error('Error calculating revenue:', error);
                throw error;
            }
        },

        async calculateCurrentBookings(bookings) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const activeBookings = bookings.filter(b => b.status === 'confirmed');
            const pendingBookings = bookings.filter(b => b.status === 'pending');

            const todayCheckins = bookings.filter(booking => {
                const checkIn = new Date(booking.checkIn?.toDate?.() || booking.checkIn);
                return checkIn >= today && checkIn < tomorrow;
            });

            const todayCheckouts = bookings.filter(booking => {
                const checkOut = new Date(booking.checkOut?.toDate?.() || booking.checkOut);
                return checkOut >= today && checkOut < tomorrow;
            });

            const bookingHours = bookings.reduce((acc, booking) => {
                const hour = new Date(booking.createdAt?.toDate?.() || booking.createdAt).getHours();
                acc[hour] = (acc[hour] || 0) + 1;
                return acc;
            }, {});

            const peakHours = Object.entries(bookingHours)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([hour]) => `${hour}:00`);

            return {
                active: activeBookings.length,
                pending: pendingBookings.length,
                todayCheckins: todayCheckins.length,
                todayCheckouts: todayCheckouts.length,
                peakHours,
                popularRoom: this.findPopularRoom(bookings)
            };
        },

        async generateLivePerformanceReport(data) {
            const occupancy = await this.calculateCurrentOccupancy(data.rooms, data.bookings);
            const revenue = await this.calculateCurrentRevenue(data.revenue, data.bookings);
            const bookings = await this.calculateCurrentBookings(data.bookings);

            return `Live Performance Report (${new Date().toLocaleDateString()}):

Occupancy Status:
- Current Occupancy Rate: ${occupancy.rate.toFixed(1)}%
- Occupied Rooms: ${occupancy.occupied}
- Available Rooms: ${occupancy.available}
- Under Maintenance: ${occupancy.maintenance}

Revenue Metrics:
- Monthly Revenue: $${revenue.currentMonth.toLocaleString()}
- Daily Average: $${revenue.dailyAverage.toFixed(2)}
- Growth Rate: ${revenue.growthRate > 0 ? '+' : ''}${revenue.growthRate.toFixed(1)}%

Current Bookings:
- Active Bookings: ${bookings.active}
- Pending Confirmations: ${bookings.pending}
- Today's Check-ins: ${bookings.todayCheckins}
- Today's Check-outs: ${bookings.todayCheckouts}

Popular Times:
- Peak Booking Hours: ${bookings.peakHours.join(', ')}
- Most Booked Room Type: ${occupancy.popularType}`;
        },

        generateDefaultResponse(data) {
            const activeBookings = data.bookings.filter(b => b.status === 'confirmed').length;
            const availableRooms = data.rooms.filter(r => r.status === 'available').length;
            
            return `Current Hotel Status:\n` +
                   `- Available Rooms: ${availableRooms}\n` +
                   `- Active Bookings: ${activeBookings}\n` +
                   `- Today's Operations are Normal\n\n` +
                   `I can help you analyze:\n` +
                   `- Current occupancy and room availability\n` +
                   `- Today's revenue and financial metrics\n` +
                   `- Active bookings and check-ins/outs\n` +
                   `- Overall performance metrics\n\n` +
                   `What would you like to know about?`;
        },

        findPopularRoom(bookings) {
            const roomCounts = bookings.reduce((acc, booking) => {
                const roomType = booking.propertyDetails?.roomType || 'Standard';
                acc[roomType] = (acc[roomType] || 0) + 1;
                return acc;
            }, {});

            return Object.entries(roomCounts)
                .sort((a, b) => b[1] - a[1])[0][0];
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
                const cacheKey = this.currentMessage.trim();
                if (this.messageCache.has(cacheKey)) {
                    this.addMessage(this.messageCache.get(cacheKey), 'bot');
                    return;
                }

                // Add user message
                this.addMessage(message, 'user');
                
                // Clear input
                this.currentMessage = '';

                // Show typing indicator
                this.addTypingIndicator();

                // Process the query and get response
                const response = await this.processQuery(message);

                // Cache successful responses
                this.messageCache.set(cacheKey, response);
                
                // Clear old cache entries if cache gets too large
                if (this.messageCache.size > 100) {
                    const firstKey = this.messageCache.keys().next().value;
                    this.messageCache.delete(firstKey);
                }

                // Remove typing indicator and add bot response
                this.removeTypingIndicator();
                this.addMessage(response, 'bot');

                // Add follow-up suggestions based on the response
                this.addSuggestions(response);
            } catch (error) {
                this.handleError(error);
            }
        },

        handleError(error) {
            console.error('Error:', error);
            if (this.errorRetryCount < this.maxRetries) {
                this.errorRetryCount++;
                setTimeout(() => this.sendMessage(), 1000 * this.errorRetryCount);
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again later.', 'bot');
                this.errorRetryCount = 0;
            }
        },

        sanitizeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        submitSuggestion(suggestion) {
            // Sanitize the suggestion text
            const sanitizedSuggestion = this.sanitizeHtml(suggestion);
            // Set the message
            this.currentMessage = sanitizedSuggestion;
            // Send the message
            this.sendMessage();
        },

        startNewChat() {
            const chatContainer = document.getElementById('chatContainer');
            chatContainer.innerHTML = '';
            
            // Add welcome message
            this.addMessage(`Welcome to Lodge Ease AI Assistant! I can help you analyze:
- Occupancy trends and room statistics
- Revenue and financial performance
- Booking patterns and guest preferences
- Overall business performance

How can I assist you today?`, 'bot');

            // Add initial suggestions with proper event handling
            const initialSuggestions = [
                'Show me our current occupancy rate',
                'What is our revenue performance this month?',
                'Show me peak booking hours',
                'Give me a full business performance report',
                'What is our customer satisfaction rate?'
            ];

            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'message-suggestions';
            suggestionDiv.innerHTML = `
                <div class="chat-suggestions">
                    ${initialSuggestions.map(text => {
                        const sanitizedText = this.sanitizeHtml(text);
                        return `
                            <div class="suggestion-chip" 
                                 data-suggestion="${sanitizedText}"
                                 role="button"
                                 tabindex="0">
                                ${sanitizedText}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Add click event listeners to suggestions
            suggestionDiv.addEventListener('click', (e) => {
                const chip = e.target.closest('.suggestion-chip');
                if (chip) {
                    const suggestion = chip.dataset.suggestion;
                    this.submitSuggestion(suggestion);
                }
            });

            chatContainer.appendChild(suggestionDiv);
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

        async fetchRoomData() {
            try {
                console.log('Fetching room data...');
                const roomsRef = collection(db, 'rooms');
                const snapshot = await getDocs(roomsRef);
                const rooms = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        roomNumber: data.propertyDetails?.roomNumber || data.roomNumber,
                        type: this.normalizeRoomType(data.propertyDetails?.roomType || data.roomType),
                        status: (data.status || 'Available').toLowerCase(),
                        price: data.price || 0,
                        establishment: data.establishment,
                        propertyDetails: data.propertyDetails || {}
                    };
                });
                console.log('Fetched rooms:', rooms);
                return rooms;
            } catch (error) {
                console.error('Error fetching room data:', error);
                throw error;
            }
        },

        async fetchBookingData() {
            try {
                console.log('Fetching booking data...');
                const bookingsRef = collection(db, 'bookings');
                const snapshot = await getDocs(bookingsRef);
                const bookings = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        checkIn: data.checkIn?.toDate?.() || new Date(data.checkIn),
                        checkOut: data.checkOut?.toDate?.() || new Date(data.checkOut),
                        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                        status: data.status || 'Pending',
                        propertyDetails: data.propertyDetails || {},
                        totalPrice: data.totalPrice || 0,
                        nightlyRate: data.nightlyRate || 0,
                        numberOfNights: data.numberOfNights || 0,
                        guestName: data.guestName,
                        bookingType: data.bookingType,
                        paymentStatus: data.paymentStatus,
                        establishment: data.establishment
                    };
                });
                console.log('Fetched bookings:', bookings);
                return bookings;
            } catch (error) {
                console.error('Error fetching booking data:', error);
                throw error;
            }
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
                return this.integratedData;
            }
            try {
                // Fetch data from different collections
                const [rooms, bookings, revenue, customers, activities] = await Promise.all([
                    this.fetchRoomData(),
                    this.fetchBookingData(),
                    this.fetchRevenueData(),
                    this.fetchCustomerData(),
                    this.fetchActivityData()
                ]);

                const integratedData = {
                    rooms: rooms || [],
                    bookings: bookings || [],
                    revenue: revenue || [],
                    customers: customers || [],
                    activities: activities || [],
                    status: 'success'
                };

                // Cache the data
                this.integratedData = integratedData;
                return integratedData;
            } catch (error) {
                console.error('Error fetching integrated data:', error);
                return {
                    rooms: [],
                    bookings: [],
                    revenue: [],
                    customers: [],
                    activities: [],
                    status: 'error',
                    error: error.message
                };
            }
        },

        async fetchCustomerData() {
            try {
                const customersRef = collection(db, 'customers');
                const snapshot = await getDocs(customersRef);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error fetching customer data:', error);
                return [];
            }
        },

        async fetchActivityData() {
            try {
                const activitiesRef = collection(db, 'activityLogs');
                const snapshot = await getDocs(activitiesRef);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error fetching activity data:', error);
                return [];
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
            try {
                const {
                    total = 0,
                    currentMonth = 0,
                    dailyAverage = 0,
                    perRoom = 0,
                    growthRate = 0
                } = analytics;

                return `Revenue Analysis (Current Period):\n` +
                       `- Total Revenue: $${total.toLocaleString()}\n` +
                       `- Revenue This Month: $${currentMonth.toLocaleString()}\n` +
                       `- Average Daily Revenue: $${dailyAverage.toFixed(2)}\n` +
                       `- Revenue per Room: $${perRoom.toFixed(2)}\n` +
                       `- Month-over-Month Growth: ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`;
            } catch (error) {
                console.error('Error generating revenue response:', error);
                return "I apologize, but I'm having trouble analyzing the revenue data at the moment.";
            }
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
            try {
                console.log('Fetching revenue data...');
                const revenueRef = collection(db, 'bookings'); // Change to bookings collection since revenue is stored there
                const snapshot = await getDocs(revenueRef);
                const revenue = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        amount: data.totalPrice || data.totalAmount || 0, // Consider both possible field names
                        date: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(data.checkIn),
                        status: data.status
                    };
                }).filter(r => r.amount > 0 && r.status === 'confirmed'); // Only include confirmed bookings with valid amounts

                console.log('Fetched revenue data:', revenue);
                return revenue;
            } catch (error) {
                console.error('Error fetching revenue data:', error);
                return [];
            }
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
                    ${suggestions.map(s => {
                        const sanitizedText = this.sanitizeHtml(s.text);
                        return `
                            <div class="suggestion-chip" 
                                 data-suggestion="${sanitizedText}"
                                 role="button"
                                 tabindex="0">
                                ${sanitizedText}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Add click event listeners to suggestions
            suggestionDiv.addEventListener('click', (e) => {
                const chip = e.target.closest('.suggestion-chip');
                if (chip) {
                    const suggestion = chip.dataset.suggestion;
                    this.submitSuggestion(suggestion);
                }
            });

            document.getElementById('chatContainer').appendChild(suggestionDiv);
        },

        // Add new analytics methods
        async calculateKPIs(data) {
            const { bookings, rooms, revenue } = data;
            
            return {
                occupancyRate: this.calculateOccupancyRate(rooms),
                revPAR: this.calculateRevPAR(revenue, rooms),
                adr: this.calculateADR(revenue, bookings),
                bookingPace: this.calculateBookingPace(bookings),
                customerRetention: this.calculateRetentionRate(bookings)
            };
        },

        async processAnalyticsQuery(message) {
            try {
                const data = await this.fetchIntegratedData();
                if (data.status === 'error') {
                    throw new Error(data.error || 'Failed to fetch analytics data');
                }

                // Check if we have the minimum required data
                if (!data.bookings || !data.rooms || !data.revenue) {
                    return "I apologize, but I don't have enough data to provide a meaningful analysis at this moment.";
                }

                const kpis = await this.calculateKPIs(data);
                const trends = this.analyzeBusinessTrends(data);
                
                if (message.includes('performance') || message.includes('kpi')) {
                    return this.formatKPIResponse(kpis);
                } else if (message.includes('trend') || message.includes('growth')) {
                    return this.formatTrendResponse(trends);
                } else if (message.includes('compare')) {
                    return this.generateComparison(data);
                }
                
                return this.generateGeneralAnalytics(data, kpis);
            } catch (error) {
                console.error('Analytics query error:', error);
                return "I apologize, but I'm having trouble analyzing the data right now. Please try again in a moment.";
            }
        },

        generateGeneralAnalytics(data, kpis) {
            try {
                return `Here's a general overview of your hotel's performance:

Occupancy: ${kpis.occupancyRate}%
Revenue per Available Room: $${kpis.revPAR}
Average Daily Rate: $${kpis.adr}
Booking Pace: ${kpis.bookingPace} bookings/day
Customer Retention: ${kpis.customerRetention}%

Total Rooms: ${data.rooms.length}
Active Bookings: ${data.bookings.filter(b => b.status === 'confirmed').length}
Recent Activities: ${data.activities.length}`;
            } catch (error) {
                console.error('Error generating general analytics:', error);
                return "I apologize, but I'm having trouble generating the analysis. Please try a more specific question.";
            }
        },

        // Analytics helper methods
        calculateOccupancyRate(rooms) {
            const occupied = rooms.filter(r => r.status === 'occupied').length;
            return (occupied / rooms.length * 100).toFixed(1);
        },

        calculateRevPAR(revenue, rooms) {
            const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
            return (totalRevenue / rooms.length).toFixed(2);
        },

        calculateADR(revenue, bookings) {
            const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
            const roomNights = bookings.reduce((sum, b) => {
                const nights = this.calculateNights(b.checkIn, b.checkOut);
                return sum + nights;
            }, 0);
            return (totalRevenue / roomNights).toFixed(2);
        },

        calculateBookingPace(bookings) {
            const recent = bookings.filter(b => {
                const bookingDate = new Date(b.createdAt);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return bookingDate >= thirtyDaysAgo;
            }).length;
            return (recent / 30).toFixed(1);
        },

        calculateRetentionRate(bookings) {
            const customerBookings = bookings.reduce((acc, booking) => {
                acc[booking.userId] = (acc[booking.userId] || 0) + 1;
                return acc;
            }, {});
            const repeatCustomers = Object.values(customerBookings).filter(count => count > 1).length;
            return (repeatCustomers / Object.keys(customerBookings).length * 100).toFixed(1);
        },

        analyzeBusinessTrends(data) {
            const { bookings, rooms, revenue } = data;
            return {
                occupancyTrend: this.calculateOccupancyTrend(bookings, rooms),
                revenueTrend: this.calculateRevenueTrend(revenue),
                bookingTrend: this.calculateBookingTrend(bookings),
                seasonality: this.analyzeSeasonality(bookings)
            };
        },

        calculateOccupancyTrend(bookings, rooms) {
            const last6Months = new Array(6).fill(0).map((_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                return date.toLocaleString('default', { month: 'short' });
            }).reverse();

            return last6Months.map(month => {
                const monthlyBookings = bookings.filter(b => {
                    const bookingMonth = new Date(b.checkIn).toLocaleString('default', { month: 'short' });
                    return bookingMonth === month;
                });
                const occupiedRooms = monthlyBookings.length;
                return {
                    month,
                    rate: (occupiedRooms / rooms.length) * 100
                };
            });
        },

        calculateRevenueTrend(revenue) {
            const monthlyRevenue = revenue.reduce((acc, r) => {
                const month = new Date(r.date).toLocaleString('default', { month: 'short' });
                acc[month] = (acc[month] || 0) + r.amount;
                return acc;
            }, {});

            return Object.entries(monthlyRevenue).map(([month, amount]) => ({
                month,
                amount,
                growth: this.calculateGrowthRate(month, monthlyRevenue)
            }));
        },

        calculateGrowthRate(currentMonth, revenueData) {
            const months = Object.keys(revenueData);
            const currentIndex = months.indexOf(currentMonth);
            if (currentIndex <= 0) return 0;
            
            const currentRevenue = revenueData[currentMonth];
            const previousRevenue = revenueData[months[currentIndex - 1]];
            
            return previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        },

        calculateBookingTrend(bookings) {
            const last30Days = new Array(30).fill(0);
            bookings.forEach(booking => {
                const bookingDate = new Date(booking.createdAt);
                const daysAgo = Math.floor((Date.now() - bookingDate) / (1000 * 60 * 60 * 24));
                if (daysAgo < 30) {
                    last30Days[daysAgo]++;
                }
            });
            return last30Days;
        },

        analyzeSeasonality(bookings) {
            const seasonalData = {
                spring: 0,
                summer: 0,
                fall: 0,
                winter: 0
            };

            bookings.forEach(booking => {
                const month = new Date(booking.checkIn).getMonth();
                if (month >= 2 && month <= 4) seasonalData.spring++;
                else if (month >= 5 && month <= 7) seasonalData.summer++;
                else if (month >= 8 && month <= 10) seasonalData.fall++;
                else seasonalData.winter++;
            });

            return seasonalData;
        },

        formatKPIResponse(kpis) {
            return `Key Performance Indicators:\n
- Occupancy Rate: ${kpis.occupancyRate}%
- Revenue per Available Room (RevPAR): $${kpis.revPAR}
- Average Daily Rate (ADR): $${kpis.adr}
- Booking Pace: ${kpis.bookingPace} bookings/day
- Customer Retention Rate: ${kpis.customerRetention}%`;
        },

        formatTrendResponse(trends) {
            const { occupancyTrend, revenueTrend } = trends;
            
            const occupancySummary = occupancyTrend
                .map(t => `${t.month}: ${t.rate.toFixed(1)}%`)
                .join('\n');

            const revenueSummary = revenueTrend
                .map(t => `${t.month}: $${t.amount.toLocaleString()} (${t.growth > 0 ? '+' : ''}${t.growth.toFixed(1)}%)`)
                .join('\n');

            return `Business Trends Analysis:\n
Occupancy Trends:
${occupancySummary}\n
Revenue Trends:
${revenueSummary}\n
Seasonality Impact:
${this.formatSeasonality(trends.seasonality)}`;
        },

        formatSeasonality(seasonality) {
            return Object.entries(seasonality)
                .map(([season, count]) => `${season}: ${count} bookings`)
                .join('\n');
        },

        generateComparison(data) {
            const currentMonth = new Date().toLocaleString('default', { month: 'short' });
            const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
                .toLocaleString('default', { month: 'short' });

            const currentMetrics = this.calculateMonthlyMetrics(data, currentMonth);
            const prevMetrics = this.calculateMonthlyMetrics(data, prevMonth);

            return `Month-over-Month Comparison (${prevMonth} vs ${currentMonth}):\n
Revenue: ${this.formatComparison(prevMetrics.revenue, currentMetrics.revenue, true)}
Occupancy: ${this.formatComparison(prevMetrics.occupancy, currentMetrics.occupancy)}%
Bookings: ${this.formatComparison(prevMetrics.bookings, currentMetrics.bookings)}
Average Rate: ${this.formatComparison(prevMetrics.avgRate, currentMetrics.avgRate, true)}`;
        },

        calculateMonthlyMetrics(data, month) {
            const { bookings, revenue } = data;
            const monthlyBookings = bookings.filter(b => 
                new Date(b.checkIn).toLocaleString('default', { month: 'short' }) === month
            );

            const monthlyRevenue = revenue.filter(r => 
                new Date(r.date).toLocaleString('default', { month: 'short' }) === month
            ).reduce((sum, r) => sum + r.amount, 0);

            return {
                revenue: monthlyRevenue,
                bookings: monthlyBookings.length,
                occupancy: (monthlyBookings.length / data.rooms.length) * 100,
                avgRate: monthlyBookings.length ? monthlyRevenue / monthlyBookings.length : 0
            };
        },

        formatComparison(prev, current, isCurrency = false) {
            const change = ((current - prev) / prev * 100).toFixed(1);
            const formatter = new Intl.NumberFormat('en-US', {
                style: isCurrency ? 'currency' : 'decimal',
                currency: 'USD'
            });

            return `${formatter.format(current)} (${change > 0 ? '+' : ''}${change}%)`;
        },

        // Add missing analytics methods
        calculateOccupancyStats(rooms, bookings) {
            const occupied = rooms.filter(r => r.status === 'occupied').length;
            const available = rooms.filter(r => r.status === 'available').length;
            const total = rooms.length;
            
            const monthlyBookings = this.groupBookingsByMonth(bookings);
            const peakMonth = Object.entries(monthlyBookings)
                .sort((a, b) => b[1] - a[1])[0][0];
            
            const avgStayDuration = this.calculateAverageStayDuration(bookings);
            
            return {
                rate: (occupied / total) * 100,
                occupied,
                available,
                peakMonth,
                avgStayDuration
            };
        },

        calculateRevenueStats(revenue, bookings) {
            const total = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
            const monthlyRevenue = this.groupRevenueByMonth(revenue);
            const bestMonth = Object.entries(monthlyRevenue)
                .sort((a, b) => b[1] - a[1])[0][0];
            
            const prevYearRevenue = this.calculatePreviousYearRevenue(revenue);
            const yoyGrowth = ((total - prevYearRevenue) / prevYearRevenue) * 100;
            
            return {
                total,
                avgPerBooking: total / bookings.length,
                bestMonth,
                trend: this.determineRevenueTrend(monthlyRevenue),
                yoyGrowth
            };
        },

        calculateBookingStats(bookings) {
            const active = bookings.filter(b => b.status === 'confirmed').length;
            const hourlyDistribution = this.calculateHourlyDistribution(bookings);
            const peakHours = this.findPeakHours(hourlyDistribution);
            const popularRoomType = this.findPopularRoomType(bookings);
            const avgValue = this.calculateAverageBookingValue(bookings);
            
            return {
                total: bookings.length,
                active,
                peakHours,
                popularRoomType,
                avgValue
            };
        },

        // Helper methods
        groupBookingsByMonth(bookings) {
            return bookings.reduce((acc, booking) => {
                const month = new Date(booking.checkIn).toLocaleString('default', { month: 'short' });
                acc[month] = (acc[month] || 0) + 1;
                return acc;
            }, {});
        },

        groupRevenueByMonth(revenue) {
            return revenue.reduce((acc, r) => {
                const month = new Date(r.date).toLocaleString('default', { month: 'short' });
                acc[month] = (acc[month] || 0) + (r.amount || 0);
                return acc;
            }, {});
        },

        calculateHourlyDistribution(bookings) {
            const distribution = new Array(24).fill(0);
            bookings.forEach(booking => {
                const hour = new Date(booking.checkIn).getHours();
                distribution[hour]++;
            });
            return distribution;
        },

        findPopularRoomType(bookings) {
            const typeCounts = bookings.reduce((acc, booking) => {
                const type = booking.propertyDetails?.roomType || 'Standard';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])[0][0];
        },

        calculateAverageBookingValue(bookings) {
            const total = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
            return total / bookings.length;
        },

        determineRevenueTrend(monthlyRevenue) {
            const values = Object.values(monthlyRevenue);
            const lastThreeMonths = values.slice(-3);
            if (lastThreeMonths.every((v, i) => i === 0 || v > lastThreeMonths[i - 1])) {
                return 'Increasing';
            }
            if (lastThreeMonths.every((v, i) => i === 0 || v < lastThreeMonths[i - 1])) {
                return 'Decreasing';
            }
            return 'Stable';
        },

        calculatePreviousYearRevenue(revenue) {
            const lastYear = new Date();
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            return revenue
                .filter(r => new Date(r.date) <= lastYear)
                .reduce((sum, r) => sum + (r.amount || 0), 0);
        },

        getLast12Months() {
            return new Array(12).fill(0).map((_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                return date.toLocaleString('default', { month: 'short' });
            }).reverse();
        },

        calculateNights(checkIn, checkOut) {
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        },

        // Generate performance report
        async generatePerformanceReport(rooms, bookings, revenue) {
            const occupancyStats = this.calculateOccupancyStats(rooms, bookings);
            const revenueStats = this.calculateRevenueStats(revenue, bookings);
            const bookingStats = this.calculateBookingStats(bookings);

            return `Performance Report:
            
Occupancy Metrics:
- Current Occupancy Rate: ${occupancyStats.rate.toFixed(1)}%
- Occupied Rooms: ${occupancyStats.occupied}
- Available Rooms: ${occupancyStats.available}
- Peak Month: ${occupancyStats.peakMonth}

Revenue Metrics:
- Total Revenue: $${revenueStats.total.toLocaleString()}
- Average Revenue per Booking: $${revenueStats.avgPerBooking.toFixed(2)}
- Best Performing Month: ${revenueStats.bestMonth}
- Revenue Trend: ${revenueStats.trend}
- Year-over-Year Growth: ${revenueStats.yoyGrowth.toFixed(1)}%

Booking Metrics:
- Total Bookings: ${bookingStats.total}
- Active Bookings: ${bookingStats.active}
- Peak Booking Hours: ${bookingStats.peakHours.join(', ')}
- Most Popular Room Type: ${bookingStats.popularRoomType}
- Average Booking Value: $${bookingStats.avgValue.toFixed(2)}`;
        },

        // Remove duplicate methods and fix syntax errors...
        // ...existing methods...
    },
    async mounted() {
        await this.initializeApp();
    }
});