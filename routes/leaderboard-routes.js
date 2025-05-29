const express = require('express');
const User = require('../models/User');
const Rating = require('../models/Rating');
const Game = require('../models/Game');

const router = express.Router();

// GET /api/leaderboard/games - Obține lista jocurilor pentru filter
router.get('/games', async (req, res) => {
  try {
    const games = await Game.find({ status: 'active' })
      .select('_id gameName gameType')
      .sort({ gameName: 1 });
    
    res.json(games);
  } catch (error) {
    console.error('Eroare la obținerea jocurilor:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

// GET /api/leaderboard/top - Top 3 pentru toate jocurile
router.get('/top', async (req, res) => {
  try {
    const pipeline = [
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
          gamesPlayed: { $gte: 1 }
        }
      },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$user.username' },
          userType: { $first: '$user.userType' },
          avgRating: { $avg: '$eloRating' },
          totalGames: { $sum: '$gamesPlayed' },
          totalWins: { $sum: '$wins' }
        }
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $gt: ['$totalGames', 0] },
              { $multiply: [{ $divide: ['$totalWins', '$totalGames'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { avgRating: -1 } },
      { $limit: 3 },
      {
        $project: {
          userId: '$_id',
          username: 1,
          userType: 1,
          eloRating: { $round: '$avgRating' },
          gamesPlayed: '$totalGames',
          wins: '$totalWins',
          winRate: 1
        }
      }
    ];
    
    const topPlayers = await Rating.aggregate(pipeline);
    res.json(topPlayers);
  } catch (error) {
    console.error('Eroare la obținerea top jucătorilor:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

// GET /api/leaderboard/top/:gameId - Top 3 pentru un joc specific
router.get('/top/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Convertește gameId la ObjectId pentru MongoDB
    const mongoose = require('mongoose');
    const gameObjectId = new mongoose.Types.ObjectId(gameId);
    
    const pipeline = [
      { $match: { gameId: gameObjectId } },
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
          gamesPlayed: { $gte: 1 }
        }
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $gt: ['$gamesPlayed', 0] },
              { $multiply: [{ $divide: ['$wins', '$gamesPlayed'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { eloRating: -1 } },
      { $limit: 3 },
      {
        $project: {
          userId: '$user._id',
          username: '$user.username',
          userType: '$user.userType',
          eloRating: 1,
          gamesPlayed: 1,
          wins: 1,
          winRate: 1
        }
      }
    ];
    
    const topPlayers = await Rating.aggregate(pipeline);
    res.json(topPlayers);
  } catch (error) {
    console.error('Eroare la obținerea top jucătorilor:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

// GET /api/leaderboard/ - Clasament global (toate jocurile)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Pipeline pentru agregarea rating-ului mediu per utilizator
    const pipeline = [
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
          gamesPlayed: { $gt: 0 },
          ...(search && {
            'user.username': { $regex: search, $options: 'i' }
          })
        }
      },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$user.username' },
          userType: { $first: '$user.userType' },
          avgRating: { $avg: '$eloRating' },
          totalGames: { $sum: '$gamesPlayed' },
          totalWins: { $sum: '$wins' },
          totalLosses: { $sum: '$losses' },
          totalDraws: { $sum: '$draws' },
          lastPlayed: { $max: '$lastPlayed' }
        }
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $gt: ['$totalGames', 0] },
              { $multiply: [{ $divide: ['$totalWins', '$totalGames'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { avgRating: -1 } }
    ];
    
    // Obține totalul pentru paginare
    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Rating.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;
    
    // Obține datele pentru pagina curentă
    const dataPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          userId: '$_id',
          username: 1,
          userType: 1,
          eloRating: { $round: '$avgRating' },
          gamesPlayed: '$totalGames',
          wins: '$totalWins',
          losses: '$totalLosses',
          draws: '$totalDraws',
          winRate: 1,
          lastPlayed: 1
        }
      }
    ];
    
    const leaderboardData = await Rating.aggregate(dataPipeline);
    
    // Adaugă rank-urile
    const rankedData = leaderboardData.map((player, index) => ({
      ...player,
      rank: skip + index + 1
    }));
    
    res.json({
      data: rankedData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Eroare la obținerea leaderboard-ului global:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

// GET /api/leaderboard/:gameId - Clasament pentru un joc specific
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Convertește gameId la ObjectId pentru MongoDB
    const mongoose = require('mongoose');
    const gameObjectId = new mongoose.Types.ObjectId(gameId);
    
    // Pipeline pentru un joc specific
    const pipeline = [
      { $match: { gameId: gameObjectId } },
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
        $lookup: {
          from: 'games',
          localField: 'gameId',
          foreignField: '_id',
          as: 'game'
        }
      },
      { $unwind: '$game' },
      {
        $match: {
          'user.status': 'active',
          gamesPlayed: { $gt: 0 },
          ...(search && {
            'user.username': { $regex: search, $options: 'i' }
          })
        }
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $gt: ['$gamesPlayed', 0] },
              { $multiply: [{ $divide: ['$wins', '$gamesPlayed'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { eloRating: -1 } }
    ];
    
    // Obține totalul pentru paginare
    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Rating.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;
    
    // Obține datele pentru pagina curentă
    const dataPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          userId: '$user._id',
          username: '$user.username',
          userType: '$user.userType',
          eloRating: 1,
          gamesPlayed: 1,
          wins: 1,
          losses: 1,
          draws: 1,
          winRate: 1,
          lastPlayed: 1,
          gameName: '$game.gameName',
          gameType: '$game.gameType'
        }
      }
    ];
    
    const leaderboardData = await Rating.aggregate(dataPipeline);
    
    // Adaugă rank-urile
    const rankedData = leaderboardData.map((player, index) => ({
      ...player,
      rank: skip + index + 1
    }));
    
    res.json({
      data: rankedData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Eroare la obținerea leaderboard-ului pentru joc:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

module.exports = router;