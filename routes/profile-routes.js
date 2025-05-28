// ROUTES/PROFILE-ROUTES.JS - API routes pentru profil
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Rating = require('../models/Rating');
const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const PlayerSession = require('../models/PlayerSession');

const router = express.Router();

// Middleware pentru verificarea token-ului (implementează în funcție de sistemul tău)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acces necesar' });
    }
    
    // Aici implementezi verificarea JWT token-ului
    // Pentru simplitate, vom presupune că token-ul conține user ID-ul
    const userId = token; // În realitate, ar trebui să decodezi JWT
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 'Token invalid' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token invalid' });
  }
};

// GET /api/profile - Obține profilul utilizatorului curent
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Obține statisticile generale
    const ratings = await Rating.find({ userId: user._id })
      .populate('gameId', 'gameName gameType');
    
    // Calculează statistici generale
    const totalGames = ratings.reduce((sum, rating) => sum + rating.gamesPlayed, 0);
    const totalWins = ratings.reduce((sum, rating) => sum + rating.wins, 0);
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const avgRating = ratings.length > 0 ? 
      Math.round(ratings.reduce((sum, rating) => sum + rating.eloRating, 0) / ratings.length) : 1200;
    
    // Jocuri recente
    const recentSessions = await PlayerSession.find({ userId: user._id })
      .populate({
        path: 'sessionId',
        populate: {
          path: 'gameId',
          select: 'gameName gameType'
        }
      })
      .sort({ joinedAt: -1 })
      .limit(10);
    
    const recentGames = recentSessions.map(session => ({
      id: session._id,
      gameName: session.sessionId.gameId.gameName,
      gameType: session.sessionId.gameId.gameType,
      result: session.result,
      score: session.score,
      date: session.joinedAt
    }));
    
    res.json({
      user: {
        username: user.username,
        email: user.email,
        userType: user.userType,
        status: user.status,
        createdAt: user.createdAt
      },
      stats: {
        totalGames,
        totalWins,
        winRate,
        avgRating
      },
      gameStats: ratings.map(rating => ({
        gameId: rating.gameId._id,
        gameName: rating.gameId.gameName,
        gameType: rating.gameId.gameType,
        eloRating: rating.eloRating,
        gamesPlayed: rating.gamesPlayed,
        wins: rating.wins,
        losses: rating.losses,
        draws: rating.draws,
        winRate: rating.gamesPlayed > 0 ? 
          Math.round((rating.wins / rating.gamesPlayed) * 100) : 0,
        lastPlayed: rating.lastPlayed
      })),
      recentGames
    });
  } catch (error) {
    console.error('Eroare la obținerea profilului:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

// PUT /api/profile - Actualizează profilul
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Verifică parola actuală dacă se încearcă schimbarea parolei
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Parola actuală este necesară' });
      }
      
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Parola actuală este incorectă' });
      }
    }
    
    // Verifică unicitatea username-ului și email-ului
    if (username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username-ul este deja folosit' });
      }
    }
    
    if (email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email-ul este deja folosit' });
      }
    }
    
    // Actualizează datele
    const updateData = { username, email };
    
    if (newPassword) {
      const saltRounds = 10;
      updateData.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, select: '-passwordHash' }
    );
    
    res.json({
      message: 'Profil actualizat cu succes',
      user: updatedUser
    });
  } catch (error) {
    console.error('Eroare la actualizarea profilului:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

module.exports = router;