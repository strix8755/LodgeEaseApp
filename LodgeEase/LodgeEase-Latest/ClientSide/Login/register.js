import { register } from '../../AdminSide/firebase.js';

new Vue({
    el: '#app',
    data() {
        return {
            fullname: '',
            email: '',
            username: '',
            password: '',
            confirmPassword: '',
            terms: false,
            loading: false,
            errorMessage: '',
            successMessage: ''
        };
    },
    methods: {
        validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        openTermsModal() {
            document.getElementById('termsModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        },
        closeTermsModal() {
            document.getElementById('termsModal').classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    },
    mounted() {
        // Add event listeners when Vue instance is mounted
        document.getElementById('termsModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('termsModal')) {
                this.closeTermsModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTermsModal();
            }
        });
    },

        validateUsername(username) {
            return /^[a-zA-Z0-9_]{3,20}$/.test(username);
        },

        validatePassword(password) {
            const passwordRegex = {
                length: /.{6,}/,
                uppercase: /[A-Z]/,
                lowercase: /[a-z]/,
                number: /[0-9]/,
                special: /[!@#$%^&*]/
            };

            const errors = [];
            if (!passwordRegex.length.test(password)) errors.push('at least 6 characters');
            if (!passwordRegex.uppercase.test(password)) errors.push('one uppercase letter');
            if (!passwordRegex.lowercase.test(password)) errors.push('one lowercase letter');
            if (!passwordRegex.number.test(password)) errors.push('one number');
            if (!passwordRegex.special.test(password)) errors.push('one special character (!@#$%^&*)');

            return errors;
        },

        


        async handleRegister() {
            this.errorMessage = '';
            this.successMessage = '';

            // Validate empty fields
            const requiredFields = {
                fullname: 'Full Name',
                email: 'Email',
                username: 'Username',
                password: 'Password',
                confirmPassword: 'Confirm Password'
            };

            for (const [field, label] of Object.entries(requiredFields)) {
                if (!this[field].trim()) {
                    this.errorMessage = `${label} is required`;
                    return;
                }
            }

            // Validate fullname
            if (this.fullname.length < 2) {
                this.errorMessage = 'Full name must be at least 2 characters long';
                return;
            }

            // Validate username
            if (!this.validateUsername(this.username)) {
                this.errorMessage = 'Username must be 3-20 characters and can only contain letters, numbers, and underscores';
                return;
            }

            // Validate email
            if (!this.validateEmail(this.email)) {
                this.errorMessage = 'Please enter a valid email address';
                return;
            }

            // Validate password
            const passwordErrors = this.validatePassword(this.password);
            if (passwordErrors.length > 0) {
                this.errorMessage = `Password must contain ${passwordErrors.join(', ')}`;
                return;
            }

            // Validate password confirmation
            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match';
                return;
            }

            // Check terms
            if (!this.terms) {
                this.errorMessage = 'Please accept the Terms and Conditions';
                return;
            }

            this.loading = true;

            try {
                const result = await register(
                    this.email.trim(),
                    this.password,
                    this.username.trim(),
                    this.fullname.trim()
                );

                this.successMessage = 'Account created successfully! Redirecting to login...';
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

            } catch (error) {
                console.error('Registration error:', error);
                
                // Enhanced error handling with Firestore-specific errors
                const errorMessages = {
                    // Auth errors
                    'auth/email-already-in-use': 'This email is already registered',
                    'auth/invalid-email': 'Invalid email address',
                    'auth/weak-password': 'Password is too weak',
                    'auth/network-request-failed': 'Network error. Please check your connection',
                    
                    // Firestore errors
                    'username-exists': 'This username is already taken',
                    'firestore-error': 'Failed to create account. Please try again',
                    'permission-denied': 'Registration system is being updated. Please try again in a few minutes.',
                    'PERMISSION_DENIED': 'Registration system is being updated. Please try again in a few minutes.',
                    
                    // Specific Firestore permission errors
                    'firestore/permission-denied': 'Registration system is being updated. Please try again in a few minutes.',
                    'firestore/insufficient-permissions': 'Registration system is being updated. Please try again in a few minutes.'
                };

                // Check for various types of permission errors
                if (error.code?.includes('permission') || 
                    error.message?.includes('permission') ||
                    error.message?.includes('Missing or insufficient permissions') ||
                    error.code === 'PERMISSION_DENIED') {
                    
                    this.errorMessage = 'Registration system is being updated. Please try again in a few minutes.';
                    console.error('Firestore permissions error. Details:', {
                        code: error.code,
                        message: error.message,
                        details: error.details || 'No additional details'
                    });
                } else {
                    this.errorMessage = errorMessages[error.code] || error.message || 'Registration failed. Please try again.';
                }
            } finally {
                this.loading = false;
            }
        }
    }
);