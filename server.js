const app = require('./src/app');
const connectDB = require('./src/config/db');
const { PORT } = require('./src/config/env');
const { init } = require('./src/utils/socket');

// Connect to MongoDB
connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.io
const io = init(server);
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Example: join a room based on user ID for targeted notifications
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
