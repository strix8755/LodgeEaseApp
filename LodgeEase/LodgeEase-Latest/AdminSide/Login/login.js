import { signIn, register, resetPassword } from '../firebase.js'; // Import Firebase Authentication functions

new Vue({
    el: '#app',
    data() {
        return {
            email: '',
            password: '',
            remember: false,
            loading: false,
            errorMessage: '',
            successMessage: '',
            currentForm: 'login', // Default form to display
        };
    },
    methods: {
        // Switch between forms
        switchForm(form) {
            this.currentForm = form;
            this.resetMessages();
        },
        // Clear feedback messages
        resetMessages() {
            this.errorMessage = '';
            this.successMessage = '';
        },
        // Handle user login
        async handleLogin() {
            this.resetMessages();
            this.loading = true;
        
            try {
                const user = await signIn(this.email, this.password);
        
                if (this.remember) {
                    // Save credentials locally if "Remember me" is checked
                    localStorage.setItem('userEmail', this.email);
                } else {
                    localStorage.removeItem('userEmail');
                }
        
                this.successMessage = `Welcome back, ${user.email}! Redirecting...`;
                setTimeout(() => {
                    window.location.href = '../Dashboard/dashboard.html'; // Redirect to dashboard
                }, 1500);
            } catch (error) {
                console.error('Error during login:', error);
        
                if (error.code === 'auth/user-not-found') {
                    this.errorMessage = `No account found for ${this.email}. Please sign up to create an account.`;
                } else if (error.code === 'auth/wrong-password') {
                    this.errorMessage = `Incorrect password for ${this.email}. Please try again.`;
                } else if (error.code === 'auth/invalid-email') {
                    this.errorMessage = `The email address is not valid. Please enter a valid email address.`;
                } else if (error.code === 'auth/invalid-login-credentials') {
                    this.errorMessage = 'Invalid login credentials. Please check your email and password.';
                } else if (error.code === 'auth/too-many-requests') {
                    this.errorMessage = 'Too many login attempts. Please try again later.';
                } else {
                    this.errorMessage = error.message || 'An error occurred during login.';
                }
            } finally {
                this.loading = false;
            }
        },                
        // Handle user registration
        async handleRegister() {
            this.resetMessages();
            this.loading = true;

            try {
                const user = await register(this.email, this.password);
                this.successMessage = `Account created successfully for ${user.email}. Please login.`;
                this.switchForm('login');
            } catch (error) {
                this.errorMessage = error.message || 'An error occurred during registration.';
            } finally {
                this.loading = false;
            }
        },
        // Handle password reset
        async handleReset() {
            this.resetMessages();
            this.loading = true;

            try {
                await resetPassword(this.email);
                this.successMessage = `Password reset email sent to ${this.email}. Check your inbox.`;
                this.switchForm('login');
            } catch (error) {
                this.errorMessage = error.message || 'An error occurred during password reset.';
            } finally {
                this.loading = false;
            }
        },
    },
    created() {
        // Log the current form value for debugging
        console.log('Current form:', this.currentForm);
        
        // Check if "Remember me" was previously set and autofill email
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            this.email = savedEmail;
            this.remember = true;
        }
    },
});
