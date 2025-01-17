// Import Firebase modules
import { db, auth } from '../firebase.js';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, Timestamp, where, addDoc } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

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
        analyticsChart: null,
        revenueChart: null,
        forecastData: {
            occupancyPrediction: [],
            revenueForecast: [],
            demandTrends: [],
            seasonalityPatterns: []
        },
        aiInsights: []
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

        checkAuthState() {
            auth.onAuthStateChanged(user => {
                this.isAuthenticated = !!user;
                if (!user) {
                    window.location.href = '../Login/index.html';
                } else {
                    this.fetchBookings(); // Fetch bookings when user is authenticated
                }
                this.loading = false;
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
                const bookingsRef = collection(db, 'bookings');
                const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(5));
                const querySnapshot = await getDocs(q);
                
                this.bookings = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log('Raw booking data:', data);
                    
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
                        totalPrice: data.totalPrice || 0
                    };

                    console.log('Processed booking:', booking);
                    return booking;
                });

                console.log('All processed bookings:', this.bookings);
                this.updateDashboardStats();

                // After fetching bookings, generate forecasts
                await this.generateAIForecasts();
                
                // Set up interval for forecast updates
                if (!this.forecastInterval) {
                    this.forecastInterval = setInterval(() => this.generateAIForecasts(), 21600000);
                }
            } catch (error) {
                console.error('Error fetching bookings:', error);
                alert('Error fetching bookings. Please try again.');
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

        updateDashboardStats() {
            const today = new Date().toDateString();
            
            this.todayCheckIns = this.bookings.filter(booking => {
                try {
                    return booking.checkIn?.toDate().toDateString() === today;
                } catch (error) {
                    return false;
                }
            }).length;

            this.occupiedRooms = this.bookings.filter(booking => 
                booking.status === 'occupied'
            ).length;

            this.availableRooms = 10 - this.occupiedRooms;

            this.totalRevenue = this.bookings.reduce((total, booking) => {
                return total + (booking.totalPrice || 0);
            }, 0);
        },

        async initializeCharts() {
            try {
                const analyticsCtx = document.getElementById('analyticsChart');
                const revenueCtx = document.getElementById('revenueChart');

                if (!analyticsCtx || !revenueCtx) {
                    console.error('Chart canvas elements not found');
                    return false;
                }

                // Clean up existing charts
                if (this.analyticsChart) {
                    this.analyticsChart.destroy();
                    this.analyticsChart = null;
                }
                if (this.revenueChart) {
                    this.revenueChart.destroy();
                    this.revenueChart = null;
                }

                // Generate initial labels and data
                const labels = [];
                const occupancyData = [];
                const revenueData = [];
                const predictedOccupancy = [];
                const predictedRevenue = [];

                // Generate data for the last 6 months
                for (let i = 5; i >= 0; i--) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    labels.push(this.formatDateForChart(date));
                    
                    // Generate sample data (replace with real data later)
                    const baseOccupancy = 65 + Math.random() * 20;
                    const baseRevenue = 12000 + Math.random() * 8000;
                    
                    occupancyData.push(Math.round(baseOccupancy));
                    predictedOccupancy.push(Math.round(baseOccupancy * 1.1));
                    revenueData.push(Math.round(baseRevenue));
                    predictedRevenue.push(Math.round(baseRevenue * 1.1));
                }

                const commonOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                display: false
                            },
                            ticks: {
                                autoSkip: false,
                                maxRotation: 45,
                                color: '#666',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                borderDash: [2, 4],
                                color: '#e0e0e0'
                            },
                            ticks: {
                                color: '#666',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                padding: 20,
                                boxWidth: 30,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    }
                };

                // Create Analytics Chart
                this.analyticsChart = new Chart(analyticsCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Actual Occupancy',
                                data: occupancyData,
                                borderColor: 'rgb(75, 192, 192)',
                                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'Predicted Occupancy',
                                data: predictedOccupancy,
                                borderColor: 'rgb(255, 99, 132)',
                                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                                borderDash: [5, 5],
                                tension: 0.4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        ...commonOptions,
                        plugins: {
                            ...commonOptions.plugins,
                            title: {
                                display: true,
                                text: 'Occupancy Forecast',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            ...commonOptions.scales,
                            y: {
                                ...commonOptions.scales.y,
                                title: {
                                    display: true,
                                    text: 'Occupancy Rate (%)'
                                },
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            }
                        }
                    }
                });

                // Create Revenue Chart
                this.revenueChart = new Chart(revenueCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Actual Revenue',
                                data: revenueData,
                                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                                borderColor: 'rgb(75, 192, 192)',
                                borderWidth: 1
                            },
                            {
                                label: 'Predicted Revenue',
                                data: predictedRevenue,
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        ...commonOptions,
                        plugins: {
                            ...commonOptions.plugins,
                            title: {
                                display: true,
                                text: 'Revenue Forecast',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            ...commonOptions.scales,
                            y: {
                                ...commonOptions.scales.y,
                                title: {
                                    display: true,
                                    text: 'Revenue (PHP)'
                                },
                                ticks: {
                                    callback: function(value) {
                                        return '₱' + value.toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });

                return true;
            } catch (error) {
                console.error('Error initializing charts:', error);
                return false;
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

        calculateTrendLine(data) {
            // Simple linear regression
            const n = data.length;
            const xy = data.reduce((sum, d, i) => sum + (i * d.count), 0);
            const x = data.reduce((sum, _, i) => sum + i, 0);
            const y = data.reduce((sum, d) => sum + d.count, 0);
            const x2 = data.reduce((sum, _, i) => sum + (i * i), 0);

            const slope = (n * xy - x * y) / (n * x2 - x * x);
            const intercept = (y - slope * x) / n;

            return { slope, intercept };
        },

        calculateAverageFromStats(stats, key) {
            return stats.reduce((sum, stat) => sum + stat[key], 0) / stats.length;
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
                    const seasonalFactor = seasonalTrends.find(s => s.month === month)?.seasonalIndex || 1;
                    const trendImpact = bookingPatterns.trendLine.slope * i + bookingPatterns.trendLine.intercept;

                    // Predict occupancy
                    const predictedOccupancy = Math.min(
                        100,
                        Math.max(
                            0,
                            bookingPatterns.averageOccupancy * seasonalFactor * (1 + trendImpact)
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
            // Implement your prediction algorithm here
            // This is a simplified example
            const baseOccupancy = demand.averageOccupancy;
            const seasonalFactor = this.getSeasonalFactor(date, seasonal);
            const trendFactor = this.getTrendFactor(patterns);
            
            return baseOccupancy * seasonalFactor * trendFactor;
        },

        calculatePredictedRevenue(occupancy, demand) {
            // Implement your revenue prediction algorithm here
            const averageRoomRate = 5000; // Example rate
            return occupancy * averageRoomRate;
        },

        calculateTrend(values) {
            const n = values.length;
            if (n < 2) return 0;
            return (values[n - 1] - values[0]) / values[0] * 100;
        },

        getOccupancyRecommendation(trend) {
            if (trend > 10) return "Consider increasing rates during peak periods";
            if (trend < -10) return "Consider promotional offers to boost bookings";
            return "Maintain current pricing strategy";
        },

        getRevenueRecommendation(trend) {
            if (trend > 10) return "Focus on maintaining service quality to support premium pricing";
            if (trend < -10) return "Review pricing strategy and consider package deals";
            return "Continue current revenue management approach";
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
                    monthlyData[month] = { bookings: 0, revenue: 0 };
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

        getSeasonalFactor(date, seasonal) {
            const month = date.getMonth();
            const seasonalData = seasonal.find(s => s.month === month);
            return seasonalData ? seasonalData.seasonalIndex : 1;
        },

        getTrendFactor(patterns) {
            return patterns.trendLine.slope > 0 ? 1 + patterns.trendLine.slope : 1;
        },

        // Add the updateChartsWithPredictions function
        updateChartsWithPredictions(predictions) {
            try {
                if (!predictions || !predictions.occupancy || !predictions.revenue) {
                    console.error('Invalid predictions data');
                    return;
                }

                // Only update data, not the entire chart configuration
                if (this.analyticsChart && this.revenueChart) {
                    console.log('Raw predictions data:', predictions); // Debug log

                    // Format dates for x-axis
                    const dates = predictions.occupancy.map(p => {
                        if (!p.date) {
                            console.warn('Missing date in prediction:', p);
                            return null;
                        }
                        return this.formatDateForChart(p.date);
                    }).filter(date => date !== 'Invalid Date' && date !== null);

                    console.log('Formatted dates:', dates); // Debug log

                    if (dates.length > 0) {
                        // Update chart data
                        const occupancyData = predictions.occupancy.map(p => p.rate || 0);
                        const revenueData = predictions.revenue.map(p => p.amount || 0);

                        // Update Analytics Chart
                        this.analyticsChart.data.labels = dates;
                        this.analyticsChart.data.datasets[0].data = occupancyData;
                        this.analyticsChart.data.datasets[1].data = occupancyData.map(rate => rate * 1.1);

                        // Update Revenue Chart
                        this.revenueChart.data.labels = dates;
                        this.revenueChart.data.datasets[0].data = revenueData;
                        this.revenueChart.data.datasets[1].data = revenueData.map(amount => amount * 1.1);

                        // Update both charts without animation
                        this.analyticsChart.update('none');
                        this.revenueChart.update('none');

                        console.log('Charts updated successfully');
                    } else {
                        console.warn('No valid dates found in predictions');
                    }
                }
            } catch (error) {
                console.error('Error updating charts with predictions:', error);
            }
        }
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
    mounted() {
        this.checkAuthState();
        // Initialize charts only once after DOM is ready
        const initCharts = () => {
            if (document.getElementById('analyticsChart') && document.getElementById('revenueChart')) {
                // Initialize charts with proper error handling
                if (this.initializeCharts()) {
                    console.log('Charts initialized successfully');
                    // Don't generate forecasts here, will be called after data is loaded
                } else {
                    console.error('Failed to initialize charts');
                }
            } else {
                // If elements aren't ready yet, try again in 100ms
                setTimeout(initCharts, 100);
            }
        };

        // Start checking for elements
        this.$nextTick(initCharts);
    },
    beforeDestroy() {
        if (this.forecastInterval) {
            clearInterval(this.forecastInterval);
        }
        if (this.analyticsChart) {
            this.analyticsChart.destroy();
        }
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
    }
});


