const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definirea schemei pentru canale de comunicare conform documentului de proiectare
const channelSchema = new Schema({
  channelType: {
    type: String,
    enum: ['global', 'game', 'spectator'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'GameSession',
    // Opțional, doar pentru canale de tip 'game' și 'spectator'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  moderatedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
    // Pentru canale private, dacă vor fi implementate în viitor
  }]
});

// Indexare pentru eficiență
channelSchema.index({ channelType: 1, sessionId: 1 });
channelSchema.index({ isActive: 1 });

// Crearea modelului
const Channel = mongoose.model('Channel', channelSchema);
module.exports = Channel;