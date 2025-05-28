class LeaderboardManager {
  constructor() {
    this.currentUser = this.getCurrentUser();
    if (!this.currentUser) {
      this.redirectToLogin();
      return;
    }
    
    this.currentGame = 'all';
    this.currentPage = 1;
    this.searchQuery = '';
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
      await this.loadGames();
      await this.loadLeaderboard();
      this.setupEventListeners();
    } catch (error) {
      console.error('Eroare la inițializarea paginii:', error);
      this.showError('Eroare la încărcarea leaderboard-ului');
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
  
  async loadGames() {
    try {
      const response = await fetch('/api/leaderboard/games');
      if (!response.ok) {
        throw new Error('Eroare la încărcarea jocurilor');
      }
      
      const games = await response.json();
      this.displayGameFilters(games);
    } catch (error) {
      console.error('Eroare la încărcarea jocurilor:', error);
    }
  }
  
  displayGameFilters(games) {
    const container = document.getElementById('gameFilterButtons');
    
    // Adaugă butonul pentru toate jocurile
    let buttonsHTML = '<button class="filter-btn active" data-game="all">Toate Jocurile</button>';
    
    // Adaugă butoane pentru fiecare joc
    games.forEach(game => {
      buttonsHTML += `
        <button class="filter-btn" data-game="${game._id}">
          ${game.gameName}
        </button>
      `;
    });
    
    container.innerHTML = buttonsHTML;
  }
  
  async loadLeaderboard() {
    try {
      // Încarcă top 3 pentru podium
      await this.loadTopPlayers();
      
      // Încarcă leaderboard-ul complet
      await this.loadFullLeaderboard();
    } catch (error) {
      console.error('Eroare la încărcarea leaderboard-ului:', error);
      this.showError('Nu s-a putut încărca leaderboard-ul');
    }
  }
  
  async loadTopPlayers() {
    try {
      const gameParam = this.currentGame === 'all' ? '' : `/${this.currentGame}`;
      const response = await fetch(`/api/leaderboard/top${gameParam}`);
      
      if (!response.ok) {
        throw new Error('Eroare la încărcarea top jucătorilor');
      }
      
      const topPlayers = await response.json();
      this.displayPodium(topPlayers);
    } catch (error) {
      console.error('Eroare la încărcarea top jucătorilor:', error);
    }
  }
  
  displayPodium(topPlayers) {
    const positions = ['firstPlace', 'secondPlace', 'thirdPlace'];
    
    positions.forEach((positionId, index) => {
      const element = document.getElementById(positionId);
      const player = topPlayers[index];
      
      if (player) {
        const avatar = element.querySelector('.avatar-podium');
        const username = element.querySelector('.podium-username');
        const rating = element.querySelector('.podium-rating');
        
        avatar.textContent = this.generateAvatar(player.username);
        username.textContent = player.username;
        rating.textContent = player.eloRating;
      } else {
        // Ascunde poziția dacă nu există jucător
        element.style.opacity = '0.3';
        const avatar = element.querySelector('.avatar-podium');
        const username = element.querySelector('.podium-username');
        const rating = element.querySelector('.podium-rating');
        
        avatar.textContent = '--';
        username.textContent = 'N/A';
        rating.textContent = '0';
      }
    });
  }
  
  async loadFullLeaderboard() {
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: 50,
        search: this.searchQuery
      });
      
      const gameParam = this.currentGame === 'all' ? '' : `/${this.currentGame}`;
      const response = await fetch(`/api/leaderboard${gameParam}?${params}`);
      
      if (!response.ok) {
        throw new Error('Eroare la încărcarea leaderboard-ului');
      }
      
      const data = await response.json();
      this.displayLeaderboardTable(data.data);
      this.displayPagination(data.pagination);
    } catch (error) {
      console.error('Eroare la încărcarea leaderboard-ului:', error);
      this.showError('Nu s-a putut încărca leaderboard-ul');
    }
  }
  
  displayLeaderboardTable(players) {
    const tbody = document.getElementById('leaderboardTableBody');
    
    if (players.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Nu s-au găsit jucători.</td></tr>';
      return;
    }
    
    tbody.innerHTML = players.map(player => {
      const winRateClass = player.winRate >= 70 ? 'win-rate-high' :
                          player.winRate >= 40 ? 'win-rate-medium' : 'win-rate-low';
      
      const lastPlayed = new Date(player.lastPlayed).toLocaleDateString('ro-RO', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      const rankClass = player.rank <= 3 ? 'top-3' : '';
      
      return `
        <tr>
          <td class="rank-cell ${rankClass}">#${player.rank}</td>
          <td class="player-cell">
            <div class="player-avatar">${this.generateAvatar(player.username)}</div>
            <div class="player-info">
              <div class="player-name">${player.username}</div>
              <div class="player-type">${player.userType}</div>
            </div>
          </td>
          <td class="rating-cell">${player.eloRating}</td>
          <td>${player.gamesPlayed}</td>
          <td>${player.wins}</td>
          <td class="win-rate-cell ${winRateClass}">${player.winRate.toFixed(1)}%</td>
          <td class="last-played-cell">${lastPlayed}</td>
        </tr>
      `;
    }).join('');
  }
  
  displayPagination(pagination) {
    const container = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }
    
    let paginationHTML = '';
    
    // Buton Previous
    paginationHTML += `
      <button class="pagination-btn" ${pagination.currentPage === 1 ? 'disabled' : ''} 
              onclick="window.leaderboardManager.changePage(${pagination.currentPage - 1})">
        &#8249;
      </button>
    `;
    
    // Numerele paginilor
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="pagination-btn ${i === pagination.currentPage ? 'active' : ''}"
                onclick="window.leaderboardManager.changePage(${i})">
          ${i}
        </button>
      `;
    }
    
    // Buton Next
    paginationHTML += `
      <button class="pagination-btn" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} 
              onclick="window.leaderboardManager.changePage(${pagination.currentPage + 1})">
        &#8250;
      </button>
    `;
    
    // Info paginare
    paginationHTML += `
      <div class="pagination-info">
        ${((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-${Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} 
        din ${pagination.totalItems}
      </div>
    `;
    
    container.innerHTML = paginationHTML;
  }
  
  setupEventListeners() {
    // Filter buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        // Actualizează butoanele active
        document.querySelectorAll('.filter-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // Schimbă jocul curent
        this.currentGame = e.target.dataset.game;
        this.currentPage = 1;
        this.loadLeaderboard();
      }
    });
    
    // Search input
    const searchInput = document.getElementById('searchPlayer');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.loadFullLeaderboard();
      }, 500);
    });
  }
  
  changePage(page) {
    this.currentPage = page;
    this.loadFullLeaderboard();
  }
  
  showError(message) {
    console.error(message);
    alert(message); // Temporar - înlocuiește cu un sistem mai elegant
  }
}

// Funcții globale pentru interfață (identice cu profile.js)
function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('show');
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

// Inițializează LeaderboardManager când pagina se încarcă
document.addEventListener('DOMContentLoaded', () => {
  window.leaderboardManager = new LeaderboardManager();
});

// ACTUALIZARE APP.JS - Adaugă rutele noi
// Adaugă în app.js după rutele existente:

const profileRoutes = require('./routes/profileRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');

// Adaugă rutele
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);