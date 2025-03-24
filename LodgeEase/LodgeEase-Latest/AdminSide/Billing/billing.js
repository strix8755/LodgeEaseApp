import { 
    auth, 
    db, 
    collection, 
    addDoc, 
    Timestamp,
    // ...other imports... 
} from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { PageLogger } from '../js/pageLogger.js';

// Add activity logging function
async function logBillingActivity(actionType, details) {
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
            module: 'Billing'
        });
    } catch (error) {
        console.error('Error logging billing activity:', error);
    }
}

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

        // Add logging to existing methods
        async processPayment() {
            try {
                // ...existing payment processing logic...
                await logBillingActivity('billing_payment', `Processed payment for ${this.customerName}`);
            } catch (error) {
                console.error('Error processing payment:', error);
                await logBillingActivity('billing_error', `Payment processing failed: ${error.message}`);
            }
        },

        async addCharge() {
            try {
                // ...existing charge addition logic...
                await logBillingActivity('billing_charge', `Added charge of ${amount} for ${description}`);
            } catch (error) {
                console.error('Error adding charge:', error);
                await logBillingActivity('billing_error', `Failed to add charge: ${error.message}`);
            }
        },

        async applyDiscount() {
            try {
                // ...existing discount logic...
                await logBillingActivity('billing_discount', `Applied ${discount}% discount`);
            } catch (error) {
                console.error('Error applying discount:', error);
                await logBillingActivity('billing_error', `Failed to apply discount: ${error.message}`);
            }
        }
    },
    mounted() {
        this.checkAuthState();
        // Add event listeners
        document.getElementById('checkIn').addEventListener('change', this.calculateStayCost);
        document.getElementById('checkOut').addEventListener('change', this.calculateStayCost);
        document.getElementById('discount').addEventListener('input', this.calculateTotal);
    }
});

// Initialize page logging through PageLogger
auth.onAuthStateChanged((user) => {
    if (user) {
        PageLogger.logNavigation('Billing');
    }
});

// Common billing operations
function addChargeRow() {
    // ...existing addChargeRow code...
    logBillingActivity('billing_add_item', 'Added new charge row');
}

function calculateTotal() {
    // ...existing calculateTotal code...
    logBillingActivity('billing_calculate', 'Recalculated bill total');
}

// ...rest of the existing code...
