const GridState = require('../models/GridState');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const GRID_WIDTH = 50;
const GRID_HEIGHT = 50;

// sets up the grid in mongo if it doesn't exist yet
const initializeGrid = async () => {
  let grid = await GridState.findOne({ gridId: 'main' });

  if (!grid) {
    const tiles = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        tiles.push({ x, y, ownerId: null, ownerName: null, color: null, claimedAt: null });
      }
    }

    grid = await GridState.create({
      gridId: 'main',
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      tiles,
    });

    console.log(`Grid initialized: ${GRID_WIDTH}x${GRID_HEIGHT} (${tiles.length} tiles)`);
  } else {
    const claimed = grid.tiles.filter((t) => t.ownerId).length;
    console.log(`Grid loaded: ${claimed}/${grid.tiles.length} tiles claimed`);
  }

  return grid;
};

// converts mongo doc into a fast-access Map for the in-memory cache
const loadGridToMemory = (grid) => {
  const gridMap = new Map();
  grid.tiles.forEach((tile) => {
    if (tile.ownerId) {
      gridMap.set(`${tile.x},${tile.y}`, {
        ownerId: tile.ownerId,
        ownerName: tile.ownerName,
        color: tile.color,
        claimedAt: tile.claimedAt,
      });
    }
  });
  return gridMap;
};

// GET /api/grid
const getGridState = catchAsync(async (req, res, next) => {
  const grid = await GridState.findOne({ gridId: 'main' });
  if (!grid) return next(new AppError('Grid not found', 404));

  res.status(200).json({
    status: 'success',
    data: {
      gridId: grid.gridId,
      width: grid.width,
      height: grid.height,
      totalTiles: grid.tiles.length,
      tiles: grid.tiles,
    },
  });
});

// GET /api/grid/stats
const getGridStats = catchAsync(async (req, res, next) => {
  const grid = await GridState.findOne({ gridId: 'main' });
  if (!grid) return next(new AppError('Grid not found', 404));

  const claimed = grid.tiles.filter((t) => t.ownerId).length;
  const total = grid.tiles.length;

  // build per-user stats
  const userStats = {};
  grid.tiles.forEach((tile) => {
    if (tile.ownerId) {
      if (!userStats[tile.ownerId]) {
        userStats[tile.ownerId] = { name: tile.ownerName, color: tile.color, count: 0 };
      }
      userStats[tile.ownerId].count++;
    }
  });

  const leaderboard = Object.entries(userStats)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.status(200).json({
    status: 'success',
    data: {
      total,
      claimed,
      unclaimed: total - claimed,
      percentClaimed: ((claimed / total) * 100).toFixed(1),
      uniqueOwners: Object.keys(userStats).length,
      leaderboard,
    },
  });
});

// POST /api/grid/reset — wipes everything (admin use)
const resetGrid = catchAsync(async (req, res, next) => {
  const tiles = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      tiles.push({ x, y, ownerId: null, ownerName: null, color: null, claimedAt: null });
    }
  }

  const grid = await GridState.findOneAndUpdate(
    { gridId: 'main' },
    { tiles, updatedAt: new Date() },
    { new: true }
  );

  if (!grid) return next(new AppError('Grid not found', 404));

  res.status(200).json({
    status: 'success',
    message: 'Grid has been reset',
    data: { totalTiles: tiles.length },
  });
});

module.exports = {
  initializeGrid,
  loadGridToMemory,
  getGridState,
  getGridStats,
  resetGrid,
  GRID_WIDTH,
  GRID_HEIGHT,
};
