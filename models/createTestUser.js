const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./User.js'); // Ajustează calea dacă este necesar

async function createTestUsers() {
  try {
    // Conectare la MongoDB
    await mongoose.connect('mongodb://localhost:27017/cmc_games');
    console.log('Conectat la baza de date MongoDB');

    // Șterge utilizatorii existenți (opțional - decomentează dacă dorești să resetezi utilizatorii)
    // await User.deleteMany({});
    // console.log('Utilizatorii existenți au fost șterși');

    // Criptează parola (aceeași pentru toți utilizatorii de test)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('test123', saltRounds);

    // Definește utilizatorii pentru fiecare tip
    const testUsers = [
      {
        username: 'player1',
        email: 'player@example.com',
        passwordHash: passwordHash,
        userType: 'player'
      },
      {
        username: 'spectator1',
        email: 'spectator@example.com',
        passwordHash: passwordHash,
        userType: 'spectator'
      },
      {
        username: 'moderator1',
        email: 'moderator@example.com',
        passwordHash: passwordHash,
        userType: 'moderator'
      },
      {
        username: 'admin1',
        email: 'admin@example.com',
        passwordHash: passwordHash,
        userType: 'admin'
      }
    ];

    // Crează și salvează utilizatorii
    for (const userData of testUsers) {
      // Verifică dacă utilizatorul deja există
      const existingUser = await User.findOne({ username: userData.username });
      
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Utilizator '${userData.username}' de tip '${userData.userType}' creat cu succes!`);
      } else {
        console.log(`Utilizatorul '${userData.username}' există deja.`);
      }
    }

    // Listează toți utilizatorii pentru verificare
    const users = await User.find();
    console.log('\nUtilizatori în baza de date:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.userType}): ${user.email} | Status: ${user.status} | Creat la: ${user.createdAt}`);
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
createTestUsers();