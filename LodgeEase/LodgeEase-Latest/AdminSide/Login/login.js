import { signIn, register, auth } from '../firebase.js'; // Import Firebase Authentication functions
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

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
            
            // Validate empty fields
            if (!this.email || !this.password) {
                this.errorMessage = 'Please fill in all fields';
                return;
            }

            this.loading = true;

            try {
                await signIn(this.email, this.password);
                
                if (this.remember) {
                    localStorage.setItem('userEmail', this.email);
                } else {
                    localStorage.removeItem('userEmail');
                }

                this.successMessage = 'Login successful! Redirecting...';
                setTimeout(() => {
                    window.location.href = '../Dashboard/dashboard.html';
                }, 1500);
            } catch (error) {
                this.handleAuthError(error);
            } finally {
                this.loading = false;
            }
        },

        // Handle registration
        async handleRegister() {
            this.errorMessage = '';

            // Validate empty fields
            if (!this.fullname || !this.username || !this.email || !this.password || !this.confirmPassword) {
                this.errorMessage = 'Please fill in all fields';
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
                await register(this.email, this.password, this.username, this.fullname);
                this.successMessage = 'Account created successfully! Please log in.';
                setTimeout(() => {
                    this.isLoginForm = true;
                    this.resetForm();
                }, 1500);
            } catch (error) {
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
            
            switch (error.code) {
                // Login errors
                case 'auth/user-not-found':
                    this.errorMessage = 'No account found with this email or username';
                    break;
                case 'auth/wrong-password':
                    this.errorMessage = 'Incorrect password. Please try again';
                    break;
                case 'auth/invalid-login-credentials':
                    this.errorMessage = 'Invalid login credentials. Please check your email/username and password';
                    break;
                case 'auth/too-many-requests':
                    this.errorMessage = 'Too many failed attempts. Please try again later or reset your password';
                    break;

                // Registration errors
                case 'auth/email-already-in-use':
                    this.errorMessage = 'This email is already registered. Please use a different email or try logging in';
                    break;
                case 'auth/invalid-email':
                    this.errorMessage = 'Please enter a valid email address';
                    break;
                case 'auth/weak-password':
                    this.errorMessage = 'Password is too weak. It must be at least 6 characters long with at least one uppercase letter, one lowercase letter, and one number';
                    break;
                case 'auth/username-already-exists':
                    this.errorMessage = 'This username is already taken. Please choose another';
                    break;

                // Network errors
                case 'auth/network-request-failed':
                    this.errorMessage = 'Network error. Please check your internet connection and try again';
                    break;

                // Password reset errors
                case 'auth/missing-email':
                    this.errorMessage = 'Please enter your email address to reset your password';
                    break;

                // Default error
                default:
                    this.errorMessage = 'An error occurred. Please try again later';
                    console.error('Detailed error:', error);
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
