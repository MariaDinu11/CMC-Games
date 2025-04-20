const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Cheie secretă pentru semnarea token-urilor JWT
// În producție, această cheie ar trebui stocată în variabile de mediu
const JWT_SECRET = process.env.JWT_SECRET || 'cmc_games_secret_key';
const JWT_EXPIRES_IN = '24h'; // Token-ul va expira după 24 de ore

// Controller pentru înregistrare
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verifică dacă utilizatorul există deja
    const userExists = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: userExists.username === username 
          ? 'Acest nume de utilizator este deja folosit' 
          : 'Această adresă de email este deja folosită' 
      });
    }

    // Criptează parola
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Creează un nou utilizator
    const user = new User({
      username,
      email,
      passwordHash,
      userType: 'player' // Implicit, toți utilizatorii noi sunt jucători
    });

    // Salvează utilizatorul în baza de date
    await user.save();

    // Creează și returnează token JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username, userType: user.userType },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Utilizator înregistrat cu succes',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Eroare la înregistrare:', error);
    res.status(500).json({ success: false, message: 'Eroare la înregistrare', error: error.message });
  }
};

// Controller pentru autentificare
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Caută utilizatorul după username
    const user = await User.findOne({ username });

    // Verifică dacă utilizatorul există
    if (!user) {
      return res.status(401).json({ success: false, message: 'Nume de utilizator sau parolă incorecte' });
    }

    // Verifică dacă contul este activ
    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: `Contul dvs. este ${user.status === 'suspended' ? 'suspendat' : 'banat'}. Contactați un administrator.` 
      });
    }

    // Verifică dacă parola este corectă
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Nume de utilizator sau parolă incorecte' });
    }

    // Creează și returnează token JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username, userType: user.userType },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Autentificare reușită',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Eroare la autentificare:', error);
    res.status(500).json({ success: false, message: 'Eroare la autentificare', error: error.message });
  }
};

// Controller pentru verificarea token-ului
exports.verifyToken = (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Token valid',
    user: req.user // Info utilizator adăugat de middleware-ul de autentificare
  });
};

// Controller pentru delogare
// Notă: În arhitecturi stateless JWT, delogarea se face de obicei pe client prin ștergerea token-ului
exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Delogare reușită' });
};