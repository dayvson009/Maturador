const express = require('express');
const router = express.Router();
const pool = require('../models/db');

router.get('/db-health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ db: 'ok' });
  } catch (err) {
    res.status(500).json({ db: 'error', error: err.message });
  }
});

module.exports = router; 