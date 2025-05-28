document.addEventListener('DOMContentLoaded', () => {
  const chatManager = new UniversalChatManager('football');
  window.chatManager = chatManager;
  
  // Cere permisiunea pentru notificări
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
