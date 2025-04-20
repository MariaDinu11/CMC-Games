const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definirea schemei pentru jocuri conform documentului de proiectare
const gameSchema = new Schema({
  gameName: {
    type: String,
    required: true
  },
  gameType: {
    type: String,
    enum: ['Tank Wars', 'Carcassonne', 'Fotbal'],
    required: true
  },
  minPlayers: {
    type: Number,
    required: true,
    min: 1
  },
  maxPlayers: {
    type: Number,
    required: true
  },
  allowSpectators: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'maintenance'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Crearea modelului
const Game = mongoose.model('Game', gameSchema);
module.exports = Game;