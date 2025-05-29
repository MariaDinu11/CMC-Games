// scripts/populateLeaderboard.js
const mongoose = require('mongoose');

// Importă modelele
const User = require('../models/User');
const Game = require('../models/Game');
const Rating = require('../models/Rating');
const GameSession = require('../models/GameSession');
const PlayerSession = require('../models/PlayerSession');

// Conectare la MongoDB
mongoose.connect('mongodb://localhost:27017/cmc_games')
  .then(() => {
    console.log('Conectat la MongoDB');
    populateData();
  })
  .catch((err) => {
    console.error('Eroare la conectarea cu MongoDB:', err);
    process.exit(1);
  });

async function populateData() {
  try {
    console.log('🚀 Începe popularea datelor...\n');

    // 1. Creează jocurile dacă nu există
    await createGames();
    
    // 2. Creează utilizatori de test dacă nu există
    await createUsers();
    
    // 3. Creează rating-uri pentru utilizatori
    await createRatings();
    
    // 4. Creează câteva sesiuni de joc pentru istoric
    await createGameSessions();

    console.log('\n✅ Popularea datelor s-a terminat cu succes!');
    console.log('🎯 Poți acum să accesezi leaderboard-ul cu date de test.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare la popularea datelor:', error);
    process.exit(1);
  }
}

async function createGames() {
  console.log('📋 Creează jocurile...');
  
  const games = [
    {
      gameName: 'Tank Wars',
      gameType: 'Tank Wars',
      minPlayers: 2,
      maxPlayers: 4,
      allowSpectators: true,
      status: 'active'
    },
    {
      gameName: 'Carcassonne Classic',
      gameType: 'Carcassonne',
      minPlayers: 2,
      maxPlayers: 5,
      allowSpectators: true,
      status: 'active'
    },
    {
      gameName: 'Football Manager',
      gameType: 'Fotbal',
      minPlayers: 2,
      maxPlayers: 2,
      allowSpectators: true,
      status: 'active'
    }
  ];

  for (const gameData of games) {
    const existingGame = await Game.findOne({ gameName: gameData.gameName });
    if (!existingGame) {
      const game = new Game(gameData);
      await game.save();
      console.log(`  ✓ Joc creat: ${gameData.gameName}`);
    } else {
      console.log(`  - Jocul există deja: ${gameData.gameName}`);
    }
  }
}

