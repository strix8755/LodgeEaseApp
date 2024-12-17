import { auth } from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

new Vue({
    el: '#app',
    data: {
        // ... existing data ...
        isAuthenticated: false,
        loading: true,
        baseRate: 5.49,
        stayCost: 0
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
                }
                this.loading = false;
            });
        },

        // ... convert existing functions to methods ...
    },
    mounted() {
        this.checkAuthState();
        // Add event listeners
        document.getElementById('checkIn').addEventListener('change', this.calculateStayCost);
        document.getElementById('checkOut').addEventListener('change', this.calculateStayCost);
        document.getElementById('discount').addEventListener('input', this.calculateTotal);
    }
});
