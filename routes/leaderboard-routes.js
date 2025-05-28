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

// GET /api/leaderboard/:gameId? - Obține leaderboard-ul
router.get('/:gameId?', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Construiește query-ul
    let matchQuery = {};
    if (gameId && gameId !== 'all') {
      matchQuery.gameId = gameId;
    }
    
    // Pipeline pentru agregare
    const pipeline = [
      { $match: matchQuery },
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
    console.error('Eroare la obținerea leaderboard-ului:', error);
    res.status(500).json({ error: 'Eroare server' });
  }
});

// GET /api/leaderboard/top/:gameId? - Obține top 3 pentru podium
router.get('/top/:gameId?', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    let matchQuery = {};
    if (gameId && gameId !== 'all') {
      matchQuery.gameId = gameId;
    }
    
    const pipeline = [
      { $match: matchQuery },
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
          gamesPlayed: { $gte: 1 } // Doar jucători care au jucat cel puțin un joc
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

module.exports = router;