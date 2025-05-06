const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
  }]
});

channelSchema.index({ channelType: 1, sessionId: 1 });
channelSchema.index({ isActive: 1 });

const Channel = mongoose.model('Channel', channelSchema);
module.exports = Channel;