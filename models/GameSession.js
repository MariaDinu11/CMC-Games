const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definirea schemei pentru sesiuni de joc conform documentului de proiectare
const gameSessionSchema = new Schema({
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed'],
    default: 'waiting'
  },
  gameState: {
    type: Schema.Types.Mixed, // Pentru stocarea stării curente a jocului (serializată)
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Crearea modelului
const GameSession = mongoose.model('GameSession', gameSessionSchema);
module.exports = GameSession;