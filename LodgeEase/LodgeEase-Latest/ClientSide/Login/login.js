// login.js
import { signIn, auth } from '../../AdminSide/firebase.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

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
        };
    },
    methods: {
        async handleLogin() {
            this.errorMessage = '';
            this.successMessage = '';
            
            if (!this.email) {
                this.errorMessage = 'Please enter your email or username';
                return;
            }
            
            if (!this.password) {
                this.errorMessage = 'Please enter your password';
                return;
            }

            this.loading = true;

            try {
                const user = await signIn(this.email, this.password);
                
                if (this.remember) {
                    localStorage.setItem('userEmail', this.email);
                } else {
                    localStorage.removeItem('userEmail');
                }

                this.successMessage = 'Login successful! Redirecting...';
                
                setTimeout(() => {
                    window.location.href = '../Homepage/rooms.html';
                }, 1500);

            } catch (error) {
                this.handleAuthError(error);
            } finally {
                this.loading = false;
            }
        },

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
                this.handleAuthError(error);
            } finally {
                this.loading = false;
            }
        },

        handleAuthError(error) {
            console.error('Authentication error:', error);
            
            switch (error.code) {
                case 'auth/user-not-found':
                    this.errorMessage = 'No account found with this email/username';
                    break;
                case 'auth/wrong-password':
                    this.errorMessage = 'Invalid password';
                    break;
                case 'auth/invalid-email':
                    this.errorMessage = 'Please enter a valid email address';
                    break;
                case 'auth/network-request-failed':
                    this.errorMessage = 'Network error. Please check your connection';
                    break;
                default:
                    this.errorMessage = 'Login failed. Please try again.';
            }
        }
    },
    created() {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            this.email = savedEmail;
            this.remember = true;
        }
    }
});

function handleLogin(event) {
  event.preventDefault();
  // Your existing login validation code...
  
  if (loginSuccessful) {
    localStorage.setItem('isLoggedIn', 'true');
    window.location.href = '../Homepage/rooms.html';
  }
}

function handleLogout() {
  localStorage.removeItem('isLoggedIn');
  window.location.href = '../Homepage/rooms.html';
}