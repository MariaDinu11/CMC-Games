class ProfileManager {
  constructor() {
    this.currentUser = this.getCurrentUser();
    if (!this.currentUser) {
      this.redirectToLogin();
      return;
    }
    
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
  
  redirectToLogin() {
    window.location.href = '../html/login.html';
  }
  
  async initializePage() {
    try {
      this.updateHeaderAvatar();
      await this.loadProfileData();
    } catch (error) {
      console.error('Eroare la inițializarea paginii:', error);
      this.showError('Eroare la încărcarea datelor profilului');
    }
  }
  
  updateHeaderAvatar() {
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar && this.currentUser.username) {
      const avatar = this.generateAvatar(this.currentUser.username);
      headerAvatar.textContent = avatar;
    }
  }
  
  generateAvatar(username) {
    return username.substring(0, 2).toUpperCase();
  }
  
  async loadProfileData() {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${this.currentUser.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Eroare la încărcarea profilului');
      }
      
      const data = await response.json();
      this.displayProfileData(data);
    } catch (error) {
      console.error('Eroare la încărcarea datelor:', error);
      this.showError('Nu s-au putut încărca datele profilului');
    }
  }
  
  displayProfileData(data) {
    // Actualizează informațiile de profil
    document.getElementById('profileUsername').textContent = data.user.username;
    document.getElementById('profileEmail').textContent = data.user.email;
    
    const joinDate = new Date(data.user.createdAt).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById('profileJoinDate').textContent = `Membru din: ${joinDate}`;
    
    // Actualizează avatar-ul
    const profileAvatar = document.getElementById('profileAvatar');
    profileAvatar.textContent = this.generateAvatar(data.user.username);
    
    // Actualizează badge-ul de status
    const statusBadge = document.getElementById('userStatusBadge');
    statusBadge.textContent = data.user.userType.toUpperCase();
    statusBadge.className = `user-status-badge ${data.user.userType}`;
    
    // Actualizează statisticile generale
    document.getElementById('totalGames').textContent = data.stats.totalGames;
    document.getElementById('totalWins').textContent = data.stats.totalWins;
    document.getElementById('winRate').textContent = `${data.stats.winRate}%`;
    document.getElementById('avgRating').textContent = data.stats.avgRating;
    
    // Afișează statisticile pe jocuri
    this.displayGameStats(data.gameStats);
    
    // Afișează jocurile recente
    this.displayRecentGames(data.recentGames);
  }
  
  displayGameStats(gameStats) {
    const container = document.getElementById('gameStatsGrid');
    
    if (gameStats.length === 0) {
      container.innerHTML = '<div class="loading">Nu ai jucat încă niciun joc.</div>';
      return;
    }
    
    container.innerHTML = gameStats.map(game => `
      <div class="game-stat-card">
        <div class="game-stat-header">
          <div class="game-name">${game.gameName}</div>
          <div class="game-rating">${game.eloRating}</div>
        </div>
        <div class="game-stat-details">
          <div class="stat-detail">
            <div class="stat-detail-number">${game.gamesPlayed}</div>
            <div class="stat-detail-label">Jocuri</div>
          </div>
          <div class="stat-detail">
            <div class="stat-detail-number">${game.wins}</div>
            <div class="stat-detail-label">Victorii</div>
          </div>
          <div class="stat-detail">
            <div class="stat-detail-number">${game.losses}</div>
            <div class="stat-detail-label">Înfrângeri</div>
          </div>
          <div class="stat-detail">
            <div class="stat-detail-number">${game.winRate}%</div>
            <div class="stat-detail-label">Rata</div>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  displayRecentGames(recentGames) {
    const container = document.getElementById('recentGamesList');
    
    if (recentGames.length === 0) {
      container.innerHTML = '<div class="loading">Nu ai jocuri recente.</div>';
      return;
    }
    
    container.innerHTML = recentGames.map(game => {
      const resultClass = game.result === 'winner' ? 'win' : 
                         game.result === 'loser' ? 'loss' : 'draw';
      const resultText = game.result === 'winner' ? 'Victorie' :
                        game.result === 'loser' ? 'Înfrângere' : 'Egalitate';
      
      const gameDate = new Date(game.date).toLocaleDateString('ro-RO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="recent-game-item">
          <div class="game-result-indicator ${resultClass}"></div>
          <div class="recent-game-info">
            <div class="recent-game-name">${game.gameName}</div>
            <div class="recent-game-date">${gameDate} • ${resultText}</div>
          </div>
          <div class="recent-game-score">${game.score} pts</div>
        </div>
      `;
    }).join('');
  }
  
  showError(message) {
    // Implementează sistemul de notificări pentru erori
    console.error(message);
    alert(message); // Temporar - înlocuiește cu un sistem mai elegant
  }
}

// Funcții globale pentru interfață
function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('show');
}

function editProfile() {
  const modal = document.getElementById('editProfileModal');
  
  // Populează formularul cu datele curente
  const profileManager = window.profileManager;
  if (profileManager && profileManager.currentUser) {
    document.getElementById('editUsername').value = profileManager.currentUser.username || '';
    document.getElementById('editEmail').value = profileManager.currentUser.email || '';
  }
  
  modal.classList.add('show');
}

function closeEditModal() {
  const modal = document.getElementById('editProfileModal');
  modal.classList.remove('show');
  
  // Resetează formularul
  document.getElementById('editProfileForm').reset();
}

async function saveProfile() {
  try {
    const form = document.getElementById('editProfileForm');
    const formData = new FormData(form);
    
    const username = formData.get('username');
    const email = formData.get('email');
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validări
    if (!username || !email) {
      alert('Username-ul și email-ul sunt obligatorii');
      return;
    }
    
    if (newPassword && newPassword !== confirmPassword) {
      alert('Parolele nu coincid');
      return;
    }
    
    if (newPassword && !currentPassword) {
      alert('Introdu parola actuală pentru a schimba parola');
      return;
    }
    
    const profileManager = window.profileManager;
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${profileManager.currentUser.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        email,
        currentPassword,
        newPassword
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Eroare la actualizarea profilului');
    }
    
    // Actualizează datele locale
    profileManager.currentUser.username = username;
    profileManager.currentUser.email = email;
    localStorage.setItem('user', JSON.stringify(profileManager.currentUser));
    
    // Reîncarcă datele profilului
    await profileManager.loadProfileData();
    
    closeEditModal();
    alert('Profil actualizat cu succes!');
    
  } catch (error) {
    console.error('Eroare la salvarea profilului:', error);
    alert(error.message || 'Eroare la actualizarea profilului');
  }
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = '../html/login.html';
}

// Închide dropdown-ul când se face click în afară
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const userIcon = document.querySelector('.user-icon');
  
  if (dropdown && !userIcon.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

// Inițializează ProfileManager când pagina se încarcă
document.addEventListener('DOMContentLoaded', () => {
  window.profileManager = new ProfileManager();
});