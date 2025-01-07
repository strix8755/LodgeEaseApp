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
                special: /[!@#$%^&*]/,
            };

            const errors = [];
            if (!passwordRegex.length.test(password)) errors.push('at least 6 characters');
            if (!passwordRegex.uppercase.test(password)) errors.push('one uppercase letter');
            if (!passwordRegex.lowercase.test(password)) errors.push('one lowercase letter');
            if (!passwordRegex.number.test(password)) errors.push('one number');
            if (!passwordRegex.special.test(password)) errors.push('one special character (!@#$%^&*)');

            return errors;
        },

        async handleRegister(event) {
            event.preventDefault();
            this.errorMessage = '';
            this.successMessage = '';
            this.loading = true;

            try {
                // Validate empty fields
                const requiredFields = {
                    fullname: 'Full Name',
                    email: 'Email',
                    username: 'Username',
                    password: 'Password',
                    confirmPassword: 'Confirm Password',
                };

                for (const [field, label] of Object.entries(requiredFields)) {
                    if (!this[field]?.trim()) {
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

                console.log('Starting registration with:', {
                    username: this.username,
                    email: this.email
                });

                const result = await register(
                    this.email.trim(),
                    this.password,
                    this.username.trim(),
                    this.fullname.trim()
                );

                console.log('Registration successful:', result);
                this.successMessage = 'Account created successfully! Redirecting to login...';
                
                // Delay redirect to show success message
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

            } catch (error) {
                console.error('Registration failed:', error);
                this.errorMessage = error.message;
            } finally {
                this.loading = false;
            }
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
    }
});