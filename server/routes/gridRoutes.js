const express = require('express');
const {
  getGridState,
  getGridStats,
  resetGrid,
} = require('../controllers/gridController');

const router = express.Router();

router.get('/', getGridState);
router.get('/stats', getGridStats);
router.post('/reset', resetGrid); // should add auth for this in prod

module.exports = router;
