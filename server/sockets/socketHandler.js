const GridState = require('../models/GridState');
const {
  GRID_WIDTH,
  GRID_HEIGHT,
  initializeGrid,
  loadGridToMemory,
} = require('../controllers/gridController');

// in-memory state — grid tiles and online users
let gridMap = new Map();
const onlineUsers = new Map();

const COOLDOWN_MS = 1000; // 1s between claims

const COLORS = [
  '#c899ff', '#9c3dff', '#0bfbff', '#00ecef', '#ff6b9b',
  '#e30071', '#ff6e84', '#fdcb6e', '#2DD4BF', '#A855F7',
  '#EC4899', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6',
  '#06b6d4', '#d946ef', '#f59e0b', '#14b8a6', '#6366f1'
];

const ADJECTIVES = [
  'Swift', 'Brave', 'Silent', 'Cosmic', 'Neon', 'Pixel', 'Cyber',
  'Hyper', 'Nova', 'Turbo', 'Lunar', 'Solar', 'Blaze', 'Frost',
  'Storm', 'Shadow', 'Thunder', 'Crystal', 'Mystic', 'Quantum',
  'Astral', 'Blazing', 'Golden', 'Iron', 'Velvet',
];

const NOUNS = [
  'Fox', 'Wolf', 'Hawk', 'Panda', 'Tiger', 'Dragon', 'Phoenix',
  'Falcon', 'Viper', 'Raven', 'Bear', 'Lion', 'Eagle', 'Shark',
  'Cobra', 'Lynx', 'Jaguar', 'Panther', 'Otter', 'Owl',
  'Mantis', 'Kraken', 'Griffin', 'Sphinx', 'Hydra',
];

// generates random usernames like "CosmicFox42"
const generateName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
};

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// counts tiles per user and returns top 10
const getLeaderboard = () => {
  const scores = {};

  gridMap.forEach((tile) => {
    if (tile.ownerId) {
      if (!scores[tile.ownerId]) {
        scores[tile.ownerId] = { name: tile.ownerName, color: tile.color, count: 0 };
      }
      scores[tile.ownerId].count++;
    }
  });

  return Object.entries(scores)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

// only sends claimed tiles to keep the payload small
const getGridArray = () => {
  const tiles = [];
  gridMap.forEach((tile, key) => {
    const [x, y] = key.split(',').map(Number);
    tiles.push({ x, y, ...tile });
  });
  return tiles;
};

// saves grid to mongo, but debounced so we're not writing on every single click
let saveTimeout = null;
const saveGridToDB = async () => {
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    try {
      const tiles = [];
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const key = `${x},${y}`;
          const tile = gridMap.get(key);
          tiles.push({
            x, y,
            ownerId: tile ? tile.ownerId : null,
            ownerName: tile ? tile.ownerName : null,
            color: tile ? tile.color : null,
            claimedAt: tile ? tile.claimedAt : null,
          });
        }
      }

      await GridState.findOneAndUpdate(
        { gridId: 'main' },
        { tiles, updatedAt: new Date() }
      );
    } catch (err) {
      console.error('Failed to save grid:', err.message);
    }
  }, 2000);
};

// wraps socket event handlers so errors don't crash the server
const socketCatchError = (socket, handler) => {
  return (...args) => {
    try {
      const result = handler(...args);
      if (result && typeof result.catch === 'function') {
        result.catch((err) => {
          console.error('Socket error:', err.message);
          socket.emit('tile:error', {
            type: 'SERVER_ERROR',
            message: err.isOperational ? err.message : 'Something went wrong',
          });
        });
      }
    } catch (err) {
      console.error('Socket error:', err.message);
      socket.emit('tile:error', {
        type: 'SERVER_ERROR',
        message: 'Something went wrong',
      });
    }
  };
};

// main socket setup — loads grid from db, then handles connections
const initializeSocket = async (io) => {
  try {
    const grid = await initializeGrid();
    gridMap = loadGridToMemory(grid);
    console.log(`Socket.IO ready — ${gridMap.size} tiles in memory`);
  } catch (err) {
    console.error('Failed to initialize grid:', err.message);
  }

  io.on('connection', (socket) => {
    // give each user a random identity
    const user = {
      id: socket.id,
      name: generateName(),
      color: getRandomColor(),
      score: 0,
      lastClaimTime: 0,
    };
    onlineUsers.set(socket.id, user);
    console.log(`${user.name} joined (${onlineUsers.size} online)`);

    // send them their identity + current grid
    socket.emit('user:welcome', { id: user.id, name: user.name, color: user.color });

    socket.emit('grid:state', {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      tiles: getGridArray(),
    });

    // tell everyone about the new player count
    io.emit('users:update', {
      online: onlineUsers.size,
      leaderboard: getLeaderboard(),
    });

    // handle tile claim
    socket.on('tile:claim', socketCatchError(socket, (data) => {
      const { x, y } = data;

      // basic validation
      if (typeof x !== 'number' || typeof y !== 'number') {
        socket.emit('tile:error', { type: 'INVALID_INPUT', message: 'Coordinates must be numbers' });
        return;
      }

      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT || !Number.isInteger(x) || !Number.isInteger(y)) {
        socket.emit('tile:error', { type: 'INVALID_COORDINATES', message: 'Out of bounds' });
        return;
      }

      const currentUser = onlineUsers.get(socket.id);
      if (!currentUser) {
        socket.emit('tile:error', { type: 'USER_NOT_FOUND', message: 'Session not found, reconnect' });
        return;
      }

      // cooldown check
      const now = Date.now();
      const timeSince = now - currentUser.lastClaimTime;
      if (timeSince < COOLDOWN_MS) {
        socket.emit('tile:error', {
          type: 'COOLDOWN',
          message: 'Too fast!',
          cooldownRemaining: COOLDOWN_MS - timeSince,
        });
        return;
      }

      // claim it — this is safe because node is single-threaded,
      // so no two claims can race on the same tick
      const key = `${x},${y}`;
      gridMap.set(key, {
        ownerId: socket.id,
        ownerName: currentUser.name,
        color: currentUser.color,
        claimedAt: new Date(),
      });
      currentUser.lastClaimTime = now;

      // broadcast to everyone
      io.emit('tile:updated', {
        x, y,
        ownerId: socket.id,
        ownerName: currentUser.name,
        color: currentUser.color,
      });

      io.emit('users:update', {
        online: onlineUsers.size,
        leaderboard: getLeaderboard(),
      });

      // persist (debounced)
      saveGridToDB();
    }));

    socket.on('disconnect', () => {
      const u = onlineUsers.get(socket.id);
      if (u) console.log(`${u.name} left (${onlineUsers.size - 1} online)`);
      onlineUsers.delete(socket.id);

      io.emit('users:update', {
        online: onlineUsers.size,
        leaderboard: getLeaderboard(),
      });
    });
  });
};

module.exports = { initializeSocket };
