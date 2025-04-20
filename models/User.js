const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definirea schemei pentru utilizatori conform documentului de proiectare
const userSchema = new Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  userType: { 
    type: String, 
    enum: ['player', 'spectator', 'moderator', 'admin'],
    default: 'player' 
  },
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'banned'],
    default: 'active' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Crearea modelului
const User = mongoose.model('User', userSchema);

module.exports = User;