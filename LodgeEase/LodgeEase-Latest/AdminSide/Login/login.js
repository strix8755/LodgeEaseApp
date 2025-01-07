import { signIn, register, auth } from '../firebase.js'; // Import Firebase Authentication functions
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs, getFirestore } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

const db = getFirestore();

new Vue({
    el: '#app',
    data() {
        return {
            email: '',
            password: '',
            fullname: '',
            username: '',
            confirmPassword: '',
            remember: false,
            loading: false,
            errorMessage: '',
            successMessage: '',
            isLoginForm: true, // Toggle between login and registration forms
            isAdmin: true, // Set default to true since this is admin registration
        };
    },
    methods: {
        // Toggle between login and registration forms
        toggleForm() {
            this.isLoginForm = !this.isLoginForm;
            this.resetForm();
        },

        // Reset form and messages
        resetForm() {
            this.email = '';
            this.password = '';
            this.fullname = '';
            this.username = '';
            this.confirmPassword = '';
            this.errorMessage = '';
            this.successMessage = '';
            this.loading = false;
        },

        validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        validateUsername(username) {
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            return usernameRegex.test(username);
        },

        validatePassword(password) {
            // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
            return passwordRegex.test(password);
        },

        // Handle login
        async handleLogin() {
            this.errorMessage = '';
            this.successMessage = '';
            
            if (!this.email || !this.password) {
                this.errorMessage = 'Please enter both email and password';
                return;
            }

            this.loading = true;

            try {
                const result = await signIn(this.email, this.password);
                
                if (!result || !result.user) {
                    throw new Error('Invalid login credentials');
                }

                if (this.remember) {
                    localStorage.setItem('userEmail', this.email);
                    // Store the auth token in localStorage
                    const token = await auth.currentUser.getIdToken();
                    localStorage.setItem('authToken', token);
                } else {
                    localStorage.removeItem('userEmail');
                }

                this.successMessage = 'Login successful! Redirecting...';
                setTimeout(() => {
                    window.location.href = '../Dashboard/Dashboard.html';
                }, 1500);
            } catch (error) {
                console.error('Login error:', error);
                if (error.message === 'access-denied') {
                    this.errorMessage = 'Access denied. This portal is for administrators only.';
                } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    this.errorMessage = 'Invalid email or password';
                } else {
                    this.errorMessage = 'Failed to login. Please try again.';
                }
            } finally {
                this.loading = false;
            }
        },

        // Handle registration
        async handleRegister() {
            this.errorMessage = '';
            this.successMessage = '';

            // Individual field validation with specific messages
            if (!this.fullname) {
                this.errorMessage = 'Please enter your full name';
                return;
            }

            if (!this.username) {
                this.errorMessage = 'Please enter a username';
                return;
            }

            if (!this.email) {
                this.errorMessage = 'Please enter your email address';
                return;
            }

            if (!this.password) {
                this.errorMessage = 'Please enter a password';
                return;
            }

            if (!this.confirmPassword) {
                this.errorMessage = 'Please confirm your password';
                return;
            }

            // Validate fullname
            if (this.fullname.length < 2) {
                this.errorMessage = 'Full name must be at least 2 characters long';
                return;
            }

            // Validate username
            if (!this.validateUsername(this.username)) {
                this.errorMessage = 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores';
                return;
            }

            // Validate email
            if (!this.validateEmail(this.email)) {
                this.errorMessage = 'Please enter a valid email address';
                return;
            }

            // Validate password
            if (!this.validatePassword(this.password)) {
                this.errorMessage = 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number';
                return;
            }

            // Validate password confirmation
            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match';
                return;
            }

            this.loading = true;

            try {
                // Normalize username to lowercase before checking
                const normalizedUsername = this.username.toLowerCase();
                const isUsernameAvailable = await this.checkUsernameAvailability(normalizedUsername);
                
                if (!isUsernameAvailable) {
                    this.loading = false;
                    this.errorMessage = 'This username is already taken';
                    return;
                }

                // Use normalized username in registration
                const result = await register(this.email, this.password, normalizedUsername, this.fullname);
                
                if (result && result.user) {
                    // Create user document
                    await setDoc(doc(db, 'users', result.user.uid), {
                        email: this.email,
                        username: normalizedUsername,
                        fullname: this.fullname,
                        role: 'admin',
                        createdAt: new Date()
                    });

                    this.successMessage = 'Admin account created successfully! Please log in.';
                    setTimeout(() => {
                        this.isLoginForm = true;
                        this.resetForm();
                    }, 1500);
                }
            } catch (error) {
                console.error('Registration error:', error);
                this.handleAuthError(error);
            } finally {
                this.loading = false;
            }
        },

        // Handle forgot password
        async handleForgotPassword() {
            if (!this.email) {
                this.errorMessage = 'Please enter your email address';
                return;
            }

            this.loading = true;
            this.errorMessage = '';
            this.successMessage = '';

            try {
                await sendPasswordResetEmail(auth, this.email);
                this.successMessage = 'Password reset email sent. Please check your inbox.';
            } catch (error) {
                console.error('Password reset error:', error);
                this.handleAuthError(error);
            } finally {
                this.loading = false;
            }
        },

        // Handle authentication errors
        handleAuthError(error) {
            console.error('Authentication error:', error);
            
            const errorMessage = error.message || error.code;
            
            switch (errorMessage) {
                case 'This email is already registered':
                    this.errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
                    break;
                case 'This username is already taken':
                    this.errorMessage = 'This username is already taken. Please choose a different username.';
                    break;
                case 'auth/invalid-email':
                    this.errorMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    this.errorMessage = 'Password must be at least 6 characters long with at least one uppercase letter, one lowercase letter, and one number.';
                    break;
                case 'auth/network-request-failed':
                    this.errorMessage = 'Network error. Please check your internet connection and try again.';
                    break;
                case 'Server error. Please try again later.':
                    this.errorMessage = 'Server error. Please try again later.';
                    break;
                case 'access-denied':
                    this.errorMessage = 'Access denied. This portal is for administrators only.';
                    break;
                default:
                    this.errorMessage = 'An error occurred. Please try again.';
                    console.error('Detailed error:', error);
            }
        },

        async checkUsernameAvailability(username) {
            try {
                const usersRef = collection(db, 'users');
                const normalizedUsername = username.toLowerCase().trim();
                
                // First, log the exact query we're making
                console.log('Checking username availability for:', normalizedUsername);
                
                // Get all users and check manually (temporary debugging solution)
                const snapshot = await getDocs(usersRef);
                
                // Log all usernames in the database
                console.log('All existing usernames:');
                snapshot.forEach(doc => {
                    console.log('User document:', {
                        username: doc.data().username,
                        userId: doc.id
                    });
                });
                
                // Check if username exists
                const exists = snapshot.docs.some(doc => 
                    doc.data().username && 
                    doc.data().username.toLowerCase() === normalizedUsername
                );
                
                console.log('Username exists:', exists);
                return !exists;
            } catch (error) {
                console.error('Error in checkUsernameAvailability:', error);
                throw error;
            }
        }
    },
    created() {
        // Check for remembered email
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            this.email = savedEmail;
            this.remember = true;
        }
    }
});
