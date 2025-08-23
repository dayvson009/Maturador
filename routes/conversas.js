const express = require('express');
const router = express.Router();
const conversasService = require('../services/conversas');

// Inicializar serviço de conversas
conversasService.carregarMensagens();

// POST /conversas/iniciar - Iniciar conversas automáticas
router.post('/iniciar', async (req, res) => {
    try {
        const { browserId, numero } = req.body;
        
        if (!browserId || !numero) {
            return res.status(400).json({
                success: false,
                message: 'browserId e numero são obrigatórios'
            });
        }

        const resultado = await conversasService.iniciarConversasParaDispositivo(browserId, numero);
        
        if (resultado) {
            res.json({
                success: true,
                message: 'Conversas automáticas iniciadas com sucesso'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Não foi possível iniciar as conversas'
            });
        }
    } catch (error) {
        console.error('Erro ao iniciar conversas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /conversas/parar - Parar conversas automáticas
router.post('/parar', async (req, res) => {
    try {
        const { browserId } = req.body;
        
        if (!browserId) {
            return res.status(400).json({
                success: false,
                message: 'browserId é obrigatório'
            });
        }

        await conversasService.pararConversas(browserId);
        
        res.json({
            success: true,
            message: 'Conversas automáticas paradas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao parar conversas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /conversas/status - Obter status das conversas
router.get('/status', async (req, res) => {
    try {
        const status = conversasService.getStatusConversas();
        
        res.json({
            success: true,
            data: {
                conversasAtivas: status.length,
                conversas: status
            }
        });
    } catch (error) {
        console.error('Erro ao obter status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /conversas/adicionar-credito - Adicionar crédito (para testes)
router.post('/adicionar-credito', async (req, res) => {
    try {
        const { numero, minutos = 1 } = req.body;
        
        if (!numero) {
            return res.status(400).json({
                success: false,
                message: 'numero é obrigatório'
            });
        }

        const resultado = await conversasService.adicionarCredito(numero, minutos);
        
        if (resultado) {
            res.json({
                success: true,
                message: `${minutos} minuto(s) adicionado(s) com sucesso`
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Não foi possível adicionar crédito'
            });
        }
    } catch (error) {
        console.error('Erro ao adicionar crédito:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /conversas/saldo/:numero - Verificar saldo de um número
router.get('/saldo/:numero', async (req, res) => {
    try {
        const { numero } = req.params;
        
        if (!numero) {
            return res.status(400).json({
                success: false,
                message: 'numero é obrigatório'
            });
        }

        const saldo = await conversasService.verificarSaldo(numero);
        console.log('Saldo encontrado:', saldo);
        res.json({
            success: true,
            data: {
                numero,
                saldo_minutos: saldo,
                saldo_segundos: Math.floor(saldo * 60)
            }
        });
    } catch (error) {
        console.error('Erro ao verificar saldo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /conversas/dispositivos-ativos - Listar dispositivos ativos
router.get('/dispositivos-ativos', async (req, res) => {
    try {
        const dispositivos = await conversasService.verificarDispositivosAtivos();
        
        res.json({
            success: true,
            data: {
                total: dispositivos.length,
                dispositivos: dispositivos.map(d => ({
                    numero: `${d.codpais}${d.ddd}${d.numero}`,
                    saldo_minutos: d.saldo_minutos,
                    conversas_ativas: d.total_conversas_ativas
                }))
            }
        });
    } catch (error) {
        console.error('Erro ao listar dispositivos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router;
