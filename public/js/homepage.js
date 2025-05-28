class HomepageManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.initializePage();
    }
    
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            const authToken = localStorage.getItem('authToken');
            
            if (!userStr || !authToken) {
                return null;
            }
            
            return {
                ...JSON.parse(userStr),
                authToken
            };
        } catch (error) {
            console.error('Eroare la obținerea datelor utilizatorului:', error);
            return null;
        }
    }
    
    initializePage() {
        // Verifică dacă utilizatorul este logat
        if (!this.currentUser) {
            // Dacă nu e logat, redirectează la pagina de login
            this.redirectToLogin();
            return;
        }
        
        // Actualizează avatar-ul în header
        this.updateHeaderAvatar();
        
        // Setează funcționalitatea de căutare
        this.setupSearch();
        
        // Verifică statusul utilizatorului
        this.checkUserStatus();
    }
    
    redirectToLogin() {
        // Afișează un mesaj și redirectează
        setTimeout(() => {
            window.location.href = '../html/login.html';
        }, 1000);
    }
    
    updateHeaderAvatar() {
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar && this.currentUser.username) {
            const avatar = this.generateAvatar(this.currentUser.username);
            headerAvatar.innerHTML = `<span style="font-size: 20px; font-weight: 600; color: white;">${avatar}</span>`;
        }
    }
    
    generateAvatar(username) {
        return username.substring(0, 2).toUpperCase();
    }
    
    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterGames(e.target.value);
            });
        }
    }
    
    filterGames(searchTerm) {
        const gameCards = document.querySelectorAll('.game-card');
        const term = searchTerm.toLowerCase().trim();
        
        gameCards.forEach(card => {
            const gameTitle = card.querySelector('.game-title').textContent.toLowerCase();
            
            if (gameTitle.includes(term) || term === '') {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease-in';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    async checkUserStatus() {
        // Verifică periodic dacă utilizatorul mai este activ
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // Token invalid sau expirat
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                this.redirectToLogin();
            }
        } catch (error) {
            console.log('Nu s-a putut verifica statusul utilizatorului');
            // Nu redirectăm pentru că poate fi o problemă temporară de rețea
        }
    }
}

// Funcții globale pentru interfață
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

function logout() {
    // Confirmă logout-ul
    const confirmLogout = confirm('Ești sigur că vrei să te deconectezi?');
    if (confirmLogout) {
        // Șterge datele din localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Afișează mesaj de confirmare
        alert('Te-ai deconectat cu succes!');
        
        // Redirectează la pagina de login
        window.location.href = '../html/login.html';
    }
}

// Închide dropdown-ul când se face click în afară
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userIcon = document.querySelector('.user-icon');
    
    if (dropdown && userIcon && !userIcon.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Adaugă animații pentru fade in
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);

// Funcție pentru afișarea unei notificări
function showNotification(message, type = 'info') {
    // Creează elementul de notificare
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Stilizează notificarea
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        zIndex: '10000',
        opacity: '0',
        transition: 'all 0.3s ease',
        backgroundColor: type === 'success' ? '#4CD964' : 
                        type === 'error' ? '#FF6B6B' : '#9C5EAF'
    });
    
    // Adaugă în DOM
    document.body.appendChild(notification);
    
    // Animație de apariție
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Elimină după 3 secunde
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Inițializează HomepageManager când pagina se încarcă
document.addEventListener('DOMContentLoaded', () => {
    window.homepageManager = new HomepageManager();
    
    // Afișează mesaj de bun venit pentru utilizatori autentificați
    const user = window.homepageManager.currentUser;
    if (user && user.username) {
        showNotification(`Bun venit, ${user.username}!`, 'success');
    }
});

// Previne reîncărcarea accidentală a paginii
window.addEventListener('beforeunload', (e) => {
    // Nu afișa confirmarea pentru navigarea normală
    // e.preventDefault();
    // e.returnValue = '';
});

// Gestionează erorile JavaScript globale
window.addEventListener('error', (e) => {
    console.error('Eroare JavaScript:', e.error);
    // Nu afișa erori utilizatorilor în producție
    if (window.location.hostname === 'localhost') {
        showNotification(`Eroare: ${e.message}`, 'error');
    }
});

// Funcție pentru verificarea conexiunii la internet
function checkConnection() {
    if (!navigator.onLine) {
        showNotification('Nu ai conexiune la internet', 'error');
    }
}

// Verifică conexiunea la încărcare și la schimbarea statusului
window.addEventListener('load', checkConnection);
window.addEventListener('online', () => showNotification('Conexiune restabilită', 'success'));
window.addEventListener('offline', () => showNotification('Conexiune pierdută', 'error'));