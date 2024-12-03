import { fetchRoomsData } from '../firebase.js';
import { sendRoomDataToDashboard } from '../Room Management/room_management.js';

new Vue({
    el: '#app',
    data: {
        todayCheckIns: 0,
        availableRooms: 0,
        occupiedRooms: 0,
        analysisFeedback: '',
        searchQuery: '',
        bookings: [],
        totalRooms: 0,
        recentCheckIns: [],
    },
    computed: {
        filteredBookings() {
            if (!this.searchQuery) return this.bookings;
            const lowerCaseQuery = this.searchQuery.toLowerCase();
            return this.bookings.filter(booking => 
                booking.guestName.toLowerCase().includes(lowerCaseQuery) || 
                booking.roomNumber.includes(lowerCaseQuery)
            );
        }
    },
    methods: {
        async fetchDashboardData() {
            try {
                const rooms = await fetchRoomsData();
                console.log('Fetched rooms data:', rooms);  // Debugging log

                if (!rooms || rooms.length === 0) return;

                this.availableRooms = rooms.filter(room => room.status === 'available').length;
                this.occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
                this.todayCheckIns = rooms.filter(room => room.checkInDate === new Date().toISOString().split('T')[0]).length;

                this.bookings = rooms.map(room => ({
                    guestName: room.guestName || 'Unknown',
                    roomNumber: room.roomNumber,
                    checkInDate: room.checkInDate,
                    checkOutDate: room.checkOutDate,
                    id: room.id
                }));

            } catch (error) {
                console.error('Error fetching room data:', error);
            }
        },
        analyzeData() {
            this.analysisFeedback = "AI analysis is complete! Suggestion: Optimize room pricing for peak seasons.";
        },
        renderCharts() {
            const ctx1 = document.getElementById('analyticsChart').getContext('2d');
            new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Available', 'Occupied'],
                    datasets: [{
                        label: 'Room Status',
                        data: [this.availableRooms, this.occupiedRooms],
                        backgroundColor: ['green', 'red'],
                    }]
                }
            });

            const ctx2 = document.getElementById('revenueChart').getContext('2d');
            new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: ['Today', 'This Week', 'This Month'],
                    datasets: [{
                        label: 'Revenue',
                        data: [500, 1500, 3000],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        fill: false
                    }]
                }
            });
        },
        async updateDashboard() {
            try {
                const dashboardData = await sendRoomDataToDashboard();
                if (dashboardData) {
                    this.totalRooms = dashboardData.totalRooms;
                    this.availableRooms = dashboardData.availableRooms;
                    this.occupiedRooms = dashboardData.occupiedRooms;
                    this.recentCheckIns = dashboardData.recentCheckIns;
                    this.updateDashboardUI(dashboardData);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        },
        updateDashboardUI(dashboardData) {
            // Directly update the data properties, and Vue will automatically re-render the DOM
            this.totalRooms = dashboardData.totalRooms;
            this.availableRooms = dashboardData.availableRooms;
            this.occupiedRooms = dashboardData.occupiedRooms;
            this.recentCheckIns = dashboardData.recentCheckIns;  // This will automatically update the table
        }               
    },
    created() {
        this.fetchDashboardData();
        this.renderCharts();
    }
});
