// Acest fișier este deja creat, dar implementarea completă este prezentată aici
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Secretul pentru JWT - în producție, acesta ar trebui stocat în variabile de mediu
const JWT_SECRET = process.env.JWT_SECRET || 'cmc_games_secret_key';

// Middleware pentru autentificarea utilizatorilor
const authenticateUser = async (req, res, next) => {
  try {
    // Obține token-ul din header-ul Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Acces interzis. Token lipsă sau invalid.' });
    }
    
    // Extrage token-ul din header
    const token = authHeader.split(' ')[1];
    
    // Verifică și decodează token-ul
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Caută utilizatorul în baza de date
    const user = await User.findById(decoded.userId);
    
    // Verifică dacă utilizatorul există și nu este suspendat sau banat
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilizator negăsit.' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: `Contul dvs. este ${user.status === 'suspended' ? 'suspendat' : 'banat'}. Contactați un administrator.` 
      });
    }
    
    // Adaugă obiectul user la obiectul request pentru utilizare ulterioară
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      userType: user.userType,
      status: user.status
    };
    
    // Continuă la următorul middleware sau controller
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token invalid.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirat. Vă rugăm să vă autentificați din nou.' });
    }
    
    // Pentru alte erori
    console.error('Eroare de autentificare:', error);
    res.status(500).json({ success: false, message: 'Eroare internă de server.' });
  }
};

module.exports = authenticateUser;