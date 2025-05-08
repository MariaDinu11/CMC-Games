/**
 * Login.js - Handles login functionality for the gaming platform
 */

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
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
            if (index === 0) {
                tabIndicator.style.left = '76px'; // Login tab
            } else {
                tabIndicator.style.left = '331px'; // Sign Up tab
            }
            
            // Toggle forms visibility
            if (index === 0) {
                // Show login form, hide register form
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                // Show register form, hide login form
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
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
    
    // Registration form handling
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const email = document.getElementById('email').value;
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Basic client-side validation
            if (!email || !username || !password || !confirmPassword) {
                showMessage('error', 'Toate câmpurile sunt obligatorii');
                return;
            }
            
            // Check if passwords match
            if (password !== confirmPassword) {
                showMessage('error', 'Parolele nu coincid');
                return;
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('error', 'Adresa de email nu este validă');
                return;
            }
            
            try {
                // Show loading state
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Se procesează...';
                submitBtn.disabled = true;
                
                // Send registration request to server
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, username, password })
                });
                
                const data = await response.json();
                
                // Reset button state
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                
                if (response.ok) {
                    // Successful registration
                    showMessage('success', 'Înregistrare reușită! Vă puteți autentifica acum.');
                    
                    // Clear form fields
                    document.getElementById('email').value = '';
                    document.getElementById('reg-username').value = '';
                    document.getElementById('reg-password').value = '';
                    document.getElementById('confirm-password').value = '';
                    
                    // Switch to login tab
                    tabButtons[0].click();
                } else {
                    // Failed registration
                    showMessage('error', data.message || 'Eroare la înregistrare');
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
