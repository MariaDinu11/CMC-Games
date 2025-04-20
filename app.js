const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
// Importă alte rute aici pe măsură ce le creezi

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servește fișierele statice din directorul 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Conectare la MongoDB
mongoose.connect('mongodb://localhost:27017/cmc_games')
  .then(() => {
    console.log('Conectat la MongoDB');
  })
  .catch((err) => {
    console.error('Eroare la conectarea cu MongoDB:', err);
    process.exit(1);
  });

// Rute API
app.use('/api/auth', authRoutes);
// Adaugă alte rute API aici pe măsură ce le creezi

// Rută implicită pentru SPA (Single Page Application)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  
  app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  });

// Pornire server
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});

module.exports = app;