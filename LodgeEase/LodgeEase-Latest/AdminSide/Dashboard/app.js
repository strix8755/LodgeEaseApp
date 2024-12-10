// Import Firebase modules and configuration
import { db } from '../../AdminSide/firebase.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

// Vue app for the dashboard
new Vue({
  el: '#app',
  data: {
    todayCheckIns: 0,
    availableRooms: 10,
    occupiedRooms: 0,
    searchQuery: '',
    bookings: [],
    analysisFeedback: ''
  },
  computed: {
    filteredBookings() {
      const query = this.searchQuery.toLowerCase();
      return this.bookings.filter(booking => 
        booking.guestName.toLowerCase().includes(query) ||
        booking.roomNumber.toLowerCase().includes(query)
      );
    }
  },
  methods: {
    async fetchBookings() {
      try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        
        this.bookings = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            roomNumber: data.roomNumber || 'N/A',
            roomType: data.roomType || 'N/A',
            floorLevel: data.floorLevel || 'N/A',
            guestName: data.guestName || 'Guest',
            checkInDate: data.checkIn.toDate().toLocaleDateString(),
            checkOutDate: data.checkOut.toDate().toLocaleDateString(),
            status: data.status || 'pending'
          };
        });

        // Update dashboard stats
        this.updateDashboardStats();
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }
    },

    updateDashboardStats() {
      const today = new Date().toDateString();
      this.todayCheckIns = this.bookings.filter(booking => 
        new Date(booking.checkInDate).toDateString() === today
      ).length;

      this.occupiedRooms = this.bookings.filter(booking => 
        booking.status === 'occupied'
      ).length;

      this.availableRooms = 10 - this.occupiedRooms; // Assuming total rooms is 10
    },

    analyzeData() {
      // Simple analysis based on bookings
      const totalBookings = this.bookings.length;
      const pendingBookings = this.bookings.filter(b => b.status === 'pending').length;
      
      this.analysisFeedback = `
        Total Bookings: ${totalBookings}
        Pending Bookings: ${pendingBookings}
        Available Rooms: ${this.availableRooms}
        Occupancy Rate: ${((this.occupiedRooms / 10) * 100).toFixed(1)}%
      `;
    },

    editRoom(room) {
      // Implement edit functionality
      console.log('Editing room:', room);
    },

    async deleteRoom(roomId) {
      // Implement delete functionality
      console.log('Deleting room:', roomId);
    }
  },
  mounted() {
    this.fetchBookings();
  }
});
