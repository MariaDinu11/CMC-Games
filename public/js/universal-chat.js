class UniversalChatManager {
  constructor(gameRoom) {
    this.socket = io();
    this.gameRoom = gameRoom || this.detectGameRoom();
    this.currentUser = this.getCurrentUser();
    
    if (!this.currentUser) {
      this.redirectToLogin();
      return;
    }
    
    this.initializeChat();
  }

  detectGameRoom() {
    const currentPath = window.location.pathname;
    const currentFile = window.location.href;
    
    if (currentPath.includes('carcassonne') || currentFile.includes('carcassonne')) {
      return 'carcassonne';
    } else if (currentPath.includes('football') || currentFile.includes('football')) {
      return 'football';
    } else if (currentPath.includes('tank') || currentFile.includes('tank')) {
      return 'tank-wars';
    }
    
    return 'general';
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
        userType: userData.userType || 'player',
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
    
    // Reconectează automat dacă se pierde conexiunea
    this.socket.on('connect', () => {
      this.socket.emit('join-game', this.gameRoom);
    });

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

    this.socket.on('users-count', (count) => {
      this.updateOnlineCount(count);
    });

    this.socket.on('message-moderated', (data) => {
      this.handleMessageModeration(data);
    });

    this.socket.on('error', (message) => {
      this.showError(message);
    });

    this.setupChatInput();
    this.updateChatTitle();
    
    // Dacă e moderator/admin, adaugă funcționalități suplimentare
    if (this.currentUser.userType === 'moderator' || this.currentUser.userType === 'admin') {
      this.setupModerationFeatures();
    }
  }

  updateChatTitle() {
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
      const gameNames = {
        'carcassonne': 'CARCASSONNE CHAT',
        'football': 'FOOTBALL CHAT',
        'tank-wars': 'TANK WARS CHAT',
        'general': 'CHAT GENERAL'
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
      this.displayMessage(message, false);
    });

    this.scrollToBottom();
  }

  displayNewMessage(messageData) {
    this.displayMessage(messageData, true);
    this.scrollToBottom();
    this.showNewMessageNotification();
  }

  displayMessage(data, isNew = false) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    const timeAgo = this.formatTimeAgo(data.timestamp);
    const isOwnMessage = data.username === this.currentUser.username;
    const canModerate = (this.currentUser.userType === 'moderator' || this.currentUser.userType === 'admin') && !isOwnMessage;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.dataset.messageId = data._id || '';
    messageElement.dataset.timestamp = data.timestamp;
    
    if (isOwnMessage) {
      messageElement.classList.add('own-message');
    }
    
    if (isNew) {
      messageElement.classList.add('new-message');
    }
    
    if (data.isModerated) {
      messageElement.classList.add('moderated-message');
    }
    
    // Opțiuni de moderare pentru moderatori/admini
    const moderationOptions = canModerate && !data.isModerated ? `
      <div class="message-options">
        <button onclick="window.chatManager.moderateMessage('${data._id}')" title="Moderează mesajul" class="moderate-btn">⚠️</button>
      </div>
    ` : '';
    
    const moderatedIndicator = data.isModerated ? `<span class="moderated-indicator" title="Mesaj moderat">🚫</span>` : '';
    
    messageElement.innerHTML = `
      <div class="chat-avatar" style="background-color: ${this.getAvatarColor(data.username)}">${data.avatar}</div>
      <div class="chat-bubble">
        <div class="chat-user">
          ${data.username}${isOwnMessage ? ' (tu)' : ''}
          <span class="chat-time">${timeAgo}</span>
          ${moderatedIndicator}
        </div>
        <div class="chat-text ${data.isModerated ? 'moderated-content' : ''}">${data.isModerated ? '[Mesaj moderat]' : this.escapeHtml(data.message)}</div>
        ${moderationOptions}
      </div>
    `;
    
    chatMessages.appendChild(messageElement);
  }

  setupModerationFeatures() {
    // Adaugă un indicator că utilizatorul este moderator
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
      const moderatorBadge = document.createElement('span');
      moderatorBadge.className = 'moderator-badge';
      moderatorBadge.textContent = this.currentUser.userType.toUpperCase();
      moderatorBadge.title = 'Ai permisiuni de moderare';
      chatTitle.appendChild(moderatorBadge);
    }
  }

  moderateMessage(messageId) {
    const reason = prompt('Motivul moderării (opțional):');
    if (reason !== null) { // Nu a fost anulat
      this.socket.emit('moderate-message', {
        messageId: messageId,
        reason: reason.trim() || 'Conținut neadecvat'
      });
    }
  }

  handleMessageModeration(data) {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
      messageElement.classList.add('moderated-message');
      const textElement = messageElement.querySelector('.chat-text');
      if (textElement) {
        textElement.textContent = '[Mesaj moderat]';
        textElement.classList.add('moderated-content');
      }
      
      // Adaugă indicatorul de moderare
      const userElement = messageElement.querySelector('.chat-user');
      if (userElement && !userElement.querySelector('.moderated-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'moderated-indicator';
        indicator.textContent = '🚫';
        indicator.title = `Moderat de ${data.moderatedBy}: ${data.reason}`;
        userElement.appendChild(indicator);
      }
    }
  }

  showError(message) {
    // Poți personaliza acest sistem de notificări
    console.error('Eroare chat:', message);
    // Opțional: arată o notificare vizuală
    const notification = document.createElement('div');
    notification.className = 'chat-error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
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
      message: message,
      gameRoom: this.gameRoom
    });

    chatInput.value = '';
  }

  showNewMessageNotification() {
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