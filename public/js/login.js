/**
 * Login.js - Handles login functionality for the gaming platform
 */

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabIndicator = document.querySelector('.tab-indicator');
    
    // Tab functionality
    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Move the indicator
            tabIndicator.style.left = `${index * 50}%`;
        });
    });
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Basic client-side validation
            if (!username || !password) {
                showMessage('error', 'Toate câmpurile sunt obligatorii');
                return;
            }
            
            try {
                // Show loading state
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Se procesează...';
                submitBtn.disabled = true;
                
                // Send authentication request to server
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                // Reset button state
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                
                if (response.ok) {
                    // Successful login
                    showMessage('success', 'Autentificare reușită! Redirectare...');
                    
                    // Save token to localStorage
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    
                        window.location.href = '../html/homepage.html';
                } else {
                    // Failed login
                    showMessage('error', data.message || 'Eroare la autentificare');
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('error', 'Eroare la conectarea cu serverul');
            }
        });
    }
    
    // Function to display messages
    function showMessage(type, text) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.className = `form-message ${type}`;
            messageDiv.textContent = text;
            messageDiv.style.display = 'block';
            
            // Hide message after 5 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
    
});
