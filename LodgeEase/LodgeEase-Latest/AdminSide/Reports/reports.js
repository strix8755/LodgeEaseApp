import { auth } from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

// Sample data for charts
const revenueData = {
    labels: ['January', 'February', 'March', 'April'],
    datasets: [{
        label: 'Revenue',
        data: [3000, 5000, 4000, 7000],
        backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)'
        ],
    }]
};

const occupancyData = {
    labels: ['10 AM', '12 PM', '2 PM', '4 PM'],
    datasets: [{
        label: 'Occupancy',
        data: [10, 30, 20, 50],
        backgroundColor: [
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)'
        ],
    }]
};

const guestData = {
    labels: ['Age 18-24', 'Age 25-34', 'Age 35-44', 'Age 45+'],
    datasets: [{
        label: 'Guests',
        data: [40, 35, 25, 10],
        backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)'
        ],
    }]
};

new Vue({
    el: '.app',
    data: {
        isAuthenticated: false,
        loading: true,
        charts: {
            revenue: null,
            occupancy: null,
            guest: null
        }
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
                    this.initializeCharts();
                }
                this.loading = false;
            });
        },

        initializeCharts() {
            // Destroy existing charts if they exist
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.destroy();
            });

            // Initialize Revenue Chart
            const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
            this.charts.revenue = new Chart(ctxRevenue, {
                type: 'bar',
                data: revenueData,
            });

            // Initialize Occupancy Chart
            const ctxOccupancy = document.getElementById('occupancyChart').getContext('2d');
            this.charts.occupancy = new Chart(ctxOccupancy, {
                type: 'line',
                data: occupancyData,
            });

            // Initialize Guest Chart
            const ctxGuest = document.getElementById('guestChart').getContext('2d');
            this.charts.guest = new Chart(ctxGuest, {
                type: 'doughnut',
                data: guestData,
            });
        }
    },
    mounted() {
        this.checkAuthState();
    }
});
