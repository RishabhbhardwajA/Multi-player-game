const mongoose = require('mongoose');

// each tile in the grid
const tileSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true, min: 0 },
    y: { type: Number, required: true, min: 0 },
    ownerId: { type: String, default: null },
    ownerName: {
      type: String,
      default: null,
      maxlength: [30, 'Name too long'],
    },
    color: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^#([0-9A-Fa-f]{6})$/.test(v),
        message: 'Invalid hex color',
      },
    },
    claimedAt: { type: Date, default: null },
  },
  { _id: false }
);

const gridStateSchema = new mongoose.Schema(
  {
    gridId: {
      type: String,
      default: 'main',
      unique: true,
    },
    width: {
      type: Number,
      default: 50,
      min: [10, 'Min width is 10'],
      max: [100, 'Max width is 100'],
    },
    height: {
      type: Number,
      default: 50,
      min: [10, 'Min height is 10'],
      max: [100, 'Max height is 100'],
    },
    tiles: [tileSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('GridState', gridStateSchema);
