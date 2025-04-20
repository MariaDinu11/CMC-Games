const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./User');
const Game = require('./Game');
const Channel = require('./Channel');
const Rating = require('./Rating');
const GameSession = require('./GameSession');
const PlayerSession = require('./PlayerSession');

async function createTestData() {
  try {
    // Conectare la MongoDB
    await mongoose.connect('mongodb://localhost:27017/cmc_games');
    console.log('Conectat la baza de date MongoDB');

    // 1. Crearea utilizatorilor de test
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('test123', saltRounds);

    const userTypes = ['player', 'spectator', 'moderator', 'admin'];
    const users = [];

    // Creați câte un utilizator pentru fiecare tip
    for (const userType of userTypes) {
      const userData = {
        username: `${userType}1`,
        email: `${userType}@example.com`,
        passwordHash: passwordHash,
        userType: userType
      };

      const existingUser = await User.findOne({ username: userData.username });
      
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        users.push(user);
        console.log(`Utilizator '${userData.username}' de tip '${userData.userType}' creat cu succes!`);
      } else {
        users.push(existingUser);
        console.log(`Utilizatorul '${userData.username}' există deja.`);
      }
    }

    // 2. Crearea jocurilor
    const games = [];
    const gameTypes = [
      { name: 'Tank Wars', min: 2, max: 4 },
      { name: 'Carcassonne', min: 2, max: 5 },
      { name: 'Fotbal', min: 2, max: 2 }
    ];

    for (const gameType of gameTypes) {
      const existingGame = await Game.findOne({ gameName: gameType.name });
      
      if (!existingGame) {
        const game = new Game({
          gameName: gameType.name,
          gameType: gameType.name,
          minPlayers: gameType.min,
          maxPlayers: gameType.max,
          allowSpectators: true,
          status: 'active'
        });
        await game.save();
        games.push(game);
        console.log(`Joc '${gameType.name}' creat cu succes!`);
      } else {
        games.push(existingGame);
        console.log(`Jocul '${gameType.name}' există deja.`);
      }
    }

    // 3. Crearea canalelor de comunicare
    const channelTypes = ['global', 'game', 'spectator'];
    const channels = [];

    for (const channelType of channelTypes) {
      const existingChannel = await Channel.findOne({ name: `${channelType}-channel` });
      
      if (!existingChannel) {
        const channel = new Channel({
          channelType: channelType,
          name: `${channelType}-channel`,
          // sessionId nu este necesară pentru canalul global
          isActive: true,
          moderatedBy: [users[2]._id, users[3]._id] // moderatorul și admin-ul
        });
        await channel.save();
        channels.push(channel);
        console.log(`Canal de tip '${channelType}' creat cu succes!`);
      } else {
        channels.push(existingChannel);
        console.log(`Canalul de tip '${channelType}' există deja.`);
      }
    }

    // 4. Crearea unui rating inițial pentru toți jucătorii la fiecare joc
    for (const user of users) {
      if (user.userType === 'player' || user.userType === 'moderator' || user.userType === 'admin') {
        for (const game of games) {
          const existingRating = await Rating.findOne({ userId: user._id, gameId: game._id });
          
          if (!existingRating) {
            const rating = new Rating({
              userId: user._id,
              gameId: game._id,
              eloRating: 1200,
              gamesPlayed: 0,
              wins: 0,
              losses: 0
            });
            await rating.save();
            console.log(`Rating creat pentru utilizatorul '${user.username}' la jocul '${game.gameName}'`);
          } else {
            console.log(`Rating-ul pentru utilizatorul '${user.username}' la jocul '${game.gameName}' există deja.`);
          }
        }
      }
    }

    // 5. Crearea unei sesiuni de joc de test
    const existingSession = await GameSession.findOne({ creatorId: users[0]._id });
    
    if (!existingSession) {
      const gameSession = new GameSession({
        gameId: games[0]._id,
        creatorId: users[0]._id,
        status: 'waiting',
        gameState: { round: 0, currentPlayer: users[0]._id }
      });
      await gameSession.save();
      console.log(`Sesiune de joc de test creată pentru '${games[0].gameName}'`);

      // 6. Adăugare jucători la sesiunea de joc
      const playerSession1 = new PlayerSession({
        sessionId: gameSession._id,
        userId: users[0]._id,
        role: 'player'
      });
      await playerSession1.save();

      const playerSession2 = new PlayerSession({
        sessionId: gameSession._id,
        userId: users[1]._id,
        role: 'spectator'
      });
      await playerSession2.save();

      console.log(`Jucători adăugați la sesiunea de joc`);
    } else {
      console.log(`Sesiunea de joc de test există deja.`);
    }

    // Listează toate datele create
    console.log('\nUtilizatori în baza de date:');
    const allUsers = await User.find();
    allUsers.forEach(user => {
      console.log(`- ${user.username} (${user.userType}): ${user.email} | Status: ${user.status}`);
    });

    console.log('\nJocuri în baza de date:');
    const allGames = await Game.find();
    allGames.forEach(game => {
      console.log(`- ${game.gameName}: ${game.minPlayers}-${game.maxPlayers} jucători | Status: ${game.status}`);
    });

    console.log('\nCanale în baza de date:');
    const allChannels = await Channel.find();
    allChannels.forEach(channel => {
      console.log(`- ${channel.name} (${channel.channelType}) | Activ: ${channel.isActive}`);
    });

  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    // Închide conexiunea
    await mongoose.connection.close();
    console.log('Conexiunea la baza de date a fost închisă');
  }
}

// Execută funcția
createTestData();