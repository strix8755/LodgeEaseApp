// Import Firebase modules
import { db, auth } from '../firebase.js';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, Timestamp, where, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
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
        forecastInterval: null,
        // Remove this line
        // baguioWebChart: null,
        // Add new data properties for revenue and occupancy
        revenueViewMode: 'monthly',
        occupancyViewMode: 'monthly',
        revenueData: {
            monthly: [],
            byRoomType: {},
            byPaymentMethod: {},
            growth: [],
            forecast: [],
            metrics: {
                totalRevenue: 0,
                averageRevenue: 0,
                peakMonth: '',
                lowestMonth: '',
                yearOverYearGrowth: 0
            }
        },
        occupancyData: {
            monthly: [],
            byRoomType: {},
            byWeekday: [],
            forecast: [],
            metrics: {
                averageOccupancy: 0,
                peakOccupancy: 0,
                lowOccupancy: 100,
                stabilityIndex: 0
            }
        },
        showingChartInfo: false,
        chartInfoTitle: '',
        chartInfoText: '',
        chartInfo: {
            revenue: {
                title: 'Revenue Analysis Chart',
                text: 'This chart displays the historical and predicted revenue trends. The blue line shows actual revenue, while the orange dashed line shows predicted future revenue. The chart helps identify seasonal patterns, growth trends, and potential future earnings based on historical data and AI predictions.'
            },
            occupancy: {
                title: 'Occupancy Analysis Chart',
                text: 'The occupancy chart shows room occupancy rates over time. It displays actual occupancy (red line), predicted occupancy (green dashed line), and target occupancy rate (purple dashed line). This helps track capacity utilization and forecast future demand patterns.'
            },
            bookings: {
                title: 'Booking Trends Chart',
                text: 'This chart combines bar and line representations to show booking patterns. The bars represent actual bookings, while the lines show predictions and historical comparisons. It helps identify peak booking periods and seasonal trends in guest reservations.'
            },
            rooms: {
                title: 'Room Distribution Chart',
                text: 'The doughnut chart shows the distribution of room types and their relative occupancy. Each segment represents a different room type, with the size indicating the proportion of rooms. Hover over segments to see detailed statistics including revenue generation per room type.'
            }
        },
        showingExplanation: false,
        explanationTitle: '',
        explanationText: '',
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
                
                // Create default data structure for each chart
                const defaultChartData = {
                    labels: [],
                    datasets: [{
                        label: 'No Data',
                        data: [],
                        borderColor: 'rgba(200, 200, 200, 1)',
                        backgroundColor: 'rgba(200, 200, 200, 0.2)'
                    }]
                };

                // Update charts with data validation
                if (this.revenueChart) {
                    this.updateChart(this.revenueChart, data.revenueData || defaultChartData);
                }
                if (this.occupancyChart) {
                    this.updateChart(this.occupancyChart, data.occupancyData || defaultChartData);
                }
                if (this.roomTypeChart) {
                    this.updateChart(this.roomTypeChart, data.roomTypeData || defaultChartData);
                }
                if (this.bookingTrendChart) {
                    this.updateChart(this.bookingTrendChart, data.bookingTrends || defaultChartData);
                }
                
                // Update other stats with null checks
                this.stats = {
                    totalBookings: data.metrics?.totalBookings ?? 0,
                    currentMonthRevenue: this.formatCurrency(data.metrics.currentMonthRevenue),
                    occupancyRate: data.metrics?.occupancyRate ?? 0,
                    averageStayDuration: `${data.metrics.averageStayDuration} days`
                };
                
                this.todayCheckIns = data.todayCheckIns ?? 0;
                this.availableRooms = data.availableRooms ?? 0;
                this.occupiedRooms = data.occupiedRooms ?? 0;
                
            } catch (error) {
                console.error('Error updating dashboard:', error);
            }
        },

        updateChart(chart, newData) {
            if (!chart) {
                console.warn('Chart instance is missing');
                return;
            }
            
            try {
                // Ensure newData has the correct structure
                const defaultData = {
                    labels: [],
                    datasets: [{
                        label: 'No Data',
                        data: [],
                        borderColor: 'rgba(200, 200, 200, 1)',
                        backgroundColor: 'rgba(200, 200, 200, 0.2)'
                    }]
                };

                // Merge provided data with defaults
                const chartData = {
                    labels: newData?.labels || defaultData.labels,
                    datasets: newData?.datasets || defaultData.datasets
                };

                // Ensure each dataset has required properties
                chartData.datasets = chartData.datasets.map(dataset => ({
                    label: dataset.label || 'Unnamed Dataset',
                    data: Array.isArray(dataset.data) ? dataset.data : [],
                    borderColor: dataset.borderColor || 'rgba(200, 200, 200, 1)',
                    backgroundColor: dataset.backgroundColor || 'rgba(200, 200, 200, 0.2)',
                    borderDash: dataset.borderDash || [],
                    tension: 0.4,
                    fill: dataset.fill !== undefined ? dataset.fill : true
                }));

                // Update chart data
                chart.data.labels = chartData.labels;
                chart.data.datasets = chartData.datasets;

                // Update chart options
                if (!chart.options.plugins) {
                    chart.options.plugins = {};
                }

                if (!chart.options.plugins.tooltip) {
                    chart.options.plugins.tooltip = {};
                }

                chart.options.plugins.tooltip.callbacks = {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.raw;
                        
                        if (value === null || value === undefined) return null;
                        
                        if (label.toLowerCase().includes('revenue')) {
                            return `${label}: ${new Intl.NumberFormat('en-PH', {
                                style: 'currency',
                                currency: 'PHP'
                            }).format(value)}`;
                        }
                        
                        if (label.toLowerCase().includes('occupancy')) {
                            return `${label}: ${value.toFixed(1)}%`;
                        }
                        
                        return `${label}: ${value}`;
                    }
                };

                chart.update('none');
                console.log(`Updated chart with ${chartData.datasets.length} datasets`);
            } catch (error) {
                console.error('Error updating chart:', error);
            }
        },

        async initializeCharts() {
            try {
                await this.$nextTick();
                
                const canvasElements = {
                    revenue: document.getElementById('revenueChart'),
                    occupancy: document.getElementById('occupancyChart'),
                    roomType: document.getElementById('roomTypeChart'),
                    bookingTrend: document.getElementById('bookingTrendChart')
                };

                // Verify canvas elements exist
                const missingCanvases = Object.entries(canvasElements)
                    .filter(([name, element]) => !element)
                    .map(([name]) => name);

                if (missingCanvases.length > 0) {
                    console.error('Missing canvas elements:', missingCanvases);
                    throw new Error(`Canvas elements not found: ${missingCanvases.join(', ')}`);
                }

                // Enhanced Revenue Chart
                if (!this.revenueChart && canvasElements.revenue) {
                    this.revenueChart = new Chart(canvasElements.revenue.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: [],
                            datasets: [{
                                label: 'Actual Revenue',
                                data: [],
                                borderColor: 'rgba(54, 162, 235, 1)',
                                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                fill: true,
                                tension: 0.4
                            }, {
                                label: 'Predicted Revenue',
                                data: [],
                                borderColor: 'rgba(255, 159, 64, 1)',
                                backgroundColor: 'rgba(255, 159, 64, 0.1)',
                                borderDash: [5, 5],
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.dataset.label || '';
                                            return `${label}: ${new Intl.NumberFormat('en-PH', {
                                                style: 'currency',
                                                currency: 'PHP'
                                            }).format(context.raw)}`;
                                        },
                                        afterLabel: function(context) {
                                            const actual = context.dataset.data[context.dataIndex];
                                            const otherDataset = context.chart.data.datasets[1 - context.datasetIndex];
                                            const predicted = otherDataset.data[context.dataIndex];
                                            if (actual && predicted) {
                                                const diff = ((actual - predicted) / predicted * 100).toFixed(1);
                                                return `Variance: ${diff}%`;
                                            }
                                            return '';
                                        }
                                    }
                                },
                                legend: {
                                    position: 'top',
                                    labels: {
                                        usePointStyle: true,
                                        padding: 15
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: value => '₱' + value.toLocaleString('en-PH')
                                    }
                                }
                            }
                        }
                    });
                }

                // Enhanced Occupancy Chart
                if (!this.occupancyChart && canvasElements.occupancy) {
                    this.occupancyChart = new Chart(canvasElements.occupancy.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: [],
                            datasets: [{
                                label: 'Actual Occupancy',
                                data: [],
                                borderColor: 'rgba(255, 99, 132, 1)',
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                fill: true,
                                tension: 0.4
                            }, {
                                label: 'Predicted Occupancy',
                                data: [],
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                                borderDash: [5, 5],
                                fill: true,
                                tension: 0.4
                            }, {
                                label: 'Target Rate',
                                data: [],
                                borderColor: 'rgba(153, 102, 255, 1)',
                                borderDash: [3, 3],
                                fill: false
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.dataset.label || '';
                                            return `${label}: ${context.raw.toFixed(1)}%`;
                                        },
                                        afterLabel: function(context) {
                                            if (context.datasetIndex < 2) { // Only for actual and predicted
                                                const actual = context.chart.data.datasets[0].data[context.dataIndex];
                                                const predicted = context.chart.data.datasets[1].data[context.dataIndex];
                                                if (actual && predicted) {
                                                    const diff = (actual - predicted).toFixed(1);
                                                    return `Variance: ${diff}%`;
                                                }
                                            }
                                            return '';
                                        }
                                    }
                                },
                                legend: {
                                    position: 'top',
                                    labels: {
                                        usePointStyle: true,
                                        padding: 15
                                    }
                                }
                            },
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
                }

                // Enhanced Room Type Chart
                if (!this.roomTypeChart && canvasElements.roomType) {
                    this.roomTypeChart = new Chart(canvasElements.roomType.getContext('2d'), {
                        type: 'doughnut',
                        data: {
                            labels: [],
                            datasets: [{
                                data: [],
                                backgroundColor: [
                                    'rgba(54, 162, 235, 0.8)',   // Blue
                                    'rgba(255, 99, 132, 0.8)',   // Pink
                                    'rgba(255, 206, 86, 0.8)',   // Yellow
                                    'rgba(75, 192, 192, 0.8)',   // Teal
                                    'rgba(153, 102, 255, 0.8)',  // Purple
                                    'rgba(255, 159, 64, 0.8)'    // Orange
                                ],
                                borderColor: [
                                    'rgba(54, 162, 235, 1)',
                                    'rgba(255, 99, 132, 1)',
                                    'rgba(255, 206, 86, 1)',
                                    'rgba(75, 192, 192, 1)',
                                    'rgba(153, 102, 255, 1)',
                                    'rgba(255, 159, 64, 1)'
                                ],
                                borderWidth: 2,
                                hoverOffset: 15
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '65%',
                            layout: {
                                padding: 20
                            },
                            plugins: {
                                legend: {
                                    position: 'right',
                                    labels: {
                                        padding: 20,
                                        font: {
                                            size: 13,
                                            family: "'Roboto', sans-serif"
                                        },
                                        generateLabels: (chart) => {
                                            const data = chart.data;
                                            const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
                                            
                                            return data.labels.map((label, index) => {
                                                const value = data.datasets[0].data[index];
                                                const percentage = ((value / total) * 100).toFixed(1);
                                                return {
                                                    text: `${label} (${percentage}%)`,
                                                    fillStyle: data.datasets[0].backgroundColor[index],
                                                    strokeStyle: data.datasets[0].borderColor[index],
                                                    lineWidth: 2,
                                                    hidden: isNaN(value) || value === 0,
                                                    index: index
                                                };
                                            });
                                        }
                                    },
                                    onClick: (evt, legendItem, legend) => {
                                        const index = legendItem.index;
                                        const ci = legend.chart;
                                        ci.toggleDataVisibility(index);
                                        ci.update();
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.label || '';
                                            const value = context.raw || 0;
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = ((value / total) * 100).toFixed(1);
                                            const revenue = context.dataset.revenue?.[context.dataIndex] || 0;
                                            return [
                                                `${label}: ${value} rooms (${percentage}%)`,
                                                `Revenue: ${new Intl.NumberFormat('en-PH', {
                                                    style: 'currency',
                                                    currency: 'PHP'
                                                }).format(revenue)}`
                                            ];
                                        }
                                    },
                                    titleFont: {
                                        size: 14,
                                        family: "'Roboto', sans-serif",
                                        weight: 'bold'
                                    },
                                    bodyFont: {
                                        size: 13,
                                        family: "'Roboto', sans-serif"
                                    },
                                    padding: 12,
                                    boxPadding: 6
                                },
                                datalabels: {
                                    color: '#fff',
                                    font: {
                                        weight: 'bold',
                                        size: 12
                                    },
                                    formatter: (value, ctx) => {
                                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return percentage + '%';
                                    },
                                    display: function(context) {
                                        return context.dataset.data[context.dataIndex] > 0;
                                    }
                                }
                            },
                            animation: {
                                animateRotate: true,
                                animateScale: true,
                                duration: 1000
                            },
                            elements: {
                                arc: {
                                    borderWidth: 2
                                }
                            }
                        }
                    });
                }

                // Enhanced Booking Trend Chart
                if (!this.bookingTrendChart && canvasElements.bookingTrend) {
                    this.bookingTrendChart = new Chart(canvasElements.bookingTrend.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: [],
                            datasets: [{
                                label: 'Actual Bookings',
                                type: 'bar',
                                data: [],
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1,
                                order: 2
                            }, {
                                label: 'Predicted Bookings',
                                type: 'line',
                                data: [],
                                borderColor: 'rgba(255, 159, 64, 1)',
                                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.4,
                                order: 1
                            }, {
                                label: 'Previous Period',
                                type: 'line',
                                data: [],
                                borderColor: 'rgba(153, 102, 255, 1)',
                                borderWidth: 1,
                                borderDash: [3, 3],
                                fill: false,
                                tension: 0.4,
                                order: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.dataset.label || '';
                                            return `${label}: ${context.raw} bookings`;
                                        },
                                        afterLabel: function(context) {
                                            const labels = [];
                                            if (context.datasetIndex < 2) {
                                                const actual = context.chart.data.datasets[0].data[context.dataIndex];
                                                const predicted = context.chart.data.datasets[1].data[context.dataIndex];
                                                if (actual && predicted) {
                                                    const variance = ((actual - predicted) / predicted * 100).toFixed(1);
                                                    labels.push(`Variance: ${variance}%`);
                                                }
                                            }
                                            const revenue = context.dataset.revenue?.[context.dataIndex];
                                            if (revenue) {
                                                labels.push(`Revenue: ₱${revenue.toLocaleString('en-PH')}`);
                                            }
                                            return labels;
                                        }
                                    }
                                },
                                legend: {
                                    position: 'top',
                                    labels: {
                                        usePointStyle: true,
                                        padding: 15
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    },
                                    title: {
                                        display: true,
                                        text: 'Number of Bookings'
                                    }
                                }
                            }
                        }
                    });
                }

                await this.updateDashboardStats();
                console.log('Charts initialized successfully');

            } catch (error) {
                console.error('Error initializing charts:', error);
            }
        },

        // Remove the updateBaguioWebChart method
        // async updateBaguioWebChart() { ... },

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

                // Update revenue chart
                if (this.revenueChart) {
                    const actualRevenue = predictions.revenue.slice(0, -3).map(p => p.amount);  // Last 3 months actual
                    const predictedRevenue = predictions.revenue.slice(-3).map(p => p.amount);  // Next 3 months predicted
                    
                    const revenueData = {
                        labels: dates,
                        datasets: [{
                            label: 'Actual Revenue',
                            data: [...actualRevenue, ...Array(3).fill(null)],  // Pad with nulls for future months
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            fill: true
                        }, {
                            label: 'Predicted Revenue',
                            data: [...Array(actualRevenue.length).fill(null), ...predictedRevenue],  // Pad with nulls for past months
                            borderColor: 'rgba(255, 159, 64, 1)',
                            backgroundColor: 'rgba(255, 159, 64, 0.2)',
                            borderDash: [5, 5],
                            fill: true
                        }]
                    };
                    this.updateChart(this.revenueChart, revenueData);
                }

                // Update occupancy chart
                if (this.occupancyChart) {
                    const actualOccupancy = predictions.occupancy.slice(0, -3).map(p => p.rate);
                    const predictedOccupancy = predictions.occupancy.slice(-3).map(p => p.rate);
                    
                    const occupancyData = {
                        labels: dates,
                        datasets: [{
                            label: 'Actual Occupancy',
                            data: [...actualOccupancy, ...Array(3).fill(null)],
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            fill: true
                        }, {
                            label: 'Predicted Occupancy',
                            data: [...Array(actualOccupancy.length).fill(null), ...predictedOccupancy],
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderDash: [5, 5],
                            fill: true
                        }, {
                            label: 'Target Rate',
                            data: Array(dates.length).fill(75),  // Example target rate of 75%
                            borderColor: 'rgba(153, 102, 255, 1)',
                            borderDash: [3, 3],
                            fill: false
                        }]
                    };
                    this.updateChart(this.occupancyChart, occupancyData);
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
        // Add formatCurrency method
        formatCurrency(amount) {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP'
            }).format(amount);
        },
        showChartInfo(chartType) {
            this.chartInfoTitle = this.chartInfo[chartType].title;
            this.chartInfoText = this.chartInfo[chartType].text;
            this.showingChartInfo = true;
        },
        
        closeChartInfo() {
            this.showingChartInfo = false;
            this.chartInfoTitle = '';
            this.chartInfoText = '';
        },
        async explainChartContent(chartType) {
            try {
                let explanation = '';
                let title = '';

                switch (chartType) {
                    case 'revenue':
                        const revenueData = this.revenueChart.data;
                        const totalRevenue = revenueData.datasets[0].data.reduce((a, b) => a + (b || 0), 0);
                        const avgRevenue = totalRevenue / revenueData.datasets[0].data.filter(d => d !== null).length;
                        const growth = this.calculateGrowth(revenueData.datasets[0].data);
                        
                        title = 'Revenue Analysis Explanation';
                        explanation = `
                            <ul>
                                <li><span class="highlight">Total Revenue:</span> ${this.formatCurrency(totalRevenue)}</li>
                                <li><span class="highlight">Average Monthly Revenue:</span> ${this.formatCurrency(avgRevenue)}</li>
                                <li><span class="highlight">Growth Trend:</span> ${growth.toFixed(1)}% ${growth > 0 ? '📈' : '📉'}</li>
                                <li><span class="highlight">Peak Month:</span> ${this.findPeakMonth(revenueData)}</li>
                            </ul>
                            <p>The blue line shows actual revenue, while the orange dashed line shows predicted future revenue.
                            ${this.generateRevenueInsight(growth)}</p>
                        `;
                        break;

                    case 'occupancy':
                        const occupancyData = this.occupancyChart.data;
                        const avgOccupancy = this.calculateAverage(occupancyData.datasets[0].data);
                        const trend = this.calculateGrowth(occupancyData.datasets[0].data);
                        
                        title = 'Occupancy Analysis Explanation';
                        explanation = `
                            <ul>
                                <li><span class="highlight">Current Occupancy Rate:</span> ${this.occupiedRooms}/${this.availableRooms + this.occupiedRooms} rooms (${((this.occupiedRooms / (this.availableRooms + this.occupiedRooms)) * 100).toFixed(1)}%)</li>
                                <li><span class="highlight">Average Occupancy:</span> ${avgOccupancy.toFixed(1)}%</li>
                                <li><span class="highlight">Trend:</span> ${trend.toFixed(1)}% ${trend > 0 ? '📈' : '📉'}</li>
                            </ul>
                            <p>${this.generateOccupancyInsight(avgOccupancy, trend)}</p>
                        `;
                        break;

                    case 'bookings':
                        const bookingData = this.bookingTrendChart.data;
                        const totalBookings = bookingData.datasets[0].data.reduce((a, b) => a + (b || 0), 0);
                        
                        title = 'Booking Trends Explanation';
                        explanation = `
                            <ul>
                                <li><span class="highlight">Total Bookings:</span> ${totalBookings}</li>
                                <li><span class="highlight">Average Monthly Bookings:</span> ${Math.round(totalBookings / 12)}</li>
                                <li><span class="highlight">Peak Booking Period:</span> ${this.findPeakMonth(bookingData)}</li>
                            </ul>
                            <p>${this.generateBookingInsight(bookingData)}</p>
                        `;
                        break;

                    case 'rooms':
                        const roomData = this.roomTypeChart.data;
                        const totalRooms = roomData.datasets[0].data.reduce((a, b) => a + b, 0);
                        
                        title = 'Room Distribution Explanation';
                        explanation = `
                            <ul>
                                ${this.generateRoomTypeBreakdown(roomData)}
                            </ul>
                            <p>${this.generateRoomDistributionInsight(roomData)}</p>
                        `;
                        break;
                }

                this.explanationTitle = title;
                this.explanationText = explanation;
                this.showingExplanation = true;
            } catch (error) {
                console.error('Error generating chart explanation:', error);
                alert('Error generating explanation. Please try again.');
            }
        },

        closeExplanation() {
            this.showingExplanation = false;
            this.explanationTitle = '';
            this.explanationText = '';
        },

        calculateGrowth(data) {
            const validData = data.filter(d => d !== null);
            if (validData.length < 2) return 0;
            const first = validData[0];
            const last = validData[validData.length - 1];
            return ((last - first) / first) * 100;
        },

        calculateAverage(data) {
            const validData = data.filter(d => d !== null);
            return validData.reduce((a, b) => a + b, 0) / validData.length;
        },

        findPeakMonth(data) {
            const maxValue = Math.max(...data.datasets[0].data.filter(d => d !== null));
            const peakIndex = data.datasets[0].data.indexOf(maxValue);
            return data.labels[peakIndex];
        },

        generateRevenueInsight(growth) {
            if (growth > 15) return "The revenue shows strong positive growth, suggesting effective pricing and occupancy strategies.";
            if (growth > 0) return "Revenue is growing steadily, indicating stable business performance.";
            if (growth > -10) return "Revenue shows slight decline, consider reviewing pricing strategies.";
            return "Revenue is declining significantly, immediate action may be required.";
        },

        generateOccupancyInsight(average, trend) {
            let insight = `Current occupancy patterns show ${average > 70 ? 'healthy' : 'moderate'} utilization. `;
            if (trend > 0) {
                insight += "Occupancy is trending upward, suggesting increasing demand.";
            } else {
                insight += "Consider promotional strategies to improve occupancy rates.";
            }
            return insight;
        },

        generateBookingInsight(data) {
            const recent = data.datasets[0].data.slice(-3);
            const trend = this.calculateGrowth(recent);
            
            if (trend > 10) return "Recent booking activity shows strong growth, suggesting increasing market demand.";
            if (trend > 0) return "Booking patterns are stable with slight positive momentum.";
            return "Booking activity has decreased recently, consider marketing initiatives.";
        },

        generateRoomTypeBreakdown(data) {
            const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
            return data.labels.map((label, index) => {
                const count = data.datasets[0].data[index];
                const percentage = ((count / total) * 100).toFixed(1);
                const revenue = data.datasets[0].revenue?.[index] || 0;
                return `<li><span class="highlight">${label}:</span> ${count} rooms (${percentage}%) - Revenue: ${this.formatCurrency(revenue)}</li>`;
            }).join('');
        },

        generateRoomDistributionInsight(data) {
            const mostPopular = data.labels[data.datasets[0].data.indexOf(Math.max(...data.datasets[0].data))];
            const revenue = data.datasets[0].revenue || [];
            const highestRevenue = data.labels[revenue.indexOf(Math.max(...revenue))];
            
            return `${mostPopular} rooms have the highest count, while ${highestRevenue} rooms generate the most revenue.`;
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
    watch: {
        // Add watchers for view mode changes
        revenueViewMode(newMode) {
            this.updateRevenueChart(newMode);
        },
        occupancyViewMode(newMode) {
            this.updateOccupancyChart(newMode);
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
