const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const gridRoutes = require('./routes/gridRoutes');
const { globalErrorHandler, notFound } = require('./middlewares/errorHandler');
const { initializeSocket } = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// log requests in dev
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'PixelClash server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/grid', gridRoutes);

// error handling — has to be after all routes
app.use(notFound);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();
    await initializeSocket(io);

    server.listen(PORT, () => {
      console.log(`\nPixelClash server running on http://localhost:${PORT}`);
      console.log(`WebSocket on ws://localhost:${PORT}`);
      console.log(`Mode: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// graceful shutdown stuff
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => console.log('Process terminated'));
});

startServer();
