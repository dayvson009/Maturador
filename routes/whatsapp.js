const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');

// POST /whatsapp/clear-cache - Limpa o cache do Chromium
router.post('/whatsapp/clear-cache', (req, res) => {
  try {
    const whatsappService = require('../services/whatsapp');
    const result = whatsappService.clearChromiumCache();
    
    if (result) {
      res.json({ success: true, message: 'Cache limpo com sucesso' });
    } else {
      res.json({ success: false, message: 'Nenhum cache encontrado para limpar' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /whatsapp/initialize - Inicializa um cliente WhatsApp
router.post('/whatsapp/initialize', async (req, res) => {
  const { codpais, ddd, numero, force } = req.body;
  
  if (!codpais || !ddd || !numero) {
    return res.status(400).json({ error: 'codpais, ddd e numero são obrigatórios' });
  }

  try {
    const result = await whatsappService.initializeClient(codpais, ddd, numero, { force: !!force });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /whatsapp/qr/:codpais/:ddd/:numero - Obtém o QR Code para um número
router.get('/whatsapp/qr/:codpais/:ddd/:numero', (req, res) => {
  const { codpais, ddd, numero } = req.params;
  
  const qrCode = whatsappService.getQRCode(codpais, ddd, numero);
  if (qrCode) {
    res.json({ qrCode });
  } else {
    res.status(404).json({ error: 'QR Code não encontrado ou cliente já conectado' });
  }
});

// GET /whatsapp/client-info/:codpais/:ddd/:numero - Obtém informações do cliente
router.get('/whatsapp/client-info/:codpais/:ddd/:numero', (req, res) => {
  const { codpais, ddd, numero } = req.params;
  
  const clientInfo = whatsappService.getClientInfo(codpais, ddd, numero);
  if (clientInfo) {
    res.json(clientInfo);
  } else {
    res.status(404).json({ error: 'Cliente não encontrado' });
  }
});

// GET /whatsapp/status - Verifica se um cliente está conectado por browserId
router.get('/whatsapp/status', (req, res) => {
  const { browserId } = req.query;
  
  if (!browserId) {
    return res.status(400).json({ error: 'browserId é obrigatório' });
  }
  
  console.log(`Verificando status para browserId: ${browserId}`);
  
  try {
    const isConnected = whatsappService.isConnected(browserId);
    console.log(`Status para ${browserId}: ${isConnected}`);
    
    res.json({ 
      connected: isConnected,
      browserId: browserId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Erro ao verificar status para ${browserId}:`, error);
    res.status(500).json({ 
      error: error.message,
      browserId: browserId,
      connected: false
    });
  }
});

// POST /whatsapp/send - Envia uma mensagem
router.post('/whatsapp/send', async (req, res) => {
  const { codpais, ddd, numero, to, message } = req.body;
  
  if (!codpais || !ddd || !numero || !to || !message) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const result = await whatsappService.sendMessage(codpais, ddd, numero, to, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /whatsapp/disconnect - Desconecta um cliente por browserId
router.delete('/whatsapp/disconnect', async (req, res) => {
  const { browserId } = req.body;
  
  if (!browserId) {
    return res.status(400).json({ error: 'browserId é obrigatório' });
  }
  
  try {
    const result = await whatsappService.disconnectClient(null, null, null, browserId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /whatsapp/clients - Lista todos os clientes ativos
router.get('/whatsapp/clients', (req, res) => {
  const clients = whatsappService.getActiveClients();
  res.json({ clients });
});

module.exports = router; 