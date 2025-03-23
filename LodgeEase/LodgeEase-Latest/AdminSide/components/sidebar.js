import { auth } from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class Sidebar {
    constructor() {
        this.currentPath = window.location.pathname;
    }

    init() {
        // Set active link
        this.setActiveLink();
        
        // Add logout functionality
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout);
        }
    }

    setActiveLink() {
        // Remove 'active' class from all links
        const links = document.querySelectorAll('.sidebar a');
        links.forEach(link => link.classList.remove('active'));

        // Add 'active' class to current page link
        links.forEach(link => {
            if (this.currentPath.includes(link.getAttribute('href'))) {
                link.classList.add('active');
            }
        });
    }

    async handleLogout() {
        try {
            await signOut(auth);
            window.location.href = '../Login/index.html';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error signing out. Please try again.');
        }
    }

    generateSidebar() {
        return `
        <aside class="sidebar">
            <div class="logo-container">
                <img src="../images/LodgeEaseLogo.png" alt="Lodge Ease Logo" class="logo">
                <h2>Lodge Ease</h2>
            </div>
            <ul>
                <li><a href="../Dashboard/Dashboard.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
                <li><a href="../Room Management/room_management.html"><i class="fas fa-bed"></i> Room Management</a></li>
                <li><a href="../Requests/booking_requests.html"><i class="fas fa-clock"></i> Booking Requests</a></li>
                <li><a href="../Billing/billing.html"><i class="fas fa-money-bill-wave"></i> Billing</a></li>
                <li><a href="../Reports/reports.html"><i class="fas fa-chart-line"></i> Reports</a></li>
                <li><a href="../BusinessAnalytics/business_analytics.html"><i class="fas fa-chart-pie"></i> Business Analytics</a></li>
                <li><a href="../ActivityLog/activity_log.html"><i class="fas fa-history"></i> Activity Log</a></li>
                <li><a href="../Settings/settings.html"><i class="fas fa-cog"></i> Settings</a></li>
                <li><a href="../LongTerm/longterm_management.html"><i class="fas fa-home"></i> Long-term Stays</a></li>
                <li><a href="../AInalysis/AInalysis.html"><i class="fas fa-robot"></i> ChatBot</a></li>
            </ul>
            
            <div class="auth-buttons">
                <button class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> 
                    <span>Logout</span>
                </button>
            </div>
        </aside>
        `;
    }
}
