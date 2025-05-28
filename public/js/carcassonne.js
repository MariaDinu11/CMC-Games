document.addEventListener('DOMContentLoaded', () => {
  const chatManager = new UniversalChatManager('carcassonne');
  window.chatManager = chatManager;
  
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
});