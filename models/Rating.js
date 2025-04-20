const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definirea schemei pentru evaluare (rating) conform documentului de proiectare
const ratingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  eloRating: {
    type: Number,
    default: 1200 // Rating Elo inițial standard
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  draws: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Adăugăm un index compus pentru a asigura unicitatea și performanța căutărilor
ratingSchema.index({ userId: 1, gameId: 1 }, { unique: true });

// Crearea modelului
const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;