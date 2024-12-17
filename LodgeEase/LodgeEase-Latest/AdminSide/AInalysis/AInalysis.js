import { auth } from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

new Vue({
    el: '#app',
    data: {
        isAuthenticated: false,
        loading: true,
        messages: []
    },
    methods: {
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
                }
                this.loading = false;
                // Initialize chat after auth check
                this.addMessage('Welcome to Lodge Ease AI Assistant! I can help you with:\n- Occupancy predictions\n- Revenue forecasts\n- Seasonal trends\n- Booking patterns\n\nWhat would you like to know?', 'bot');
            });
        },

        addMessage(content, type) {
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            
            messageDiv.innerHTML = `
                <div class="message-avatar ${type}">
                    <i class="fas fa-${type === 'bot' ? 'robot' : 'user'}"></i>
                </div>
                <div class="message-content">${content.replace(/\n/g, '<br>')}</div>
            `;
            
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        },

        sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (message) {
                this.addMessage(message, 'user');
                input.value = '';
                
                // Simulate bot response (replace with actual API call in production)
                setTimeout(() => {
                    const responses = [
                        "Based on our data, I predict an 85% occupancy rate for the next month. Would you like more specific details?",
                        "Looking at historical trends, we expect a 20% increase in revenue compared to the same period last year.",
                        "The peak booking periods are typically during summer months (June-August) and holiday seasons.",
                        "I can help you analyze those trends. Which specific aspects would you like to explore?"
                    ];
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                    this.addMessage(randomResponse, 'bot');
                }, 1000);
            }
        },

        submitSuggestion(suggestion) {
            document.getElementById('chatInput').value = suggestion;
            this.sendMessage();
        },

        startNewChat() {
            const chatContainer = document.getElementById('chatContainer');
            chatContainer.innerHTML = '';
            this.addMessage('Welcome to Lodge Ease AI Assistant! How can I help you today?', 'bot');
        }
    },
    mounted() {
        this.checkAuthState();
        // Handle enter key in input
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }
});