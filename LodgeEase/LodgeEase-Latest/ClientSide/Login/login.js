// login.js
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendPasswordResetEmail 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc,
    collection,
    query,
    where,
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBAJr0JQgWRfGTmSXTK6P7Yn8fkHXG2YeE",
    authDomain: "lms-app-2b903.firebaseapp.com",
    projectId: "lms-app-2b903",
    storageBucket: "lms-app-2b903.appspot.com",
    messagingSenderId: "1046108373013",
    appId: "1:1046108373013:web:fc366db1d92b9c4b860e1c",
    measurementId: "G-WRMW9Z8867"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
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
                acceptedTerms: false,
                showTerms: false,
                showSignUpModal: false, // Ensure this is false by default
                signupForm: {
                    fullname: '',
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    acceptedTerms: false
                }
            };
        },
        mounted() {
            // Ensure modal is hidden on initial load
            this.showSignUpModal = false;
        },
        methods: {
            async handleLogin() {
                this.errorMessage = '';
                this.successMessage = '';
                
                if (!this.acceptedTerms) {
                    this.errorMessage = 'Please accept the Terms and Conditions';
                    return;
                }

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
                    let loginEmail = this.email;

                    // If input doesn't look like an email, try to find the user by username
                    if (!this.email.includes('@')) {
                        const usersRef = collection(db, 'users');
                        const q = query(usersRef, where('username', '==', this.email.toLowerCase()));
                        const querySnapshot = await getDocs(q);
                        
                        if (querySnapshot.empty) {
                            throw new Error('No account found with this username');
                        }
                        
                        // Get the email associated with this username
                        loginEmail = querySnapshot.docs[0].data().email;
                    }

                    // Now login with the email
                    const userCredential = await signInWithEmailAndPassword(auth, loginEmail, this.password);
                    
                    if (this.remember) {
                        localStorage.setItem('userEmail', loginEmail);
                    } else {
                        localStorage.removeItem('userEmail');
                    }

                    this.successMessage = 'Login successful! Redirecting...';
                    
                    setTimeout(() => {
                        window.location.href = '../Homepage/rooms.html';
                    }, 1500);

                } catch (error) {
                    console.error('Login error:', error);
                    if (error.message === 'No account found with this username') {
                        this.errorMessage = error.message;
                    } else {
                        this.handleAuthError(error);
                    }
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

            acceptTerms() {
                this.acceptedTerms = true;
                this.showTerms = false;
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
            },

            async handleSignUp() {
                if (this.loading) return;
                
                this.loading = true;
                this.errorMessage = '';
                
                try {
                    // Validate passwords match
                    if (this.signupForm.password !== this.signupForm.confirmPassword) {
                        throw new Error('Passwords do not match');
                    }

                    // Validate terms acceptance
                    if (!this.signupForm.acceptedTerms) {
                        throw new Error('Please accept the terms and conditions');
                    }

                    // Create user in Firebase Authentication
                    const userCredential = await createUserWithEmailAndPassword(
                        auth,
                        this.signupForm.email,
                        this.signupForm.password
                    );

                    // Create user document in Firestore
                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        fullname: this.signupForm.fullname,
                        username: this.signupForm.username.toLowerCase(),
                        email: this.signupForm.email,
                        role: 'user',
                        createdAt: new Date(),
                        status: 'active'
                    });
                    
                    this.successMessage = 'Account created successfully! Please login.';
                    this.showSignUpModal = false;
                    this.resetSignupForm();

                    // Optional: Auto-fill login form with new email
                    this.email = this.signupForm.email;
                    
                } catch (error) {
                    console.error('Registration error:', error);
                    if (error.code === 'auth/email-already-in-use') {
                        this.errorMessage = 'This email is already registered';
                    } else if (error.code === 'auth/invalid-email') {
                        this.errorMessage = 'Please enter a valid email address';
                    } else if (error.code === 'auth/weak-password') {
                        this.errorMessage = 'Password should be at least 6 characters';
                    } else {
                        this.errorMessage = error.message || 'An error occurred during registration';
                    }
                } finally {
                    this.loading = false;
                }
            },

            resetSignupForm() {
                this.signupForm = {
                    fullname: '',
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    acceptedTerms: false
                };
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