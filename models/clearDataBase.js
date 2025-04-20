const mongoose = require('mongoose');
const Game = require('./Game');
const Channel = require('./Channel');
const Rating = require('./Rating');
const GameSession = require('./GameSession');
const PlayerSession = require('./PlayerSession');
const Message = require('./Message');

async function clearDatabase() {
  try {
    // Conectare la MongoDB
    await mongoose.connect('mongodb://localhost:27017/cmc_games');
    console.log('Conectat la baza de date MongoDB');

    // Șterge toate datele din fiecare colecție
    console.log('Începe ștergerea datelor...');

    // Șterge mai întâi colecțiile care au dependențe (ordinea este importantă)
    const deleteMessages = await Message.deleteMany({});
    console.log(`${deleteMessages.deletedCount} mesaje au fost șterse`);

    const deletePlayerSessions = await PlayerSession.deleteMany({});
    console.log(`${deletePlayerSessions.deletedCount} sesiuni de jucător au fost șterse`);

    const deleteRatings = await Rating.deleteMany({});
    console.log(`${deleteRatings.deletedCount} rating-uri au fost șterse`);

    const deleteGameSessions = await GameSession.deleteMany({});
    console.log(`${deleteGameSessions.deletedCount} sesiuni de joc au fost șterse`);

    const deleteChannels = await Channel.deleteMany({});
    console.log(`${deleteChannels.deletedCount} canale au fost șterse`);

    const deleteGames = await Game.deleteMany({});
    console.log(`${deleteGames.deletedCount} jocuri au fost șterse`);


    console.log('Toate datele au fost șterse cu succes!');
    
    // Verifică dacă baza de date este acum goală
    const remainingGames = await Game.countDocuments();
    const remainingChannels = await Channel.countDocuments();
    const remainingRatings = await Rating.countDocuments();
    const remainingGameSessions = await GameSession.countDocuments();
    const remainingPlayerSessions = await PlayerSession.countDocuments();
    const remainingMessages = await Message.countDocuments();

    console.log('\nVerificarea bazei de date:');
    console.log(`Jocuri rămase: ${remainingGames}`);
    console.log(`Canale rămase: ${remainingChannels}`);
    console.log(`Rating-uri rămase: ${remainingRatings}`);
    console.log(`Sesiuni de joc rămase: ${remainingGameSessions}`);
    console.log(`Sesiuni de jucător rămase: ${remainingPlayerSessions}`);
    console.log(`Mesaje rămase: ${remainingMessages}`);

    if ( remainingGames + remainingChannels + remainingRatings + 
        remainingGameSessions + remainingPlayerSessions + remainingMessages === 0) {
      console.log('\nBaza de date a fost complet curățată!');
    } else {
      console.log('\nAtenție: Unele date nu au fost șterse. Verifică permisiunile sau indexările.');
    }

  } catch (error) {
    console.error('Eroare la ștergerea datelor:', error);
  } finally {
    // Închide conexiunea
    await mongoose.connection.close();
    console.log('Conexiunea la baza de date a fost închisă');
  }
}

// Întreabă utilizatorul să confirme ștergerea
console.log('ATENȚIE: Acest script va șterge TOATE datele din baza de date cmc_games!');
console.log('Scrieți "confirm" pentru a continua:');

process.stdin.once('data', (data) => {
  const input = data.toString().trim();
  if (input.toLowerCase() === 'confirm') {
    clearDatabase();
  } else {
    console.log('Operațiunea a fost anulată. Baza de date rămâne neschimbată.');
    process.exit(0);
  }
});