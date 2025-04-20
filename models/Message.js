const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definirea schemei pentru mesaje conform documentului de proiectare
const messageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500 // Limitare la 500 de caractere per mesaj
  },
  sentTime: {
    type: Date,
    default: Date.now
  },
  isModerated: {
    type: Boolean,
    default: false
  },
  moderatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  moderationReason: {
    type: String
  }
});

// Indexare pentru eficiență
messageSchema.index({ channelId: 1, sentTime: -1 });
messageSchema.index({ senderId: 1 });

// Crearea modelului
const Message = mongoose.model('Message', messageSchema);
module.exports = Message;