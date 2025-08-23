const express = require('express');
const router = express.Router();
const pool = require('../models/db');

// GET /numbers - Lista todos os números cadastrados
router.get('/numbers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM numbers');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /numbers - Insere um novo número
router.post('/numbers', async (req, res) => {
  const {
    codpais, ddd, numero, status, data_ativacao, data_expiracao,
    saldo_minutos, data_atual, total_mensagens, total_conversas_ativas
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO numbers (codpais, ddd, numero, status, data_ativacao, data_expiracao, saldo_minutos, data_atual, total_mensagens, total_conversas_ativas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [codpais, ddd, numero, status, data_ativacao, data_expiracao, saldo_minutos, data_atual, total_mensagens, total_conversas_ativas]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /numbers/:codpais/:ddd/:numero - Atualiza um número existente
router.put('/numbers/:codpais/:ddd/:numero', async (req, res) => {
  const { codpais, ddd, numero } = req.params;
  const {
    status, data_ativacao, data_expiracao,
    saldo_minutos, data_atual, total_mensagens, total_conversas_ativas
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE numbers SET status=$1, data_ativacao=$2, data_expiracao=$3, saldo_minutos=$4, data_atual=$5, total_mensagens=$6, total_conversas_ativas=$7
       WHERE codpais=$8 AND ddd=$9 AND numero=$10 RETURNING *`,
      [status, data_ativacao, data_expiracao, saldo_minutos, data_atual, total_mensagens, total_conversas_ativas, codpais, ddd, numero]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Número não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 