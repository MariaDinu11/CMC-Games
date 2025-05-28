document.addEventListener('DOMContentLoaded', () => {
  const chatManager = new UniversalChatManager('carcassonne');
  window.chatManager = chatManager;
  
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('show');
}