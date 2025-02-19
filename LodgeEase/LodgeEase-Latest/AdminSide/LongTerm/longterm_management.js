import { db, auth } from '../firebase.js';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, Timestamp, where, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getChartData } from './chartData.js';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadTenants();
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing page:', error);
    }
});

async function loadTenants() {
    try {
        const tenantsRef = collection(db, 'tenants');
        const q = query(tenantsRef, where('isLongTerm', '==', true));
        const querySnapshot = await getDocs(q);
        
        const tenants = [];
        querySnapshot.forEach((doc) => {
            tenants.push({ id: doc.id, ...doc.data() });
        });

        updateTenantsTable(tenants);
        updateStatistics(tenants);
    } catch (error) {
        console.error('Error loading tenants:', error);
    }
}

// Add global function declarations for event handlers
window.viewTenantDetails = function(tenantId) {
    console.log('Viewing details for tenant:', tenantId);
    // Implement view details functionality
};

window.showPaymentModal = function(tenantId) {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('hidden');
    modal.dataset.tenantId = tenantId;
};

window.terminateContract = function(tenantId) {
    console.log('Terminating contract for tenant:', tenantId);
    // Implement contract termination functionality
};

async function loadTenants() {
    try {
        const tenantsQuery = query(
            collection(db, 'tenants'),
            where('isLongTerm', '==', true)
        );
        
        const querySnapshot = await getDocs(tenantsQuery);
        const tenants = [];
        
        querySnapshot.forEach((doc) => {
            tenants.push({ id: doc.id, ...doc.data() });
        });
        
        updateTenantsTable(tenants);
        updateStatistics(tenants);
    } catch (error) {
        console.error('Error loading tenants:', error);
    }
}

function initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchTenants');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterTenants(searchTerm);
    });

    // Payment modal controls
    const paymentButtons = document.querySelectorAll('.record-payment-btn');
    paymentButtons.forEach(btn => {
        btn.addEventListener('click', () => showPaymentModal(btn.dataset.tenantId));
    });
}