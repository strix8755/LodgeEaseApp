import { auth, db } from '../firebase.js';
import { collection, query, getDocs, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { getChatCompletion, analyzeHotelMetrics, generateForecasts } from './openai-service.js';

// Initialize Vue application
new Vue({
    el: '#app',
    data: {
        isAuthenticated: false,
        loading: true,
        currentMessage: '',
        chatContext: [],
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
        charts: {
            occupancy: null,
            revenue: null,
            bookingTrends: null,
            satisfaction: null,
            roomTypes: null
        }
    },
    async mounted() {
        try {
            await this.checkAuthState();
            await this.initializeAnalytics();
            await this.initializeCharts();
            this.startNewChat();
            this.setupRealTimeUpdates();
        } catch (error) {
            console.error('Error in mounted:', error);
            this.handleError(error, 'initialization');
        }
    },
    methods: {
        async checkAuthState() {
            const user = auth.currentUser;
            if (!user) {
                this.isAuthenticated = false;
                window.location.href = '../Login/index.html';
                return;
            }
            this.isAuthenticated = true;
            this.loading = false;
        },

        async sendMessage() {
            if (!this.currentMessage.trim()) return;

            try {
                // Add user message to UI
                this.addMessage(this.currentMessage, 'user');
                const userMessage = this.currentMessage;
                this.currentMessage = '';

                // Prepare analytics data for context
                const analyticsContext = {
                    occupancyRate: this.analyticsData.occupancyRate,
                    revenue: this.analyticsData.revenue,
                    bookings: this.analyticsData.bookings,
                    trends: this.analyticsData.historicalData
                };

                // Add loading state
                const loadingMessage = this.addMessage('Processing your request...', 'bot', true);

                // Get AI response
                const response = await getChatCompletion(userMessage, [
                    ...this.chatContext,
                    { role: 'system', content: `Current analytics: ${JSON.stringify(analyticsContext)}` }
                ]);

                // Remove loading message and add response
                loadingMessage.remove();
                this.addMessage(response, 'bot');

                // Update context
                this.chatContext.push(
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: response }
                );

                // Update analytics if needed
                if (this.shouldUpdateAnalytics(userMessage)) {
                    await this.fetchAnalyticsData();
                    await this.updateCharts();
                }
            } catch (error) {
                console.error('Error sending message:', error);
                this.handleError(error, 'message');
            }
        },

        addMessage(content, type, isLoading = false) {
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type} ${isLoading ? 'loading' : ''}`;
            
            messageDiv.innerHTML = `
                <div class="message-avatar ${type}">
                    <i class="fas fa-${type === 'bot' ? 'robot' : 'user'}"></i>
                </div>
                <div class="message-content">${content}</div>
            `;
            
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return messageDiv;
        },

        async initializeAnalytics() {
            try {
                await this.fetchAnalyticsData();
                const metrics = {
                    occupancyRate: this.analyticsData.occupancyRate,
                    revenue: this.analyticsData.revenue,
                    bookings: this.analyticsData.bookings,
                    satisfaction: 0 // Initialize with default value
                };
                
                const analysis = await analyzeHotelMetrics(metrics);
                this.addMessage(analysis, 'bot');
            } catch (error) {
                console.error('Error initializing analytics:', error);
                this.handleError(error, 'analytics');
            }
        },

        async initializeCharts() {
            const charts = {
                occupancyChart: this.createOccupancyChart(),
                revenueChart: this.createRevenueChart(),
                bookingTrendsChart: this.createBookingTrendsChart(),
                customerSatisfactionChart: this.createSatisfactionChart(),
                roomTypesChart: this.createRoomTypesChart()
            };

            Object.entries(charts).forEach(([id, config]) => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    this.charts[id] = new Chart(canvas.getContext('2d'), config);
                }
            });
        },

        // Chart creation methods
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

        // Helper methods
        shouldUpdateAnalytics(message) {
            const analyticsKeywords = ['occupancy', 'revenue', 'bookings', 'trends', 'performance'];
            return analyticsKeywords.some(keyword => message.toLowerCase().includes(keyword));
        },

        getLast12Months() {
            return Array.from({length: 12}, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                return d.toLocaleString('default', { month: 'short' });
            }).reverse();
        },

        handleError(error, context) {
            console.error(`Error in ${context}:`, error);
            this.addMessage('I encountered an error processing your request. Please try again.', 'bot');
        },

        startNewChat() {
            const chatContainer = document.getElementById('chatContainer');
            chatContainer.innerHTML = '';
            this.chatContext = [];
            this.addMessage('Welcome to Lodge Ease AI Assistant! How can I help you today?', 'bot');
        },

        setupRealTimeUpdates() {
            setInterval(async () => {
                await this.fetchAnalyticsData();
                await this.updateCharts();
            }, 300000); // Update every 5 minutes
        }
    }
});