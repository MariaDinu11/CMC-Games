// permissions.js
// Sistem de permisiuni pentru diferite tipuri de utilizatori

// Definim permisiunile disponibile în sistem
const PERMISSIONS = {
    // Permisiuni pentru jocuri
    PLAY_GAMES: 'play_games',
    SPECTATE_GAMES: 'spectate_games',
    
    // Permisiuni pentru chat
    USE_CHAT: 'use_chat',
    MODERATE_CHAT: 'moderate_chat',
    
    // Permisiuni pentru conținut
    CREATE_CONTENT: 'create_content',
    EDIT_OWN_CONTENT: 'edit_own_content',
    EDIT_ANY_CONTENT: 'edit_any_content',
    
    // Permisiuni pentru utilizatori
    VIEW_PROFILES: 'view_profiles',
    EDIT_OWN_PROFILE: 'edit_own_profile',
    SUSPEND_USERS: 'suspend_users',
    BAN_USERS: 'ban_users',
    
    // Permisiuni administrative
    MANAGE_USERS: 'manage_users',
    MANAGE_SITE_SETTINGS: 'manage_site_settings',
    VIEW_SITE_STATISTICS: 'view_site_statistics'
  };
  
  // Definim permisiunile pentru fiecare tip de utilizator
  const userTypePermissions = {
    player: [
      PERMISSIONS.PLAY_GAMES,
      PERMISSIONS.SPECTATE_GAMES,
      PERMISSIONS.USE_CHAT,
      PERMISSIONS.VIEW_PROFILES,
      PERMISSIONS.EDIT_OWN_PROFILE,
      PERMISSIONS.CREATE_CONTENT,
      PERMISSIONS.EDIT_OWN_CONTENT
    ],
    
    spectator: [
      PERMISSIONS.SPECTATE_GAMES,
      PERMISSIONS.USE_CHAT,
      PERMISSIONS.VIEW_PROFILES
    ],
    
    moderator: [
      PERMISSIONS.PLAY_GAMES,
      PERMISSIONS.SPECTATE_GAMES,
      PERMISSIONS.USE_CHAT,
      PERMISSIONS.MODERATE_CHAT,
      PERMISSIONS.VIEW_PROFILES,
      PERMISSIONS.EDIT_OWN_PROFILE,
      PERMISSIONS.CREATE_CONTENT,
      PERMISSIONS.EDIT_OWN_CONTENT,
      PERMISSIONS.EDIT_ANY_CONTENT,
      PERMISSIONS.SUSPEND_USERS,
      PERMISSIONS.VIEW_SITE_STATISTICS
    ],
    
    admin: [
      // Administratorul are toate permisiunile
      ...Object.values(PERMISSIONS)
    ]
  };
  
  // Middleware pentru verificarea permisiunilor
  const checkPermission = (permission) => {
    return (req, res, next) => {
      // Verifică dacă utilizatorul este autentificat
      if (!req.user) {
        return res.status(401).json({ message: 'Autentificare necesară' });
      }
      
      // Obține tipul utilizatorului din obiectul req.user
      const userType = req.user.userType;
      
      // Verifică dacă tipul de utilizator are permisiunea cerută
      if (!userTypePermissions[userType] || !userTypePermissions[userType].includes(permission)) {
        return res.status(403).json({ message: 'Acces interzis. Nu aveți permisiunea necesară.' });
      }
      
      // Dacă utilizatorul are permisiunea, permite accesul la următorul middleware/controller
      next();
    };
  };
  
  module.exports = {
    PERMISSIONS,
    userTypePermissions,
    checkPermission
  };