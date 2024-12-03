import { fetchRoomsData } from '../firebase.js';

new Vue({
    el: '#app',
    data: {
        todayCheckIns: 0,
        availableRooms: 0,
        occupiedRooms: 0,
        analysisFeedback: '',
        searchQuery: '',
        bookings: [],
    },
    computed: {
        filteredBookings() {
            if (!this.searchQuery) return this.bookings;
            return this.bookings.filter(booking => {
                const lowerCaseQuery = this.searchQuery.toLowerCase();
                return booking.guestName.toLowerCase().includes(lowerCaseQuery) ||
                       booking.roomNumber.includes(lowerCaseQuery);
            });
        }
    },
    methods: {
        async fetchDashboardData() {
            const rooms = await fetchRoomsData();
            this.availableRooms = rooms.filter(room => room.status === 'available').length;
            this.occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
            this.todayCheckIns = rooms.filter(room => room.checkInDate === new Date().toISOString().split('T')[0]).length;

            // Fetch bookings (if stored in Firestore or another database)
            // Assuming you have a similar function to fetch bookings
            this.bookings = rooms.map(room => ({
                guestName: room.guestName || 'Unknown',
                roomNumber: room.roomNumber,
                checkInDate: room.checkInDate,
                checkOutDate: room.checkOutDate,
                id: room.id
            }));
        },
        analyzeData() {
            this.analysisFeedback = "AI analysis is complete! Suggestion: Optimize room pricing for peak seasons.";
        },
        renderCharts() {
            // Analytics Chart Code
            // Revenue Chart Code
        }
    },
    mounted() {
        this.fetchDashboardData();
        this.renderCharts();
    }
});

import { sendRoomDataToDashboard } from '../Room Management/room_management.js';

async function updateDashboard() {
    const dashboardData = await sendRoomDataToDashboard();
    if (dashboardData) {
        document.getElementById('total-rooms').textContent = dashboardData.totalRooms;
        document.getElementById('available-rooms').textContent = dashboardData.availableRooms;
        document.getElementById('occupied-rooms').textContent = dashboardData.occupiedRooms;

        const recentCheckInsContainer = document.getElementById('recent-checkins');
        dashboardData.recentCheckIns.forEach(checkIn => {
            const row = `<tr>
                <td>${checkIn.roomNumber}</td>
                <td>${checkIn.guest}</td>
                <td>${checkIn.checkIn}</td>
            </tr>`;
            recentCheckInsContainer.innerHTML += row;
        });
    }
}

window.addEventListener('DOMContentLoaded', updateDashboard);

