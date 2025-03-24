import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configure Vue for production
Vue.config.productionTip = false;

new Vue({
    el: '#app',
    data: {
        hotelInfo: {
            name: 'Lodge Ease Hotel',
            address: '123 Main Street, City, Country',
            phone: '+1 234 567 8900',
            email: 'contact@lodgeease.com'
        },
        systemSettings: {
            checkInTime: '14:00',
            checkOutTime: '11:00',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            language: 'English',
            preferLongTerm: false
        },
        notifications: {
            emailAlerts: true,
            smsAlerts: false,
            bookingConfirmations: true,
            paymentAlerts: true,
        },
        security: {
            passwordExpiry: 90,
            twoFactorAuth: false,
            loginAlerts: true
        },
        userProfile: {
            fullname: '',
            email: '',
            username: '',
            role: '',
            photoURL: null
        },
        passwords: {
            current: '',
            new: '',
            confirm: ''
        },
        showPassword: {
            current: false,
            new: false,
            confirm: false
        },
        loading: false,
        activeSessions: [],
        showSuccessMessage: false,
        settingsModified: false,
        isAuthenticated: false,
    },

    computed: {
        isPasswordValid() {
            return this.passwords.current && 
                   this.passwords.new && 
                   this.passwords.confirm && 
                   this.passwords.new === this.passwords.confirm &&
                   this.passwords.new.length >= 8;
        },
        passwordStrength() {
            const password = this.passwords.new;
            if (!password) return '';
            if (password.length < 8) return 'weak';
            if (/[A-Z]/.test(password) && 
                /[a-z]/.test(password) && 
                /[0-9]/.test(password) && 
                /[^A-Za-z0-9]/.test(password)) {
                return 'strong';
            }
            return 'medium';
        },
        passwordStrengthText() {
            switch (this.passwordStrength) {
                case 'strong': return 'Strong';
                case 'medium': return 'Medium';
                case 'weak': return 'Weak';
                default: return '';
            }
        }
    },
    watch: {
        hotelInfo: {
            handler() {
                this.settingsModified = true;
            },
            deep: true
        },
        systemSettings: {
            handler() {
                this.settingsModified = true;
            },
            deep: true
        },
        notifications: {
            handler() {
                this.settingsModified = true;
            },
            deep: true
        },
        security: {
            handler() {
                this.settingsModified = true;
            },
            deep: true
        }
    },
    methods: {
        togglePasswordVisibility(field) {
            this.showPassword[field] = !this.showPassword[field];
        },
        async saveSettings() {
            try {
                this.loading = true;
                const settings = {
                    hotelInfo: this.hotelInfo,
                    systemSettings: this.systemSettings,
                    notifications: this.notifications,
                    security: this.security
                };

                // Save to localStorage
                localStorage.setItem('lodgeEaseSettings', JSON.stringify(settings));

                // Update sidebar visibility based on preferLongTerm setting
                const sidebarLinks = document.querySelectorAll('.sidebar a');
                sidebarLinks.forEach(link => {
                    if (this.systemSettings.preferLongTerm) {
                        if (link.textContent.includes('Room Management')) {
                            link.parentElement.style.display = 'none';
                        }
                        if (link.textContent.includes('Long-term Stays')) {
                            link.parentElement.style.display = 'block';
                        }
                    } else {
                        if (link.textContent.includes('Room Management')) {
                            link.parentElement.style.display = 'block';
                        }
                        if (link.textContent.includes('Long-term Stays')) {
                            link.parentElement.style.display = 'none';
                        }
                    }
                });

                this.showSuccessAlert();
                this.settingsModified = false;
            } catch (error) {
                console.error('Error saving settings:', error);
                this.showErrorAlert();
            } finally {
                this.loading = false;
            }
        },
        
        async handleLogout() {
            try {
                await signOut(auth);
                window.location.href = '../Login/index.html';
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Error signing out. Please try again.');
            }
        },

        showSuccessAlert() {
            this.showSuccessMessage = true;
            setTimeout(() => {
                this.showSuccessMessage = false;
            }, 3000);
        },

        showErrorAlert() {
            alert('An error occurred while saving settings. Please try again.');
        },

        updateProfilePhoto() {
            alert('Profile photo update functionality will be implemented soon.');
        },

        async changePassword() {
            alert('Password change functionality will be implemented soon.');
        },

        terminateSession(sessionId) {
            // Confirm before terminating
            if (!confirm('Are you sure you want to terminate this session?')) {
                return;
            }
            
            // Filter out the terminated session
            this.activeSessions = this.activeSessions.filter(session => session.id !== sessionId);
            alert('Session terminated successfully.');
        },

        async loadUserProfile() {
            try {
                const user = auth.currentUser;
                if (!user) {
                    console.log('No user signed in');
                    return;
                }

                // Create a proper reference using the string-based path
                const userDocRef = doc(db, 'users', user.uid);
                const userSnapshot = await getDoc(userDocRef);

                if (userSnapshot.exists()) {
                    const userData = userSnapshot.data();
                    this.userProfile = {
                        fullname: userData.fullname || userData.displayName || 'User',
                        email: userData.email || user.email,
                        username: userData.username || user.displayName || 'user',
                        role: userData.role || 'Admin',
                        photoURL: userData.photoURL || user.photoURL
                    };
                    
                    console.log('User profile loaded:', this.userProfile);
                } else {
                    console.log('No user data found');
                    this.userProfile = {
                        fullname: user.displayName || 'User',
                        email: user.email,
                        username: user.displayName || 'user',
                        role: 'Admin',
                        photoURL: user.photoURL
                    };
                }
                
                // Load mock active sessions
                this.loadMockSessions();
            } catch (error) {
                console.error('Error loading user profile:', error);
            }
        },

        loadMockSessions() {
            this.activeSessions = [
                {
                    id: 'current-session',
                    deviceName: 'Current Browser',
                    deviceIcon: 'fas fa-laptop',
                    location: 'Current Location',
                    lastActive: 'Now',
                    isCurrent: true
                },
                {
                    id: 'session-1',
                    deviceName: 'Chrome on Windows',
                    deviceIcon: 'fab fa-chrome',
                    location: 'Manila, Philippines',
                    lastActive: '2 days ago',
                    isCurrent: false
                },
                {
                    id: 'session-2',
                    deviceName: 'Safari on iPhone',
                    deviceIcon: 'fab fa-safari',
                    location: 'Cebu, Philippines',
                    lastActive: '5 days ago',
                    isCurrent: false
                }
            ];
        },

        loadSettings() {
            const savedSettings = localStorage.getItem('lodgeEaseSettings');
            if (savedSettings) {
                try {
                    const settings = JSON.parse(savedSettings);
                    if (settings.hotelInfo) this.hotelInfo = { ...this.hotelInfo, ...settings.hotelInfo };
                    if (settings.systemSettings) this.systemSettings = { ...this.systemSettings, ...settings.systemSettings };
                    if (settings.notifications) this.notifications = { ...this.notifications, ...settings.notifications };
                    if (settings.security) this.security = { ...this.security, ...settings.security };
                    
                    console.log('Settings loaded from localStorage');
                } catch (error) {
                    console.error('Error parsing settings from localStorage:', error);
                }
            }
        }
    },
    mounted() {
        // Check authentication status
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.isAuthenticated = true;
                this.loadUserProfile();
                this.loadSettings();
            } else {
                this.isAuthenticated = false;
                window.location.href = '../Login/index.html';
            }
        });
    },
});