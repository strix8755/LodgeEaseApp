import { 
    auth, 
    db, 
    collection,
    addDoc,
    Timestamp 
} from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { PageLogger } from '../js/pageLogger.js';

// Add activity logging function
async function logReportActivity(actionType, details) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'activityLogs'), {
            userId: user.uid,
            userName: user.email,
            actionType,
            details,
            timestamp: Timestamp.now(),
            userRole: 'admin',
            module: 'Reports'
        });
        console.log(`Logged report activity: ${actionType} - ${details}`);
    } catch (error) {
        console.error('Error logging report activity:', error);
    }
}

new Vue({
    el: '.app',
    data: {
        isAuthenticated: false,
        loading: true,
        bookings: []
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
                    this.fetchBookings();
                }
                this.loading = false;
            });
        },

        async fetchBookings() {
            try {
                const bookingsRef = collection(db, 'bookings');
                const snapshot = await getDocs(bookingsRef);
                this.bookings = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error fetching bookings:', error);
                alert('Error fetching bookings data');
            }
        },

        formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            if (timestamp.toDate) {
                return timestamp.toDate().toLocaleDateString();
            }
            return new Date(timestamp).toLocaleDateString();
        },

        async exportToExcel() {
            try {
                const exportData = this.bookings.map(booking => ({
                    'Booking ID': booking.id,
                    'Guest Name': booking.guestName || 'N/A',
                    'Check In': this.formatDate(booking.checkIn),
                    'Check Out': this.formatDate(booking.checkOut),
                    'Room Type': booking.propertyDetails?.roomType || 'N/A',
                    'Room Number': booking.propertyDetails?.roomNumber || 'N/A',
                    'Total Price': booking.totalPrice || 0,
                    'Status': booking.status || 'N/A'
                }));

                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Bookings');

                const fileName = `bookings_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(wb, fileName);

                await logReportActivity('report_export', 'Exported booking report to Excel');
            } catch (error) {
                console.error('Error exporting data:', error);
                alert('Error exporting data');
                await logReportActivity('report_error', `Failed to export report: ${error.message}`);
            }
        },

        async importData(event) {
            try {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (e) => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    console.log('Imported data:', jsonData);
                    alert('Data imported successfully. Please refresh to see updates.');
                };
                reader.readAsArrayBuffer(file);

                await logReportActivity('report_import', 'Imported data from file');
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Error importing data');
                await logReportActivity('report_error', `Failed to import data: ${error.message}`);
            }
        }
    },
    mounted() {
        this.checkAuthState();
    }
});

// Initialize page logging
auth.onAuthStateChanged((user) => {
    if (user) {
        PageLogger.logNavigation('Reports');
    }
});
