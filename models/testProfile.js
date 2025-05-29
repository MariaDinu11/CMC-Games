// scripts/testProfile.js - Script pentru testarea profilului
const mongoose = require('mongoose');
const User = require('../models/User');

// Conectare la MongoDB
mongoose.connect('mongodb://localhost:27017/cmc_games')
  .then(async () => {
    console.log('Conectat la MongoDB');
    await testProfile();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Eroare la conectarea cu MongoDB:', err);
    process.exit(1);
  });

async function testProfile() {
  try {
    // Găsește primul utilizator activ
    const user = await User.findOne({ status: 'active' });
    
    if (!user) {
      console.log('❌ Nu s-au găsit utilizatori activi!');
      console.log('💡 Rulează mai întâi: node scripts/populateLeaderboard.js');
      return;
    }
    
    console.log('✅ Utilizator găsit pentru test:');
    console.log(`   Username: ${user.username}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    
    // Testează API-ul de profil
    console.log('\n🧪 Pentru a testa profilul în browser:');
    console.log('1. Deschide Developer Tools (F12)');
    console.log('2. Mergi la Console');
    console.log('3. Rulează următorul cod JavaScript:\n');
    
    console.log(`// Test API profil
fetch('/api/profile', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ${user._id}',
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Răspuns profil:', data);
  
  // Actualizează localStorage dacă este necesar
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('authToken', '${user._id}');
    console.log('✅ Date salvate în localStorage');
    
    // Reîmprospătează pagina
    window.location.reload();
  }
})
.catch(err => console.error('Eroare:', err));`);
    
    console.log('\n🔧 Sau setează manual în localStorage:');
    console.log(`localStorage.setItem('authToken', '${user._id}');`);
    console.log(`localStorage.setItem('user', '${JSON.stringify({
      id: user._id,
      username: user.username,
      email: user.email,
      userType: user.userType
    })}');`);
    
    console.log('\n🎯 Apoi reîmprospătează pagina profilului!');
    
  } catch (error) {
    console.error('❌ Eroare la testarea profilului:', error);
  }
}

console.log('🧪 Test pentru profilul utilizatorului');
console.log('====================================');