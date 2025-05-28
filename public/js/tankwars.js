document.addEventListener('DOMContentLoaded', () => {
  const chatManager = new UniversalChatManager('tank-wars');
  window.chatManager = chatManager;
  
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
});