document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent default form submission

    // Get input values
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Get message display elements
    const errorMessage = document.querySelector('.error-message');
    const successMessage = document.querySelector('.success-message');
    const loadingIndicator = document.querySelector('.loading');

    // Clear previous messages
    errorMessage.textContent = '';
    successMessage.textContent = '';

    // Show loading indicator
    loadingIndicator.innerHTML = '<div class="spinner"></div>';

    // Simulate authentication (replace with actual backend authentication in real application)
    setTimeout(() => {
        // Simple validation (replace with proper authentication in a real app)
        if (username && password) {
            // Successful login
            successMessage.textContent = 'Login successful! Redirecting...';
            loadingIndicator.innerHTML = '';
            
            // Redirect to dashboard
            window.location.href = '../Dashboard/Dashboard.html';
        } else {
            // Failed login
            errorMessage.textContent = 'Invalid username or password';
            loadingIndicator.innerHTML = '';
        }
    }, 1000); // Simulate network delay
});