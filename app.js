const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Adaugă dacă nu există
const authRoutes = require('./routes/authRoutes');

// Importă toate modelele existente
const Message = require('./models/Message');
const Channel = require('./models/Channel');
const User = require('./models/User');
const Game = require('./models/Game');
const GameSession = require('./models/GameSession');
const leaderboardRoutes = require('./routes/leaderboard-routes');
const profileRoutes = require('./routes/profile-routes');


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
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);

// Conectare la MongoDB
mongoose.connect('mongodb://localhost:27017/cmc_games')
  .then(async () => {
    console.log('Conectat la MongoDB');
    await initializeGameChannels();
  })
  .catch((err) => {
    console.error('Eroare la conectarea cu MongoDB:', err);
    process.exit(1);
  });

// Inițializează canalele pentru jocuri folosind schema existentă
async function initializeGameChannels() {
  try {
    // Găsește sau creează jocurile
    const games = await Game.find();
    
    // Creează canale pentru fiecare joc dacă nu există
    const gameChannels = [
      { name: 'carcassonne-global', type: 'Carcassonne' },
      { name: 'football-global', type: 'Fotbal' },
      { name: 'tank-wars-global', type: 'Tank Wars' },
      { name: 'general-chat', type: 'global' }
    ];

    for (const channelData of gameChannels) {
      const existingChannel = await Channel.findOne({ name: channelData.name });
      
      if (!existingChannel) {
        const channel = new Channel({
          channelType: 'global',
          name: channelData.name,
          isActive: true,
          moderatedBy: [], // Vom popula cu moderatori când sunt disponibili
          allowedUsers: [] // Toți utilizatorii pot accesa
        });
        await channel.save();
        console.log(`Canal ${channelData.name} creat`);
      }
    }
    
    console.log('Canale de joc inițializate');
  } catch (error) {
    console.error('Eroare la inițializarea canalelor:', error);
  }
}

// Socket.IO pentru chat în timp real
const activeUsers = new Map(); // socketId -> { userId, username, currentChannel }
const channelUsers = new Map(); // channelId -> Set(socketId)

// Middleware pentru autentificare Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const username = socket.handshake.auth.username;
    
    if (!token || !username) {
      return next(new Error('Autentificare necesară'));
    }
    
    // Găsește utilizatorul în baza de date
    const user = await User.findOne({ username: username });
    if (!user) {
      return next(new Error('Utilizator invalid'));
    }
    
    // Verifică statusul utilizatorului
    if (user.status !== 'active') {
      return next(new Error('Cont suspendat sau banat'));
    }
    
    socket.userId = user._id;
    socket.username = user.username;
    socket.userType = user.userType;
    
    next();
  } catch (error) {
    next(new Error('Token invalid'));
  }
});

