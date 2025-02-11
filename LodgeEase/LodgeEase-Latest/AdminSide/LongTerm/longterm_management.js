import { db } from '../firebase.js';
import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', () => {
    loadTenants();
    initializeEventListeners();
});

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