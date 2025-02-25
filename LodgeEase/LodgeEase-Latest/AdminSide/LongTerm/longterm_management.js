import { db } from '../firebase.js';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, Timestamp, where, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getChartData } from './chartData.js';

// Initialize charts
async function initializeCharts() {
    try {
        const chartData = await getChartData();
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        new Chart(revenueCtx, {
            type: 'line',
            data: chartData.revenue,
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Occupancy Chart
        const occupancyCtx = document.getElementById('occupancyChart').getContext('2d');
        new Chart(occupancyCtx, {
            type: 'line',
            data: chartData.occupancy,
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContent = document.getElementById('mainContent');

        await Promise.all([
            loadTenants(),
            initializeCharts(),
            initializeEventListeners()
        ]);

        // Hide loading screen and show main content
        loadingScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
    } catch (error) {
        console.error('Error initializing page:', error);
        // Show error message to user
        alert('An error occurred while loading the page. Please refresh and try again.');
    }
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
    const searchInput = document.getElementById('searchTenants');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterTenants(searchTerm);
    });

    const paymentButtons = document.querySelectorAll('.record-payment-btn');
    paymentButtons.forEach(btn => {
        btn.addEventListener('click', () => showPaymentModal(btn.dataset.tenantId));
    });
}

// Global event handlers
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

function updateTenantsTable(tenants) {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';
    
    const getAvatarUrl = (avatarPath) => {
        return avatarPath || '../images/default-avatar.png';
    };

    tenants.forEach(tenant => {
        const row = `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <img class="h-10 w-10 rounded-full user-avatar" 
                                 src="${getAvatarUrl(tenant.avatar)}" 
                                 alt="User avatar"
                                 onerror="this.src='../images/default-avatar.png'">
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${tenant.name}</div>
                            <div class="text-sm text-gray-500">${tenant.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">Room ${tenant.roomNumber}</div>
                    <div class="text-sm text-gray-500">${tenant.roomType}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${tenant.contractPeriod}</div>
                    <div class="text-sm text-gray-500">${tenant.duration}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">₱${tenant.monthlyRent}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${tenant.paymentStatus}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${tenant.dueDate}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3" title="View Details" onclick="viewTenantDetails('${tenant.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-green-600 hover:text-green-900 mr-3 record-payment-btn" 
                            title="Record Payment" 
                            data-tenant-id="${tenant.id}"
                            onclick="showPaymentModal('${tenant.id}')">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900" title="Terminate Contract" onclick="terminateContract('${tenant.id}')">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function updateStatistics(tenants) {
    // ...existing code...
}

// Modal event listeners
const modal = document.getElementById('paymentModal');
const paymentForm = document.getElementById('paymentForm');

document.querySelectorAll('.record-payment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });
});

document.querySelector('#paymentModal button[type="button"]').addEventListener('click', () => {
    modal.classList.add('hidden');
});

paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Add payment processing logic here
    modal.classList.add('hidden');
});

function filterTenants(searchTerm) {
    // Implement search functionality
    console.log('Filtering tenants with term:', searchTerm);
}