io.on('connection', (socket) => {
  console.log(`Utilizator conectat: ${socket.username} (${socket.id})`);
  
  // Adaugă utilizatorul la lista activă
  activeUsers.set(socket.id, {
    userId: socket.userId,
    username: socket.username,
    userType: socket.userType,
    currentChannel: null
  });

  // Alătură utilizatorul la un canal de joc
  socket.on('join-game', async (gameRoom) => {
    try {
      // Mapează numele jocului la numele canalului
      const channelMap = {
        'carcassonne': 'carcassonne-global',
        'football': 'football-global',
        'tank-wars': 'tank-wars-global',
        'general': 'general-chat'
      };
      
      const channelName = channelMap[gameRoom] || 'general-chat';
      
      // Găsește canalul în baza de date
      const channel = await Channel.findOne({ name: channelName, isActive: true });
      if (!channel) {
        socket.emit('error', 'Canal inexistent');
        return;
      }
      
      // Părăsește canalul anterior dacă există
      if (socket.currentChannel) {
        socket.leave(socket.currentChannel);
        const oldChannelUsers = channelUsers.get(socket.currentChannel);
        if (oldChannelUsers) {
          oldChannelUsers.delete(socket.id);
          io.to(socket.currentChannel).emit('users-count', oldChannelUsers.size);
        }
      }
      
      // Alătură-te la noul canal
      socket.join(channel._id.toString());
      socket.currentChannel = channel._id.toString();
      
      // Actualizează lista utilizatorilor activi
      if (!channelUsers.has(channel._id.toString())) {
        channelUsers.set(channel._id.toString(), new Set());
      }
      channelUsers.get(channel._id.toString()).add(socket.id);
      
      // Actualizează informațiile utilizatorului
      const userInfo = activeUsers.get(socket.id);
      if (userInfo) {
        userInfo.currentChannel = channel._id;
      }
      
      console.log(`${socket.username} s-a alăturat canalului: ${channelName}`);
      
      // Trimite numărul de utilizatori online
      io.to(channel._id.toString()).emit('users-count', channelUsers.get(channel._id.toString()).size);
      
      // Încarcă istoricul mesajelor (ultimele 50)
      const messages = await Message.find({ channelId: channel._id })
        .populate('senderId', 'username userType')
        .sort({ sentTime: -1 })
        .limit(50);
      
      // Formatează mesajele pentru frontend
      const formattedMessages = messages.reverse().map(msg => ({
        _id: msg._id,
        username: msg.senderId.username,
        message: msg.content,
        avatar: msg.senderId.username.substring(0, 2).toUpperCase(),
        timestamp: msg.sentTime,
        isModerated: msg.isModerated
      }));
      
      socket.emit('chat-history', formattedMessages);
      
    } catch (error) {
      console.error('Eroare la alăturarea la canal:', error);
      socket.emit('error', 'Eroare la conectarea la canal');
    }
  });

  // Trimite un mesaj nou
  socket.on('send-message', async (data) => {
    try {
      const { message, gameRoom } = data;
      
      if (!message || message.trim() === '') return;
      if (message.length > 500) {
        socket.emit('error', 'Mesaj prea lung (maxim 500 caractere)');
        return;
      }
      
      const userInfo = activeUsers.get(socket.id);
      if (!userInfo || !userInfo.currentChannel) {
        socket.emit('error', 'Nu ești conectat la niciun canal');
        return;
      }
      
      // Verifică dacă utilizatorul poate trimite mesaje
      const user = await User.findById(socket.userId);
      if (!user || user.status !== 'active') {
        socket.emit('error', 'Nu ai permisiunea să trimiți mesaje');
        return;
      }
      
      // Creează mesajul în baza de date
      const newMessage = new Message({
        senderId: socket.userId,
        channelId: userInfo.currentChannel,
        content: message.trim()
      });
      
      await newMessage.save();
      
      // Populează cu datele utilizatorului pentru broadcast
      await newMessage.populate('senderId', 'username userType');
      
      // Formatează mesajul pentru frontend
      const formattedMessage = {
        _id: newMessage._id,
        username: newMessage.senderId.username,
        message: newMessage.content,
        avatar: newMessage.senderId.username.substring(0, 2).toUpperCase(),
        timestamp: newMessage.sentTime,
        isModerated: newMessage.isModerated
      };
      
      // Trimite mesajul la toți utilizatorii din canal
      io.to(userInfo.currentChannel.toString()).emit('new-message', formattedMessage);
      
      console.log(`Mesaj de la ${socket.username}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
      
    } catch (error) {
      console.error('Eroare la trimiterea mesajului:', error);
      socket.emit('error', 'Eroare la trimiterea mesajului');
    }
  });

  // Moderează un mesaj (doar pentru moderatori și admini)
  socket.on('moderate-message', async (data) => {
    try {
      const { messageId, reason } = data;
      
      // Verifică permisiunile
      if (socket.userType !== 'moderator' && socket.userType !== 'admin') {
        socket.emit('error', 'Nu ai permisiuni de moderare');
        return;
      }
      
      // Actualizează mesajul
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          isModerated: true,
          moderatedBy: socket.userId,
          moderationReason: reason || 'Conținut neadecvat'
        },
        { new: true }
      ).populate('senderId', 'username');
      
      if (message) {
        // Notifică canalul despre moderare
        io.to(message.channelId.toString()).emit('message-moderated', {
          messageId: messageId,
          reason: reason || 'Conținut neadecvat',
          moderatedBy: socket.username
        });
        
        console.log(`Mesaj moderat de ${socket.username}: ${messageId}`);
      }
      
    } catch (error) {
      console.error('Eroare la moderarea mesajului:', error);
      socket.emit('error', 'Eroare la moderarea mesajului');
    }
  });

  // Încarcă mai multe mesaje (scroll infinit)
  socket.on('load-more-messages', async (data) => {
    try {
      const { before, limit = 20 } = data;
      const userInfo = activeUsers.get(socket.id);
      
      if (!userInfo || !userInfo.currentChannel) return;
      
      const messages = await Message.find({
        channelId: userInfo.currentChannel,
        sentTime: { $lt: new Date(before) }
      })
      .populate('senderId', 'username userType')
      .sort({ sentTime: -1 })
      .limit(limit);
      
      const formattedMessages = messages.reverse().map(msg => ({
        _id: msg._id,
        username: msg.senderId.username,
        message: msg.content,
        avatar: msg.senderId.username.substring(0, 2).toUpperCase(),
        timestamp: msg.sentTime,
        isModerated: msg.isModerated
      }));
      
      socket.emit('more-messages', formattedMessages);
      
    } catch (error) {
      console.error('Eroare la încărcarea mesajelor:', error);
    }
  });

  // Deconectare
  socket.on('disconnect', () => {
    console.log(`Utilizator deconectat: ${socket.username} (${socket.id})`);
    
    // Elimină din lista activă
    activeUsers.delete(socket.id);
    
    // Elimină din canal
    if (socket.currentChannel) {
      const channelUsersSet = channelUsers.get(socket.currentChannel);
      if (channelUsersSet) {
        channelUsersSet.delete(socket.id);
        io.to(socket.currentChannel).emit('users-count', channelUsersSet.size);
        
        // Șterge canalul dacă e gol
        if (channelUsersSet.size === 0) {
          channelUsers.delete(socket.currentChannel);
        }
      }
    }
  });
});

// Rute API
app.use('/api/auth', authRoutes);

// Rută pentru moderatori - lista mesajelor
app.get('/api/messages/moderation', async (req, res) => {
  try {
    // Aici ai putea adăuga autentificare pentru moderatori
    const flaggedMessages = await Message.find({ isModerated: false })
      .populate('senderId', 'username')
      .populate('channelId', 'name')
      .sort({ sentTime: -1 })
      .limit(50);
    
    res.json(flaggedMessages);
  } catch (error) {
    res.status(500).json({ error: 'Eroare la încărcarea mesajelor' });
  }
});

// Rută implicită pentru SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html', 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/html', 'index.html'));
});

// Pornire server
server.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
  console.log(`Accesați aplicația la http://localhost:${PORT}`);
});

module.exports = app;