async function createUsers() {
  console.log('\n👥 Creează utilizatori de test...');
  
  const users = [
    {
      username: 'ProGamer2024',
      email: 'progamer@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing', // Hash dummy - nu pentru producție
      userType: 'player',
      status: 'active'
    },
    {
      username: 'StrategyMaster',
      email: 'strategy@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    },
    {
      username: 'CasualPlayer',
      email: 'casual@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    },
    {
      username: 'EliteWarrior',
      email: 'elite@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    },
    {
      username: 'NinjaMaster',
      email: 'ninja@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    },
    {
      username: 'GameModerator',
      email: 'mod@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'moderator',
      status: 'active'
    },
    {
      username: 'RookiePlayer',
      email: 'rookie@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    },
    {
      username: 'VeteranGamer',
      email: 'veteran@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    },
    {
      username: 'SpeedRunner',
      email: 'speed@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    },
    {
      username: 'TacticalGenius',
      email: 'tactical@test.com',
      passwordHash: '$2b$10$dummy.hash.for.testing',
      userType: 'player',
      status: 'active'
    }
  ];

  for (const userData of users) {
    const existingUser = await User.findOne({ username: userData.username });
    if (!existingUser) {
      const user = new User(userData);
      await user.save();
      console.log(`  ✓ Utilizator creat: ${userData.username}`);
    } else {
      console.log(`  - Utilizatorul există deja: ${userData.username}`);
    }
  }
}

async function createRatings() {
  console.log('\n📊 Creează rating-uri pentru utilizatori...');
  
  const users = await User.find({ status: 'active' });
  const games = await Game.find({ status: 'active' });
  
  if (users.length === 0 || games.length === 0) {
    console.log('  ❌ Nu s-au găsit utilizatori sau jocuri pentru a crea rating-uri');
    return;
  }

  // Definește profiluri de jucători cu rating-uri diferite
  const playerProfiles = [
    { name: 'ProGamer2024', baseRating: 1500, variance: 100, gamesRange: [20, 30] },
    { name: 'StrategyMaster', baseRating: 1450, variance: 80, gamesRange: [25, 35] },
    { name: 'EliteWarrior', baseRating: 1400, variance: 60, gamesRange: [15, 25] },
    { name: 'VeteranGamer', baseRating: 1380, variance: 70, gamesRange: [30, 40] },
    { name: 'TacticalGenius', baseRating: 1350, variance: 90, gamesRange: [18, 28] },
    { name: 'NinjaMaster', baseRating: 1320, variance: 50, gamesRange: [12, 20] },
    { name: 'SpeedRunner', baseRating: 1280, variance: 120, gamesRange: [8, 15] },
    { name: 'CasualPlayer', baseRating: 1250, variance: 40, gamesRange: [10, 18] },
    { name: 'GameModerator', baseRating: 1220, variance: 30, gamesRange: [5, 12] },
    { name: 'RookiePlayer', baseRating: 1180, variance: 60, gamesRange: [3, 8] }
  ];

  for (const game of games) {
    console.log(`  🎮 Creează rating-uri pentru jocul: ${game.gameName}`);
    
    for (const user of users) {
      const existingRating = await Rating.findOne({
        userId: user._id,
        gameId: game._id
      });

      if (!existingRating) {
        // Găsește profilul jucătorului sau folosește unul implicit
        const profile = playerProfiles.find(p => p.name === user.username) || {
          baseRating: 1200,
          variance: 100,
          gamesRange: [5, 15]
        };

        // Calculează statistici realiste
        const gamesPlayed = randomBetween(profile.gamesRange[0], profile.gamesRange[1]);
        const eloRating = Math.max(800, Math.min(2000, 
          profile.baseRating + randomBetween(-profile.variance, profile.variance)
        ));
        
        // Calculează victorii bazate pe rating (jucători mai buni au win rate mai mare)
        const skillFactor = (eloRating - 1000) / 1000; // între -0.2 și 1
        const baseWinRate = Math.max(0.2, Math.min(0.8, 0.5 + skillFactor * 0.3));
        
        const wins = Math.floor(gamesPlayed * baseWinRate);
        const draws = Math.floor(gamesPlayed * 0.1); // 10% egaluri
        const losses = gamesPlayed - wins - draws;

        const rating = new Rating({
          userId: user._id,
          gameId: game._id,
          eloRating: eloRating,
          gamesPlayed: gamesPlayed,
          wins: Math.max(0, wins),
          losses: Math.max(0, losses),
          draws: Math.max(0, draws),
          lastPlayed: randomDateInPast(30), // În ultimele 30 de zile
          updatedAt: new Date()
        });

        await rating.save();
        console.log(`    ✓ ${user.username}: ${eloRating} Elo, ${gamesPlayed} jocuri, ${wins}W-${losses}L-${draws}D`);
      }
    }
  }
}

async function createGameSessions() {
  console.log('\n🎲 Creează sesiuni de joc pentru istoric...');
  
  const users = await User.find({ status: 'active', userType: 'player' });
  const games = await Game.find({ status: 'active' });
  
  if (users.length < 2 || games.length === 0) {
    console.log('  ❌ Nu sunt suficienți utilizatori sau jocuri pentru sesiuni');
    return;
  }

  // Creează câteva sesiuni de joc finalizate
  for (let i = 0; i < 15; i++) {
    const game = games[Math.floor(Math.random() * games.length)];
    const creator = users[Math.floor(Math.random() * users.length)];
    
    // Selectează jucători pentru această sesiune
    const numPlayers = randomBetween(game.minPlayers, Math.min(game.maxPlayers, 4));
    const sessionPlayers = [creator];
    
    // Adaugă jucători suplimentari
    while (sessionPlayers.length < numPlayers) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      if (!sessionPlayers.find(p => p._id.equals(randomUser._id))) {
        sessionPlayers.push(randomUser);
      }
    }

    // Creează sesiunea
    const startTime = randomDateInPast(7); // În ultimele 7 zile
    const endTime = new Date(startTime.getTime() + randomBetween(10, 60) * 60000); // 10-60 min

    const gameSession = new GameSession({
      gameId: game._id,
      creatorId: creator._id,
      startTime: startTime,
      endTime: endTime,
      status: 'completed',
      gameState: { completed: true, finalScores: {} }
    });

    await gameSession.save();

    // Creează PlayerSession pentru fiecare jucător
    const results = ['winner', 'loser'];
    for (let j = 0; j < sessionPlayers.length; j++) {
      const player = sessionPlayers[j];
      const result = j === 0 ? 'winner' : (Math.random() > 0.7 ? 'draw' : 'loser');
      const score = result === 'winner' ? randomBetween(80, 100) : 
                   result === 'draw' ? randomBetween(40, 60) : randomBetween(10, 40);

      const playerSession = new PlayerSession({
        sessionId: gameSession._id,
        userId: player._id,
        role: 'player',
        result: result,
        score: score,
        joinedAt: startTime
      });

      await playerSession.save();
    }

    console.log(`  ✓ Sesiune ${i + 1}: ${game.gameName} cu ${numPlayers} jucători`);
  }
}

// Funcții helper
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInPast(days) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.random() * days * 24 * 60 * 60 * 1000);
  return pastDate;
}

console.log('🎮 Script de populare pentru CMC Games');
console.log('=====================================');
console.log('Acest script va crea date de test pentru leaderboard.');
console.log('Asigură-te că MongoDB rulează pe localhost:27017\n');