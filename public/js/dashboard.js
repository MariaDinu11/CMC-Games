/**
 * Dashboard.js - Handles dashboard functionality for the gaming platform
 */

document.addEventListener('DOMContentLoaded', () => {
    // Dashboard elements
    const dashboard = document.getElementById('dashboard');
    const showLoginBtn = document.getElementById('showLoginBtn');
    
    // Main login button event listener
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            // Redirect to login.html
            window.location.href = '../html/login.html';
        });
    }
    
    // Check if we're on the login page
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Go back to the main page
            window.location.href = '/';
        });
    }
});