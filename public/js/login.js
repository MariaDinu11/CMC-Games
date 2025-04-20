document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obține valorile din formular
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Validare simplă pe client
        if (!username || !password) {
          showMessage('error', 'Toate câmpurile sunt obligatorii');
          return;
        }
        
        try {
          // Trimite cererea de autentificare către server
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Autentificare reușită
            showMessage('success', 'Autentificare reușită! Redirectare...');
            
            // Salvează token-ul în localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirecționare după 1 secundă
            setTimeout(() => {
              window.location.href = '/dashboard.html';
            }, 1000);
          } else {
            // Autentificare eșuată
            showMessage('error', data.message || 'Eroare la autentificare');
          }
        } catch (error) {
          console.error('Eroare:', error);
          showMessage('error', 'Eroare la conectarea cu serverul');
        }
      });
    }
    
    // Funcție pentru afișarea mesajelor
    function showMessage(type, text) {
      const messageDiv = document.getElementById('message');
      if (messageDiv) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        
        // Ascunde mesajul după 5 secunde
        setTimeout(() => {
          messageDiv.style.display = 'none';
        }, 5000);
      }
    }
  });