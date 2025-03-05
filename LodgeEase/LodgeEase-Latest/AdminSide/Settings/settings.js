import { auth, db, collection, addDoc, Timestamp, doc, updateDoc } from '../firebase.js';
import { PageLogger } from '../js/pageLogger.js';
import { 
    updatePassword, 
    reauthenticateWithCredential,
    EmailAuthProvider,
    signOut 
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

// Add activity logging function
async function logSettingsActivity(actionType, details) {
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
            module: 'Settings'
        });
    } catch (error) {
        console.error('Error logging settings activity:', error);
    }
}

// Initialize Vue instance
new Vue({
    el: '#app',
    data: {
        // Hotel Information
        hotelInfo: {
            name: 'Lodge Ease Hotel',
            address: '123 Main Street, City, Country',
            phone: '+1 234 567 8900',
            email: 'contact@lodgeease.com'
        },
        
        // System Settings
        systemSettings: {
            checkInTime: '14:00',
            checkOutTime: '11:00',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            language: 'English',
            preferLongTerm: false // Add new setting
        },

        // Notification Settings
        notifications: {
            emailAlerts: true,
            smsAlerts: false,
            bookingConfirmations: true,
            paymentAlerts: true,
        },

        // Security Settings
        security: {
            passwordExpiry: 90,
            twoFactorAuth: false,
            loginAlerts: true
        },

        // New data properties for account settings
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

        // Flag to show success message
        showSuccessMessage: false,

        // Flag to track if settings have been modified
        settingsModified: false,

        isAuthenticated: false,
    },

    computed: {
        isPasswordValid() {
            return this.passwords.new && 
                   this.passwords.new === this.passwords.confirm && 
                   this.passwordStrength !== 'weak';
        },
        passwordStrength() {
            if (!this.passwords.new) return '';
            
            const password = this.passwords.new;
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumbers = /\d/.test(password);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            
            if (password.length < 8) return 'weak';
            if (hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar) return 'strong';
            if ((hasUpperCase || hasLowerCase) && hasNumbers) return 'medium';
            return 'weak';
        },
        passwordStrengthText() {
            const strength = this.passwordStrength;
            if (!strength) return '';
            return {
                weak: 'Weak - Use at least 8 characters with numbers and letters',
                medium: 'Medium - Add special characters for stronger password',
                strong: 'Strong password'
            }[strength];
        }
    },

    // Watch for changes in settings
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

    // Methods for handling settings actions
    methods: {
        // Load settings from localStorage or API
        loadSettings() {
            // Try to load saved settings from localStorage
            const savedSettings = localStorage.getItem('lodgeEaseSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.hotelInfo = { ...this.hotelInfo, ...settings.hotelInfo };
                this.systemSettings = { ...this.systemSettings, ...settings.systemSettings };
                this.notifications = { ...this.notifications, ...settings.notifications };
                this.security = { ...this.security, ...settings.security };
            }

            // In a real application, you might want to load from an API instead:
            // this.loadSettingsFromAPI();
        },

        // Save settings
        async saveSettings() {
            try {
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
                await logSettingsActivity('settings_update', 'Updated system settings');
            } catch (error) {
                console.error('Error saving settings:', error);
                this.showErrorAlert();
                await logSettingsActivity('settings_error', `Failed to save settings: ${error.message}`);
            }
        },

        // Show success alert
        showSuccessAlert() {
            // Create alert element
            const alert = document.createElement('div');
            alert.className = 'analysis-feedback';
            alert.innerHTML = `
                <h4>Success!</h4>
                <p>Your settings have been saved successfully.</p>
            `;

            // Add to document
            document.querySelector('.main-content').appendChild(alert);

            // Remove after 3 seconds
            setTimeout(() => {
                alert.remove();
            }, 3000);
        },

        // Show error alert
        showErrorAlert() {
            // Create alert element
            const alert = document.createElement('div');
            alert.className = 'analysis-feedback';
            alert.style.borderLeft = '5px solid #f94449';
            alert.innerHTML = `
                <h4>Error</h4>
                <p>There was an error saving your settings. Please try again.</p>
            `;

            // Add to document
            document.querySelector('.main-content').appendChild(alert);

            // Remove after 3 seconds
            setTimeout(() => {
                alert.remove();
            }, 3000);
        },

        // Load settings from API (mock function)
        async loadSettingsFromAPI() {
            try {
                // In a real application, this would be an API call
                const response = await fetch('/api/settings');
                const settings = await response.json();
                
                // Update settings
                this.hotelInfo = settings.hotelInfo;
                this.systemSettings = settings.systemSettings;
                this.notifications = settings.notifications;
                this.security = settings.security;
            } catch (error) {
                console.error('Error loading settings:', error);
                this.showErrorAlert();
            }
        },

        // Save settings to API (mock function)
        async saveSettingsToAPI(settings) {
            // In a real application, this would be an API call
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            return await response.json();
        },

        async loadUserProfile() {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const userDoc = await getDoc(doc(db, "admin_users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    this.userProfile = {
                        fullname: userData.fullname,
                        email: user.email,
                        username: userData.username,
                        role: userData.role,
                        photoURL: user.photoURL || null
                    };
                }
            } catch (error) {
                console.error('Error loading user profile:', error);
            }
        },

        togglePasswordVisibility(field) {
            this.showPassword[field] = !this.showPassword[field];
        },

        async changePassword() {
            if (!this.isPasswordValid) return;
            
            this.loading = true;
            try {
                const user = auth.currentUser;
                const credential = EmailAuthProvider.credential(
                    user.email,
                    this.passwords.current
                );

                // Reauthenticate user
                await reauthenticateWithCredential(user, credential);
                
                // Update password
                await updatePassword(user, this.passwords.new);
                
                // Reset form
                this.passwords = { current: '', new: '', confirm: '' };
                alert('Password updated successfully!');
                await logSettingsActivity('password_change', 'Changed account password');
            } catch (error) {
                console.error('Error changing password:', error);
                alert(error.message);
                await logSettingsActivity('password_error', `Failed to change password: ${error.message}`);
            } finally {
                this.loading = false;
            }
        },

        async updateProfilePhoto() {
            // Implement profile photo update functionality
            alert('Profile photo update functionality will be implemented soon');
        },

        async terminateSession(sessionId) {
            try {
                // Implement session termination functionality
                alert('Session termination functionality will be implemented soon');
                await logSettingsActivity('session_terminated', `Terminated session ${sessionId}`);
            } catch (error) {
                console.error('Error terminating session:', error);
                await logSettingsActivity('session_error', `Failed to terminate session: ${error.message}`);
            }
        },

        // Mock function to load active sessions
        loadActiveSessions() {
            this.activeSessions = [
                {
                    id: 'current',
                    deviceName: 'Current Browser',
                    deviceIcon: 'fas fa-laptop',
                    location: 'Current Location',
                    lastActive: 'Now',
                    isCurrent: true
                }
                // Add more mock sessions if needed
            ];
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

        checkAuthState() {
            auth.onAuthStateChanged(user => {
                this.isAuthenticated = !!user;
                if (!user) {
                    window.location.href = '../Login/index.html';
                } else {
                    this.loadUserProfile();
                }
            });
        }
    },

    // Load settings when component is mounted
    mounted() {
        this.checkAuthState();
        this.loadSettings();
        this.loadActiveSessions();

        // Apply initial visibility based on saved preference
        const savedSettings = localStorage.getItem('lodgeEaseSettings');
        if (savedSettings) {
            const { systemSettings } = JSON.parse(savedSettings);
            if (systemSettings.preferLongTerm) {
                const sidebarLinks = document.querySelectorAll('.sidebar a');
                sidebarLinks.forEach(link => {
                    if (link.textContent.includes('Room Management')) {
                        link.parentElement.style.display = 'none';
                    }
                    if (link.textContent.includes('Long-term Stays')) {
                        link.parentElement.style.display = 'block';
                    }
                });
            }
        }

        // Add warning before leaving page with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.settingsModified) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }
});

// Initialize page logging
auth.onAuthStateChanged((user) => {
    if (user) {
        PageLogger.logNavigation('Settings');
    }
});

// Export any necessary functions
export {
    logSettingsActivity
};