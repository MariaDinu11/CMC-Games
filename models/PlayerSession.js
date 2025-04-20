const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definirea schemei pentru sesiuni jucător conform documentului de proiectare
const playerSessionSchema = new Schema({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'GameSession',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['player', 'spectator', 'bot'],
    default: 'player'
  },
  result: {
    type: String,
    enum: ['winner', 'loser', 'draw', null],
    default: null
  },
  score: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

// Adăugăm un index compus pentru a evita duplicate (un utilizator poate fi o singură dată într-o sesiune)
playerSessionSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

// Crearea modelului
const PlayerSession = mongoose.model('PlayerSession', playerSessionSchema);
module.exports = PlayerSession;