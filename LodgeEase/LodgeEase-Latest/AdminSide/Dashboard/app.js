// Import Firebase modules
import { db, auth } from '../firebase.js';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, Timestamp, where, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getChartData } from './chartData.js';

// Vue app for the dashboard
new Vue({
    el: '#app',
    data: {
        todayCheckIns: 0,
        availableRooms: 10,
        occupiedRooms: 0,
        searchQuery: '',
        bookings: [],
        analysisFeedback: '',
        isAuthenticated: false,
        loading: true,
        revenueChart: null,
        occupancyChart: null,
        roomTypeChart: null,
        stats: {
            totalBookings: 0,
            currentMonthRevenue: 0,
            occupancyRate: 0,
            averageStayDuration: 0
        },
        chartData: {
            revenue: {
                labels: [],
                datasets: []
            },
            occupancy: {
                labels: [],
                datasets: []
            },
            roomType: {
                labels: [],
                datasets: []
            }
        },
        forecastData: {
            occupancyPrediction: [],
            revenueForecast: [],
            demandTrends: [],
            seasonalityPatterns: []
        },
        aiInsights: [],
        updateInterval: null,
        forecastInterval: null
    },
    methods: {
        async handleLogout() {
            try {
                await signOut(auth);
                window.location.href = '../Login/index.html';
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Error signing out. Please try again.');
            }
        },

        async checkAuthState() {
            return new Promise((resolve) => {
                auth.onAuthStateChanged(async (user) => {
                    this.loading = false;
                    if (user) {
                        this.isAuthenticated = true;
                        this.user = user;
                        await this.initializeCharts();
                        await this.fetchBookings();
                    } else {
                        this.isAuthenticated = false;
                        this.user = null;
                    }
                    resolve(user);
                });
            });
        },

        analyzeData() {
            const totalBookings = this.bookings.length;
            const pendingBookings = this.bookings.filter(b => b.status === 'pending').length;
            const occupiedBookings = this.bookings.filter(b => b.status === 'occupied').length;
            const completedBookings = this.bookings.filter(b => b.status === 'completed').length;
            
            this.analysisFeedback = `
                Total Bookings: ${totalBookings}
                Pending Bookings: ${pendingBookings}
                Occupied Rooms: ${occupiedBookings}
                Completed Bookings: ${completedBookings}
                Available Rooms: ${this.availableRooms}
                Occupancy Rate: ${((occupiedBookings / 10) * 100).toFixed(1)}%
            `;
        },

        formatDate(timestamp) {
            try {
                if (!timestamp || !timestamp.toDate) return 'N/A';
                return timestamp.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            } catch (error) {
                console.error('Date formatting error:', error);
                return 'N/A';
            }
        },

        formatDateForChart(date) {
            try {
                // Handle different date formats
                const dateObj = date instanceof Date ? date : 
                               (date?.toDate ? date.toDate() : 
                               (typeof date === 'string' ? new Date(date) : null));

                if (!dateObj || isNaN(dateObj.getTime())) {
                    throw new Error('Invalid date input');
                }

                return dateObj.toLocaleString('default', { 
                    month: 'short', 
                    year: '2-digit'
                });
            } catch (error) {
                console.error('Date formatting error:', error, 'Input:', date);
                return 'Invalid Date';
            }
        },

        async fetchBookings() {
            try {
                if (!db) {
                    throw new Error('Firestore instance not initialized');
                }
                
                const bookingsRef = collection(db, 'bookings');
                if (!bookingsRef) {
                    throw new Error('Failed to create bookings collection reference');
                }
                
                const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(5));
                const querySnapshot = await getDocs(q);
                
                this.bookings = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log('Raw booking data:', data);
                    
                    // Ensure price is a valid number
                    const totalPrice = parseFloat(data.totalPrice) || parseFloat(data.totalAmount) || 0;
                    
                    const booking = {
                        id: doc.id,
                        propertyDetails: {
                            roomNumber: data.propertyDetails?.roomNumber || data.roomNumber || 'N/A',
                            roomType: data.propertyDetails?.roomType || data.roomType || 'N/A'
                        },
                        floorLevel: data.floorLevel || 'N/A',
                        guestName: data.guestName || 'Guest',
                        checkIn: data.checkIn,
                        checkOut: data.checkOut,
                        status: data.status || 'pending',
                        totalAmount: totalPrice, // Use consistent field name
                        totalPrice: totalPrice  // Keep for backward compatibility
                    };

                    console.log('Processed booking:', booking);
                    return booking;
                });

                console.log('All processed bookings:', this.bookings);
                await this.updateDashboardStats();

                // After fetching bookings, generate forecasts
                await this.generateAIForecasts();
                
                // Set up interval for forecast updates
                if (!this.forecastInterval) {
                    this.forecastInterval = setInterval(() => this.generateAIForecasts(), 21600000);
                }
            } catch (error) {
                console.error('Error fetching bookings:', error);
            }
        },

        async deleteBooking(bookingId) {
            if (!this.isAuthenticated) {
                alert('Please log in to delete bookings');
                return;
            }

            if (!bookingId) {
                console.error('No booking ID provided');
                return;
            }

            try {
                if (!confirm('Are you sure you want to delete this booking?')) {
                    return;
                }

                const bookingRef = doc(db, 'bookings', bookingId);
                await deleteDoc(bookingRef);
                
                // Remove from local state
                this.bookings = this.bookings.filter(booking => booking.id !== bookingId);
                this.updateDashboardStats();
                
                alert('Booking deleted successfully!');
            } catch (error) {
                console.error('Error deleting booking:', error);
                if (error.code === 'permission-denied') {
                    alert('You do not have permission to delete this booking');
                } else {
                    alert('Error deleting booking. Please try again.');
                }
            }
        },

        async editBooking(booking) {
            if (!this.isAuthenticated) {
                alert('Please log in to edit bookings');
                return;
            }

            if (!booking || !booking.id) {
                console.error('Invalid booking data');
                return;
            }

            console.log('Editing booking:', booking); // Debug log

            try {
                const modalHTML = `
                    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                            <h2 class="text-xl font-bold mb-4">Edit Booking</h2>
                            <form id="edit-booking-form" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                                    <input 
                                        name="roomNumber" 
                                        type="text" 
                                        value="${booking.propertyDetails?.roomNumber || ''}"
                                        class="w-full p-2 border rounded-md"
                                        required
                                    >
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                                    <input 
                                        name="roomType" 
                                        type="text" 
                                        value="${booking.propertyDetails?.roomType || ''}"
                                        class="w-full p-2 border rounded-md"
                                        required
                                    >
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
                                    <input 
                                        name="floorLevel" 
                                        type="text" 
                                        value="${booking.propertyDetails.floorLevel}"
                                        class="w-full p-2 border rounded-md"
                                        required
                                    >
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                                    <input 
                                        name="guestName" 
                                        type="text" 
                                        value="${booking.guestName}"
                                        class="w-full p-2 border rounded-md"
                                        required
                                    >
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select name="status" class="w-full p-2 border rounded-md" required>
                                        <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="occupied" ${booking.status === 'occupied' ? 'selected' : ''}>Occupied</option>
                                        <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    </select>
                                </div>
                                <div class="flex justify-end space-x-3 mt-6">
                                    <button type="button" class="cancel-edit px-4 py-2 bg-gray-200 text-gray-800 rounded">Cancel</button>
                                    <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHTML;
                document.body.appendChild(modalContainer);

                const form = document.getElementById('edit-booking-form');
                const cancelBtn = modalContainer.querySelector('.cancel-edit');

                cancelBtn.addEventListener('click', () => {
                    modalContainer.remove();
                });

                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);

                    try {
                        const bookingRef = doc(db, 'bookings', booking.id);
                        const updateData = {
                            'propertyDetails.roomNumber': formData.get('roomNumber'),
                            'propertyDetails.roomType': formData.get('roomType'),
                            'floorLevel': formData.get('floorLevel'),
                            guestName: formData.get('guestName'),
                            status: formData.get('status'),
                            updatedAt: Timestamp.fromDate(new Date())
                        };

                        console.log('Updating with data:', updateData); // Debug log
                        await updateDoc(bookingRef, updateData);

                        await this.fetchBookings();
                        modalContainer.remove();
                        alert('Booking updated successfully!');
                    } catch (error) {
                        console.error('Error updating booking:', error);
                        alert('Error updating booking. Please try again.');
                    }
                });

            } catch (error) {
                console.error('Error opening edit modal:', error);
                alert('Error opening edit form. Please try again.');
            }
        },

        async updateDashboardStats() {
            try {
                const data = await getChartData();
                if (!data) {
                    console.error('No data received from getChartData');
                    return;
                }
                
                // Update charts with null checks
                if (this.revenueChart && data.revenueData) {
                    this.updateChart(this.revenueChart, data.revenueData);
                }
                if (this.occupancyChart && data.occupancyData) {
                    this.updateChart(this.occupancyChart, data.occupancyData);
                }
                if (this.roomTypeChart && data.popularRoomsData) {
                    this.updateChart(this.roomTypeChart, data.popularRoomsData);
                }
                
                // Update metrics with null checks
                this.stats = {
                    totalBookings: data.metrics?.totalBookings ?? 0,
                    currentMonthRevenue: data.metrics?.currentMonthRevenue ?? 0,
                    occupancyRate: data.metrics?.occupancyRate ?? 0,
                    averageStayDuration: data.metrics?.averageStayDuration ?? 0
                };
                
                // Update other dashboard data with null checks
                this.todayCheckIns = data.todayCheckIns ?? 0;
                this.availableRooms = data.availableRooms ?? 0;
                this.occupiedRooms = data.occupiedRooms ?? 0;
                
            } catch (error) {
                console.error('Error updating dashboard:', error);
            }
        },

        updateChart(chart, newData) {
            if (!chart || !newData) {
                console.warn('Missing chart or data in updateChart');
                return;
            }
            
            try {
                if (!chart.data) {
                    console.warn('Chart data object is undefined');
                    return;
                }
                
                chart.data.labels = newData.labels || [];
                chart.data.datasets = newData.datasets || [];
                chart.update();
            } catch (error) {
                console.error('Error updating chart:', error);
            }
        },

        async initializeCharts() {
            try {
                await this.$nextTick();
                
                const revenueCanvas = document.getElementById('revenueChart');
                const bookingTrendCanvas = document.getElementById('bookingTrendChart');
                const occupancyCanvas = document.getElementById('occupancyChart');
                const roomTypeCanvas = document.getElementById('roomTypeChart');
                const baguioWebCanvas = document.getElementById('baguioWebChart');
                
                if (!revenueCanvas || !occupancyCanvas || !roomTypeCanvas) {
                    console.warn('Chart canvas elements not found. Charts will not be initialized.');
                    return;
                }

                const ctx1 = revenueCanvas.getContext('2d');
                const ctx2 = occupancyCanvas.getContext('2d');
                const ctx3 = roomTypeCanvas.getContext('2d');

                this.revenueChart = new Chart(ctx1, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '₱' + value.toLocaleString('en-PH');
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return '₱' + context.raw.toLocaleString('en-PH');
                                    }
                                }
                            },
                            legend: {
                                position: 'top'
                            }
                        }
                    }
                });

                this.occupancyChart = new Chart(ctx2, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'top'
                            }
                        }
                    }
                });

                this.roomTypeChart = new Chart(ctx3, {
                    type: 'doughnut',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            }
                        }
                    }
                });

                // Add booking trend chart initialization
                this.bookingTrendChart = new Chart(bookingTrendCanvas, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Monthly Bookings',
                            data: [],
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 2,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'top'
                            }
                        }
                    }
                });

                // Initialize Baguio Web Chart
                this.baguioWebChart = new Chart(baguioWebCanvas, {
                    type: 'radar',
                    data: {
                        labels: [
                            'Session Road Area',
                            'Mines View',
                            'Burnham Park',
                            'Camp John Hay',
                            'Teachers Camp',
                            'Upper General Luna',
                            'Military Cut-off',
                            'Legarda Road',
                            'Baguio City Market'
                        ],
                        datasets: [{
                            label: 'Number of Lodges',
                            data: [], // Will be populated from Firebase
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 2,
                            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                },
                                angleLines: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                },
                                ticks: {
                                    stepSize: 1,
                                    backdropColor: 'transparent'
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'top'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.label}: ${context.raw} lodges`;
                                    }
                                }
                            }
                        }
                    }
                });

                // Add this method to update the web chart
                async function updateBaguioWebChart() {
                    try {
                        const lodgesRef = collection(db, 'lodges');
                        const snapshot = await getDocs(lodgesRef);
                        
                        // Create a map to store lodge counts by area
                        const areaLodgeCounts = new Map();
                        
                        snapshot.forEach(doc => {
                            const lodge = doc.data();
                            const area = lodge.area || 'Other';
                            areaLodgeCounts.set(area, (areaLodgeCounts.get(area) || 0) + 1);
                        });
                        
                        // Update chart data
                        this.baguioWebChart.data.datasets[0].data = this.baguioWebChart.data.labels.map(
                            label => areaLodgeCounts.get(label) || 0
                        );
                        
                        this.baguioWebChart.update();
                    } catch (error) {
                        console.error('Error updating Baguio web chart:', error);
                    }
                }

                // Call update method
                await updateBaguioWebChart();
                
                // Initialize with data
                await this.updateDashboardStats();
            } catch (error) {
                console.error('Error initializing charts:', error);
            }
        },

        async generateAIForecasts() {
            try {
                const historicalData = await this.fetchHistoricalBookings();
                
                if (!historicalData || historicalData.length === 0) {
                    console.warn('No historical data available');
                    return;
                }

                const bookingPatterns = await this.analyzeBookingPatterns(historicalData);
                const seasonalTrends = await this.analyzeSeasonality(historicalData);
                const demandIndicators = await this.analyzeDemandFactors(historicalData);

                const predictions = this.generatePredictions(bookingPatterns, seasonalTrends, demandIndicators);
                
                if (predictions) {
                    await this.savePredictionsToFirebase(predictions);
                    this.updateChartsWithPredictions(predictions);
                    this.generateInsights(predictions);
                    console.log('AI forecasts generated successfully');
                }
            } catch (error) {
                console.error('Error generating forecasts:', error);
            }
        },

        async fetchHistoricalBookings() {
            const bookingsRef = collection(db, 'bookings');
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const q = query(
                bookingsRef,
                where('checkIn', '>=', sixMonthsAgo),
                orderBy('checkIn', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        },

        async analyzeBookingPatterns(historicalData) {
            // Group bookings by date
            const bookingsByDate = historicalData.reduce((acc, booking) => {
                const date = this.formatDate(booking.checkIn);
                if (!acc[date]) acc[date] = [];
                acc[date].push(booking);
                return acc;
            }, {});

            // Calculate daily stats
            const dailyStats = Object.entries(bookingsByDate).map(([date, bookings]) => ({
                date,
                count: bookings.length,
                revenue: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
                occupancyRate: (bookings.length / this.availableRooms) * 100
            }));

            return {
                dailyStats,
                averageOccupancy: this.calculateAverageFromStats(dailyStats, 'occupancyRate'),
                averageRevenue: this.calculateAverageFromStats(dailyStats, 'revenue'),
                trendLine: this.calculateTrendLine(dailyStats)
            };
        },

        async analyzeSeasonality(historicalData) {
            const monthlyData = historicalData.reduce((acc, booking) => {
                const month = new Date(this.formatDate(booking.checkIn)).getMonth();
                if (!acc[month]) {
                    acc[month] = {
                        bookings: 0,
                        revenue: 0,
                        occupancyRate: 0
                    };
                }
                acc[month].bookings++;
                acc[month].revenue += booking.totalPrice || 0;
                return acc;
            }, {});

            // Calculate seasonal indices
            return Object.entries(monthlyData).map(([month, data]) => ({
                month: parseInt(month),
                seasonalIndex: data.bookings / (historicalData.length / 12),
                avgRevenue: data.revenue / data.bookings,
                occupancyRate: (data.bookings / (this.availableRooms * 30)) * 100
            }));
        },

        async savePredictionsToFirebase(predictions) {
            try {
                // Add timestamp and metadata
                const predictionData = {
                    predictions,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    userId: auth.currentUser?.uid,
                    status: 'active'
                };

                const forecastRef = collection(db, 'forecasts');
                const docRef = await addDoc(forecastRef, predictionData);
                console.log('Predictions saved with ID:', docRef.id);
                return docRef.id;
            } catch (error) {
                console.error('Error saving predictions:', error);
                throw error;
            }
        },

        calculateTrend(values) {
            if (!Array.isArray(values) || values.length < 2) {
                return 0;
            }

            try {
                // Filter out any non-numeric values
                const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
                if (numericValues.length < 2) {
                    return 0;
                }

                // Calculate percentage change
                const firstValue = numericValues[0];
                const lastValue = numericValues[numericValues.length - 1];
                
                if (firstValue === 0) {
                    return lastValue > 0 ? 100 : 0;
                }
                
                return ((lastValue - firstValue) / firstValue) * 100;
            } catch (error) {
                console.error('Error calculating trend:', error);
                return 0;
            }
        },

        getOccupancyRecommendation(trend) {
            try {
                if (trend > 15) {
                    return "Strong demand growth. Consider dynamic pricing and premium rates for peak periods.";
                } else if (trend > 5) {
                    return "Moderate growth. Maintain current rates while monitoring demand.";
                } else if (trend < -15) {
                    return "Significant decline. Consider promotional offers and package deals.";
                } else if (trend < -5) {
                    return "Slight decline. Review pricing strategy and marketing efforts.";
                }
                return "Stable occupancy. Continue current operations while monitoring market conditions.";
            } catch (error) {
                console.error('Error getting occupancy recommendation:', error);
                return "Unable to generate recommendation. Please check data.";
            }
        },

        getRevenueRecommendation(trend) {
            try {
                if (trend > 15) {
                    return "Strong revenue growth. Focus on maintaining service quality and guest satisfaction.";
                } else if (trend > 5) {
                    return "Healthy growth. Consider strategic investments in amenities and services.";
                } else if (trend < -15) {
                    return "Revenue challenges. Review costs and consider targeted promotions.";
                } else if (trend < -5) {
                    return "Minor revenue decline. Analyze pricing strategy and market positioning.";
                }
                return "Stable revenue. Continue optimizing operations and monitoring competitors.";
            } catch (error) {
                console.error('Error getting revenue recommendation:', error);
                return "Unable to generate recommendation. Please check data.";
            }
        },

        getSeasonalFactor(date, seasonal) {
            try {
                if (!date || !Array.isArray(seasonal)) {
                    return 1;
                }

                const month = date.getMonth();
                const seasonalData = seasonal.find(s => s && typeof s === 'object' && s.month === month);
                return seasonalData?.seasonalIndex || 1;
            } catch (error) {
                console.error('Error getting seasonal factor:', error);
                return 1;
            }
        },

        getTrendFactor(patterns) {
            try {
                if (!patterns || !patterns.trendLine || typeof patterns.trendLine.slope !== 'number') {
                    return 1;
                }
                
                // Limit the trend factor to reasonable bounds
                const slope = patterns.trendLine.slope;
                const factor = 1 + (slope > 0 ? Math.min(slope, 0.5) : Math.max(slope, -0.3));
                return factor;
            } catch (error) {
                console.error('Error getting trend factor:', error);
                return 1;
            }
        },

        generatePredictions(bookingPatterns, seasonalTrends, demandIndicators) {
            try {
                const predictions = {
                    occupancy: [],
                    revenue: []
                };

                // Generate 6-month forecast instead of 30-day
                for (let i = 0; i < 6; i++) {
                    const date = new Date();
                    date.setMonth(date.getMonth() + i);
                    const month = date.getMonth();

                    // Get seasonal factor for current month
                    const seasonalFactor = this.getSeasonalFactor(date, seasonalTrends);
                    const trendImpact = this.getTrendFactor(bookingPatterns);

                    // Predict occupancy
                    const predictedOccupancy = Math.min(
                        100,
                        Math.max(
                            0,
                            bookingPatterns.averageOccupancy * seasonalFactor * trendImpact
                        )
                    );

                    // Predict revenue
                    const predictedRevenue = predictedOccupancy / 100 * 
                        this.availableRooms * 
                        (demandIndicators.averageRoomRate || 5000);

                    predictions.occupancy.push({
                        date: date,  // Use Date object directly
                        rate: Math.round(predictedOccupancy)
                    });

                    predictions.revenue.push({
                        date: date,  // Use Date object directly
                        amount: Math.round(predictedRevenue)
                    });
                }

                console.log('Generated predictions:', predictions); // Debug log
                return predictions;
            } catch (error) {
                console.error('Error generating predictions:', error);
                return null;
            }
        },

        generateInsights(predictions) {
            const occupancyTrend = this.calculateTrend(predictions.occupancy.map(p => p.rate));
            const revenueTrend = this.calculateTrend(predictions.revenue.map(p => p.amount));

            this.aiInsights = [
                {
                    type: 'occupancy',
                    message: `Expected ${occupancyTrend > 0 ? 'increase' : 'decrease'} in occupancy rate`,
                    recommendation: this.getOccupancyRecommendation(occupancyTrend)
                },
                {
                    type: 'revenue',
                    message: `Projected ${revenueTrend > 0 ? 'growth' : 'decline'} in revenue`,
                    recommendation: this.getRevenueRecommendation(revenueTrend)
                },
                {
                    type: 'pricing',
                    message: this.getPricingInsight(predictions),
                    recommendation: this.getPricingRecommendation(predictions)
                }
            ];
        },

        // Helper methods for calculations
        calculateAverageOccupancy() {
            return this.occupiedRooms / (this.occupiedRooms + this.availableRooms) * 100;
        },

        identifyPopularRoomTypes() {
            const roomTypeCounts = this.bookings.reduce((acc, booking) => {
                const type = booking.propertyDetails.roomType;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(roomTypeCounts)
                .sort(([,a], [,b]) => b - a)
                .map(([type]) => type);
        },

        calculatePredictedOccupancy(date, patterns, seasonal, demand) {
            // Base occupancy between 60% and 85%
            const baseOccupancy = 60 + (Math.random() * 25);
            
            // Seasonal adjustment (±15%)
            const seasonalFactor = 1 + (Math.random() * 0.3 - 0.15);
            
            // Day of week adjustment
            const dayOfWeek = date.getDay();
            const weekendBonus = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.2 : 1;
            
            // Calculate final occupancy
            let occupancy = baseOccupancy * seasonalFactor * weekendBonus;
            
            // Ensure occupancy stays within realistic bounds (40-95%)
            occupancy = Math.max(40, Math.min(95, occupancy));
            
            return occupancy;
        },

        calculatePredictedRevenue(occupancy, demand) {
            const baseRate = 5000; // Base room rate
            const seasonalFactor = 1 + (Math.random() * 0.3 - 0.15); // ±15% seasonal variation
            const demandFactor = 1 + (demand * 0.2); // Up to 20% increase based on demand
            
            // Calculate revenue with some randomization for more realistic predictions
            const revenue = baseRate * occupancy * seasonalFactor * demandFactor;
            // Add some noise (±5%)
            return revenue * (1 + (Math.random() * 0.1 - 0.05));
        },

        updateChartsWithPredictions(predictions) {
            try {
                if (!predictions || !predictions.occupancy || !predictions.revenue) {
                    console.error('Invalid predictions data:', predictions);
                    return;
                }

                // Format dates for x-axis
                const dates = predictions.occupancy.map(p => {
                    const date = p.date ? this.formatDateForChart(new Date(p.date)) : null;
                    return date;
                }).filter(Boolean);

                if (dates.length === 0) {
                    console.warn('No valid dates found in predictions');
                    return;
                }

                // Update occupancy chart
                if (this.occupancyChart) {
                    const occupancyData = {
                        labels: dates,
                        datasets: [{
                            label: 'Predicted Occupancy Rate',
                            data: predictions.occupancy.map(p => p.rate || 0),
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderWidth: 2,
                            fill: true
                        }]
                    };
                    this.updateChart(this.occupancyChart, occupancyData);
                }

                // Update revenue chart
                if (this.revenueChart) {
                    const revenueData = {
                        labels: dates,
                        datasets: [{
                            label: 'Predicted Revenue',
                            data: predictions.revenue.map(p => p.amount || 0),
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderWidth: 2,
                            fill: true
                        }]
                    };
                    this.updateChart(this.revenueChart, revenueData);
                }
            } catch (error) {
                console.error('Error updating charts with predictions:', error);
            }
        },
        async analyzeDemandFactors(historicalData) {
            try {
                const avgRoomRate = this.calculateAverageRoomRate(historicalData);
                const peakDays = this.identifyPeakDays(historicalData);
                const seasonalityPattern = this.analyzeSeasonalityPattern(historicalData);

                return {
                    averageRoomRate: avgRoomRate,
                    peakDays,
                    seasonalityPattern,
                    averageOccupancy: this.calculateAverageOccupancy(),
                    popularRoomTypes: this.identifyPopularRoomTypes()
                };
            } catch (error) {
                console.error('Error analyzing demand factors:', error);
                return {
                    averageRoomRate: 5000, // fallback value
                    peakDays: [],
                    seasonalityPattern: {},
                    averageOccupancy: 0,
                    popularRoomTypes: []
                };
            }
        },

        calculateAverageRoomRate(historicalData) {
            const validBookings = historicalData.filter(booking => booking.totalPrice > 0);
            if (validBookings.length === 0) return 5000; // default value
            return validBookings.reduce((sum, booking) => sum + booking.totalPrice, 0) / validBookings.length;
        },

        identifyPeakDays(historicalData) {
            const dailyBookings = {};
            historicalData.forEach(booking => {
                const date = this.formatDate(booking.checkIn);
                dailyBookings[date] = (dailyBookings[date] || 0) + 1;
            });

            const avgBookingsPerDay = Object.values(dailyBookings).reduce((a, b) => a + b, 0) / 
                Object.keys(dailyBookings).length || 1;

            return Object.entries(dailyBookings)
                .filter(([_, count]) => count > avgBookingsPerDay * 1.5)
                .map(([date]) => date);
        },

        analyzeSeasonalityPattern(historicalData) {
            const monthlyData = {};
            historicalData.forEach(booking => {
                const month = new Date(this.formatDate(booking.checkIn)).getMonth();
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        bookings: 0,
                        revenue: 0,
                        occupancyRate: 0
                    };
                }
                monthlyData[month].bookings++;
                monthlyData[month].revenue += booking.totalPrice || 0;
            });

            return monthlyData;
        },

        getPricingInsight(predictions) {
            const avgOccupancy = predictions.occupancy.reduce((sum, p) => sum + p.rate, 0) / 
                predictions.occupancy.length;
            
            if (avgOccupancy > 80) return "High demand period detected";
            if (avgOccupancy < 40) return "Low occupancy period ahead";
            return "Stable demand expected";
        },

        getPricingRecommendation(predictions) {
            const avgOccupancy = predictions.occupancy.reduce((sum, p) => sum + p.rate, 0) / 
                predictions.occupancy.length;
            
            if (avgOccupancy > 80) return "Consider implementing dynamic pricing for peak demand";
            if (avgOccupancy < 40) return "Consider promotional rates or package deals";
            return "Maintain current pricing levels";
        },
        calculateAverageFromStats(stats, key) {
            try {
                if (!Array.isArray(stats) || stats.length === 0 || !key) {
                    console.warn('Invalid input for calculateAverageFromStats:', { stats, key });
                    return 0;
                }

                // Filter out entries where the key doesn't exist or isn't a number
                const validStats = stats.filter(stat => 
                    stat && 
                    typeof stat === 'object' && 
                    key in stat && 
                    !isNaN(parseFloat(stat[key]))
                );

                if (validStats.length === 0) {
                    console.warn('No valid stats found for key:', key);
                    return 0;
                }

                const sum = validStats.reduce((acc, stat) => acc + parseFloat(stat[key]), 0);
                return sum / validStats.length;
            } catch (error) {
                console.error('Error calculating average from stats:', error);
                return 0;
            }
        },

        calculateTrendLine(data) {
            try {
                if (!Array.isArray(data) || data.length < 2) {
                    return { slope: 0, intercept: 0 };
                }

                // Simple linear regression
                const n = data.length;
                const xy = data.reduce((sum, d, i) => sum + (i * (d.count || 0)), 0);
                const x = data.reduce((sum, _, i) => sum + i, 0);
                const y = data.reduce((sum, d) => sum + (d.count || 0), 0);
                const x2 = data.reduce((sum, _, i) => sum + (i * i), 0);

                const denominator = (n * x2 - x * x);
                if (denominator === 0) {
                    return { slope: 0, intercept: y / n };
                }

                const slope = (n * xy - x * y) / denominator;
                const intercept = (y - slope * x) / n;

                return { slope, intercept };
            } catch (error) {
                console.error('Error calculating trend line:', error);
                return { slope: 0, intercept: 0 };
            }
        },
    },
    computed: {
        filteredBookings() {
            const query = this.searchQuery.toLowerCase();
            return this.bookings.filter(booking => {
                const guestName = (booking.guestName || '').toLowerCase();
                const roomNumber = (booking.propertyDetails?.roomNumber || '').toLowerCase();
                const roomType = (booking.propertyDetails?.roomType || '').toLowerCase();
                return guestName.includes(query) || 
                       roomNumber.includes(query) ||
                       roomType.includes(query);
            });
        }
    },
    async mounted() {
        await this.checkAuthState();
        
        // Update charts every 5 minutes
        this.updateInterval = setInterval(() => {
            this.updateDashboardStats();
        }, 300000);
    },
    beforeDestroy() {
        if (this.forecastInterval) {
            clearInterval(this.forecastInterval);
        }
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
        if (this.occupancyChart) {
            this.occupancyChart.destroy();
        }
        if (this.roomTypeChart) {
            this.roomTypeChart.destroy();
        }
    }
});
