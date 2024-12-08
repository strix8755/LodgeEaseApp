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
            window.location.href = '../Homepage/rooms.html';
        } else {
            // Failed login
            errorMessage.textContent = 'Invalid username or password';
            loadingIndicator.innerHTML = '';
        }
    }, 1000); // Simulate network delay
});


document.addEventListener('DOMContentLoaded', function() {
    const userIcon = document.querySelector('.ri-user-line');
    const userDrawer = document.getElementById('userDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
  
    // Open drawer
    userIcon.addEventListener('click', function() {
      userDrawer.classList.remove('translate-x-full');
      drawerOverlay.classList.remove('hidden');
    });
  
    // Close drawer
    closeDrawer.addEventListener('click', closeUserDrawer);
    drawerOverlay.addEventListener('click', closeUserDrawer);
  
    function closeUserDrawer() {
      userDrawer.classList.add('translate-x-full');
      drawerOverlay.classList.add('hidden');
    }
  });