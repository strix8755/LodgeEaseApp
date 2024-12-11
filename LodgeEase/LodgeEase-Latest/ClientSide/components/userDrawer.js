import { drawerHTML } from './drawerTemplate.js';

function initializeDrawerHTML() {
    // Insert drawer HTML into the document
    document.body.insertAdjacentHTML('beforeend', drawerHTML);
}

function updateUserDrawer() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const userDrawer = document.getElementById('userDrawer');
    
    if (!userDrawer) return;

    const userNameElement = userDrawer.querySelector('h3.font-semibold');
    const userEmailElement = userDrawer.querySelector('p.text-sm.text-gray-500');
    const loginLink = document.querySelector('a[href="../Login/index.html"]');
    
    if (userInfo && userInfo.isLoggedIn) {
        if (userNameElement) userNameElement.textContent = userInfo.name;
        if (userEmailElement) userEmailElement.textContent = userInfo.email;
        if (loginLink) loginLink.style.display = 'none';
    } else {
        if (userNameElement) userNameElement.textContent = 'Guest';
        if (userEmailElement) userEmailElement.textContent = 'Not logged in';
        if (loginLink) loginLink.style.display = 'block';
    }
}

function setupDrawerListeners() {
    const userIcon = document.querySelector('.ri-user-line');
    const userDrawer = document.getElementById('userDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');

    if (userIcon && userDrawer && closeDrawer && drawerOverlay) {
        userIcon.addEventListener('click', () => {
            userDrawer.classList.remove('translate-x-full');
            drawerOverlay.classList.remove('hidden');
        });

        function closeUserDrawer() {
            userDrawer.classList.add('translate-x-full');
            drawerOverlay.classList.add('hidden');
        }

        closeDrawer.addEventListener('click', closeUserDrawer);
        drawerOverlay.addEventListener('click', closeUserDrawer);
    }
}

function setupLogout() {
    const logoutButton = document.querySelector('a[href="#"] i.ri-logout-box-r-line');
    if (logoutButton) {
        logoutButton.parentElement.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userInfo');
            window.location.href = '../Login/index.html';
        });
    }
}

function initializeUserDrawer() {
    initializeDrawerHTML();
    updateUserDrawer();
    setupDrawerListeners();
    setupLogout();
}

export { initializeUserDrawer }; 