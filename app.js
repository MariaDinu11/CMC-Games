const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/authRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Schema pentru mesajele de chat
const ChatMessage = mongoose.model('ChatMessage', {
  username: String,
  message: String,
  avatar: String,
  timestamp: { type: Date, default: Date.now },
  gameRoom: String // pentru a separa chat-urile pe jocuri
});

// Socket.IO pentru chat în timp real
const activeUsers = new Map(); // Track utilizatori activi per cameră

io.on('connection', (socket) => {
  console.log('Utilizator conectat:', socket.id);

  socket.on('join-game', (gameRoom) => {
    socket.join(gameRoom);
    socket.currentRoom = gameRoom;
    
    console.log(`Utilizatorul ${socket.id} s-a alăturat camerei: ${gameRoom}`);
    
    // Adaugă utilizatorul la lista activă
    if (!activeUsers.has(gameRoom)) {
      activeUsers.set(gameRoom, new Set());
    }
    activeUsers.get(gameRoom).add(socket.id);
    
    // Trimite numărul de utilizatori online în cameră
    io.to(gameRoom).emit('users-count', activeUsers.get(gameRoom).size);
    
    // Trimite ultimele 50 de mesaje din camera respectivă
    ChatMessage.find({ gameRoom })
      .sort({ timestamp: -1 })
      .limit(50)
      .then(messages => {
        socket.emit('chat-history', messages.reverse());
      });
  });

  socket.on('send-message', async (data) => {
    try {
      const { username, message, avatar, gameRoom } = data;
      
      // Validare input
      if (!username || !message || !gameRoom) {
        return;
      }
      
      if (message.length > 500) {
        return;
      }
      
      const newMessage = new ChatMessage({
        username,
        message,
        avatar,
        gameRoom
      });
      
      await newMessage.save();
      
      // Trimite mesajul la toți utilizatorii din camera respectivă
      io.to(gameRoom).emit('new-message', {
        username,
        message,
        avatar,
        timestamp: newMessage.timestamp
      });
      
    } catch (error) {
      console.error('Eroare la salvarea mesajului:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Utilizator deconectat:', socket.id);
    
    // Elimină utilizatorul din toate camerele
    activeUsers.forEach((users, room) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        // Actualizează numărul de utilizatori online
        io.to(room).emit('users-count', users.size);
        
        // Șterge camera dacă e goală
        if (users.size === 0) {
          activeUsers.delete(room);
        }
      }
    });
  });
});

// Rute API
app.use('/api/auth', authRoutes);

// Rută implicită pentru SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html', 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/html', 'index.html'));
});

// Folosește server în loc de app pentru a include Socket.IO
server.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
  console.log(`Accesați aplicația la http://localhost:${PORT}`);
});

module.exports = app;