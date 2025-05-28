// UNIVERSAL-CHAT.JS - Chat universal pentru toate jocurile
class UniversalChatManager {
  constructor(gameRoom) {
    this.socket = io();
    this.gameRoom = gameRoom || this.detectGameRoom(); // Auto-detectează jocul
    this.currentUser = this.getCurrentUser();
    
    if (!this.currentUser) {
      this.redirectToLogin();
      return;
    }
    
    this.initializeChat();
  }

  // Detectează automat jocul pe baza URL-ului sau paginii
  detectGameRoom() {
    const currentPath = window.location.pathname;
    const currentFile = window.location.href;
    
    if (currentPath.includes('carcassonne') || currentFile.includes('carcassonne')) {
      return 'carcassonne';
    } else if (currentPath.includes('football') || currentFile.includes('football')) {
      return 'football';
    } else if (currentPath.includes('tank') || currentFile.includes('tank')) {
      return 'tank-wars';
    } else {
      // Fallback - încearcă să detecteze din titlul paginii sau alt element
      const pageTitle = document.title.toLowerCase();
      if (pageTitle.includes('football')) return 'football';
      if (pageTitle.includes('tank')) return 'tank-wars';
      if (pageTitle.includes('carcassonne')) return 'carcassonne';
      
      // Default fallback
      return 'general';
    }
  }

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      const authToken = localStorage.getItem('authToken');
      
      if (!userStr || !authToken) {
        console.log('Nu există date de autentificare');
        return null;
      }
      
      const userData = JSON.parse(userStr);
      
      if (!userData.username) {
        console.log('Nu există username în datele utilizatorului');
        return null;
      }
      
      return {
        username: userData.username,
        email: userData.email || '',
        avatar: this.generateAvatar(userData.username),
        authToken: authToken
      };
      
    } catch (error) {
      console.error('Eroare la obținerea datelor utilizatorului:', error);
      return null;
    }
  }

  redirectToLogin() {
    alert('Trebuie să te autentifici pentru a accesa chat-ul');
    window.location.href = '../html/login.html';
  }

  generateAvatar(username) {
    return username.substring(0, 2).toUpperCase();
  }

  initializeChat() {
    console.log(`Utilizator autentificat: ${this.currentUser.username} în camera: ${this.gameRoom}`);
    
    this.socket.auth = {
      token: this.currentUser.authToken,
      username: this.currentUser.username
    };
    
    this.socket.emit('join-game', this.gameRoom);

    this.socket.on('connect_error', (error) => {
      console.error('Eroare de conectare:', error.message);
      if (error.message.includes('autentificare') || error.message.includes('token')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.redirectToLogin();
      }
    });

    this.socket.on('chat-history', (messages) => {
      this.displayChatHistory(messages);
    });

    this.socket.on('new-message', (messageData) => {
      this.displayNewMessage(messageData);
    });

    // Ascultă pentru numărul de utilizatori online
    this.socket.on('users-count', (count) => {
      this.updateOnlineCount(count);
    });

    this.setupChatInput();
    this.updateChatTitle();
  }

  updateChatTitle() {
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
      const gameNames = {
        'carcassonne': 'CARCASSONNE CHAT',
        'football': 'FOOTBALL CHAT',
        'tank-wars': 'TANK WARS CHAT',
        'general': 'LIVE CHAT'
      };
      chatTitle.textContent = gameNames[this.gameRoom] || 'LIVE CHAT';
    }
  }

  updateOnlineCount(count) {
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
      chatTitle.setAttribute('data-online-count', `${count} online`);
    }
  }

  displayChatHistory(messages) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
      console.error('Nu s-a găsit elementul .chat-messages');
      return;
    }
    
    chatMessages.innerHTML = '';

    messages.forEach(message => {
      this.displayMessage({
        username: message.username,
        message: message.message,
        avatar: message.avatar,
        timestamp: new Date(message.timestamp)
      });
    });

    this.scrollToBottom();
  }

  displayNewMessage(messageData) {
    this.displayMessage(messageData);
    this.scrollToBottom();
    this.showNewMessageNotification();
  }

  displayMessage(data) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    const timeAgo = this.formatTimeAgo(data.timestamp);
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const isOwnMessage = data.username === this.currentUser.username;
    if (isOwnMessage) {
      messageElement.classList.add('own-message');
    }
    
    messageElement.innerHTML = `
      <div class="chat-avatar" style="background-color: ${this.getAvatarColor(data.username)}">${data.avatar}</div>
      <div class="chat-bubble">
        <div class="chat-user">${data.username}${isOwnMessage ? ' (tu)' : ''}<span class="chat-time">${timeAgo}</span></div>
        <div class="chat-text">${this.escapeHtml(data.message)}</div>
      </div>
    `;
    
    chatMessages.appendChild(messageElement);
  }

  setupChatInput() {
    const chatInput = document.querySelector('.chat-input input');
    const chatButton = document.querySelector('.chat-input button');

    if (!chatInput || !chatButton) {
      console.error('Nu s-au găsit elementele chat-ului în DOM');
      return;
    }

    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    chatButton.addEventListener('click', () => {
      this.sendMessage();
    });

    chatInput.placeholder = `Scrie un mesaj în ${this.getGameDisplayName()}...`;
  }

  getGameDisplayName() {
    const gameNames = {
      'carcassonne': 'Carcassonne',
      'football': 'Football',
      'tank-wars': 'Tank Wars',
      'general': 'chat'
    };
    return gameNames[this.gameRoom] || 'chat';
  }

  sendMessage() {
    const chatInput = document.querySelector('.chat-input input');
    const message = chatInput.value.trim();

    if (message === '') return;
    
    if (message.length > 500) {
      alert('Mesajul este prea lung (maxim 500 caractere)');
      return;
    }

    this.socket.emit('send-message', {
      username: this.currentUser.username,
      message: message,
      avatar: this.currentUser.avatar,
      gameRoom: this.gameRoom
    });

    chatInput.value = '';
  }

  showNewMessageNotification() {
    // Dacă fereastra nu e în focus, arată notificare
    if (document.hidden) {
      if (Notification.permission === 'granted') {
        new Notification(`Mesaj nou în ${this.getGameDisplayName()}`, {
          body: 'Ai primit un mesaj nou în chat',
          icon: '../assets/logo.png'
        });
      }
    }
  }

  scrollToBottom() {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageTime) / 1000);

    if (diffInSeconds < 60) return 'acum';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m în urmă`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h în urmă`;
    return `${Math.floor(diffInSeconds / 86400)}z în urmă`;
  }

  getAvatarColor(username) {
    const colors = ['#9C5EAF', '#4CD964', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    this.socket.disconnect();
    window.location.href = '../html/login.html';
  }
}