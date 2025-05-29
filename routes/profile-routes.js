// routes/profileRoutes.js - Versiunea corectată folosind middleware-ul existent
const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Rating = require('../models/Rating');
const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const PlayerSession = require('../models/PlayerSession');

// Importă middleware-ul de autentificare existent
const authenticateUser = require('../middleware/auth'); // Ajustează calea dacă este diferită

const router = express.Router();

// GET /api/profile - Obține profilul utilizatorului curent
router.get('/', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    console.log('Încărcare profil pentru:', user.username);
    
    // Obține toate rating-urile utilizatorului
    const ratings = await Rating.find({ userId: user.id })
      .populate('gameId', 'gameName gameType');
    
    console.log('Rating-uri găsite:', ratings.length);
    
    // Calculează statistici generale
    const totalGames = ratings.reduce((sum, rating) => sum + rating.gamesPlayed, 0);
    const totalWins = ratings.reduce((sum, rating) => sum + rating.wins, 0);
    const totalLosses = ratings.reduce((sum, rating) => sum + rating.losses, 0);
    const totalDraws = ratings.reduce((sum, rating) => sum + rating.draws, 0);
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const avgRating = ratings.length > 0 ? 
      Math.round(ratings.reduce((sum, rating) => sum + rating.eloRating, 0) / ratings.length) : 1200;
    
    // Calculează poziția în clasamentul global
    let globalRank = null;
    if (ratings.length > 0) {
      const betterPlayers = await Rating.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $match: {
            'user.status': 'active',
            'gamesPlayed': { $gt: 0 }
          }
        },
        {
          $group: {
            _id: '$userId',
            avgRating: { $avg: '$eloRating' }
          }
        },
        {
          $match: {
            avgRating: { $gt: avgRating }
          }
        },
        { $count: "count" }
      ]);
      
      globalRank = (betterPlayers.length > 0 ? betterPlayers[0].count : 0) + 1;
    }
    
    // Jocuri recente din PlayerSession
    const recentSessions = await PlayerSession.find({ userId: user.id })
      .populate({
        path: 'sessionId',
        populate: {
          path: 'gameId',
          select: 'gameName gameType'
        }
      })
      .sort({ joinedAt: -1 })
      .limit(10);
    
    const recentGames = recentSessions
      .filter(session => session.sessionId && session.sessionId.gameId) // Filtrează sesiunile valide
      .map(session => ({
        id: session._id,
        gameName: session.sessionId.gameId.gameName,
        gameType: session.sessionId.gameId.gameType,
        result: session.result,
        score: session.score,
        date: session.joinedAt
      }));
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        status: user.status,
        createdAt: user.createdAt
      },
      stats: {
        totalGames,
        totalWins,
        totalLosses,
        totalDraws,
        winRate,
        avgRating,
        globalRank
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
    res.status(500).json({ error: 'Eroare server', details: error.message });
  }
});

// GET /api/profile/user/:userId - Obține profilul public al unui utilizator
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-passwordHash -email');
    if (!user) {
      return res.status(404).json({ error: 'Utilizatorul nu a fost găsit' });
    }
    
    if (user.status !== 'active') {
      return res.status(404).json({ error: 'Utilizatorul nu este activ' });
    }
    
    // Obține statisticile publice
    const ratings = await Rating.find({ userId: user._id })
      .populate('gameId', 'gameName gameType');
    
    const totalGames = ratings.reduce((sum, rating) => sum + rating.gamesPlayed, 0);
    const totalWins = ratings.reduce((sum, rating) => sum + rating.wins, 0);
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const avgRating = ratings.length > 0 ? 
      Math.round(ratings.reduce((sum, rating) => sum + rating.eloRating, 0) / ratings.length) : 1200;
    
    // Jocuri recente (ultimele 5 pentru profil public)
    const recentSessions = await PlayerSession.find({ userId: user._id })
      .populate({
        path: 'sessionId',
        populate: {
          path: 'gameId',
          select: 'gameName gameType'
        }
      })
      .sort({ joinedAt: -1 })
      .limit(5);
    
    const recentGames = recentSessions
      .filter(session => session.sessionId && session.sessionId.gameId)
      .map(session => ({
        id: session._id,
        gameName: session.sessionId.gameId.gameName,
        gameType: session.sessionId.gameId.gameType,
        result: session.result,
        date: session.joinedAt
      }));
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        userType: user.userType,
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
        winRate: rating.gamesPlayed > 0 ? 
          Math.round((rating.wins / rating.gamesPlayed) * 100) : 0,
        lastPlayed: rating.lastPlayed
      })),
      recentGames
    });
  } catch (error) {
    console.error('Eroare la obținerea profilului public:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

// PUT /api/profile - Actualizează profilul
router.put('/', authenticateUser, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Validări
    if (!username || !email) {
      return res.status(400).json({ error: 'Username și email sunt obligatorii' });
    }
    
    // Verifică parola actuală dacă se încearcă schimbarea parolei
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Parola actuală este necesară' });
      }
      
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Parola actuală este incorectă' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Parola nouă trebuie să aibă cel puțin 6 caractere' });
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
      user.id,
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

// GET /api/profile/stats/detailed - Statistici detaliate pentru dashboard
router.get('/stats/detailed', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    
    // Statistici per joc cu evoluția rating-ului
    const gameStats = await Rating.find({ userId: user.id })
      .populate('gameId', 'gameName gameType');
    
    // Activitatea recentă (ultimele 30 de zile)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivity = await PlayerSession.find({
      userId: user.id,
      joinedAt: { $gte: thirtyDaysAgo }
    }).populate({
      path: 'sessionId',
      populate: {
        path: 'gameId',
        select: 'gameName'
      }
    });
    
    // Grupează activitatea pe zile
    const activityByDay = {};
    recentActivity.forEach(session => {
      const day = session.joinedAt.toISOString().split('T')[0];
      if (!activityByDay[day]) {
        activityByDay[day] = 0;
      }
      activityByDay[day]++;
    });
    
    res.json({
      gameStats: gameStats.map(stat => ({
        gameName: stat.gameId.gameName,
        gameType: stat.gameId.gameType,
        rating: stat.eloRating,
        gamesPlayed: stat.gamesPlayed,
        wins: stat.wins,
        losses: stat.losses,
        draws: stat.draws,
        winRate: stat.gamesPlayed > 0 ? (stat.wins / stat.gamesPlayed * 100).toFixed(1) : 0,
        lastPlayed: stat.lastPlayed
      })),
      activityByDay,
      totalRecentGames: recentActivity.length
    });
  } catch (error) {
    console.error('Eroare la obținerea statisticilor detaliate:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

module.exports = router;