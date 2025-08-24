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

// GET /conversas/ativas - Verificar se existem conversas ativas
router.get('/ativas', async (req, res) => {
    try {
        const pool = require('../models/db');
        
        // Verificar conversas ativas na tabela
        const query = `
            SELECT COUNT(*) as total_conversas
            FROM conversas_ativas 
            WHERE data_ultima_mensagem > NOW() - INTERVAL '1 hour'
        `;
        
        const result = await pool.query(query);
        const totalConversas = parseInt(result.rows[0].total_conversas);
        
        res.json({
            success: true,
            data: {
                conversasAtivas: totalConversas > 0,
                totalConversas: totalConversas,
                message: totalConversas > 0 ? 'Existem conversas ativas' : 'Nenhuma conversa ativa'
            }
        });
    } catch (error) {
        console.error('Erro ao verificar conversas ativas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /conversas/status/:numero - Obter status e saldo de um número específico
router.get('/status/:numero', async (req, res) => {
    try {
        const { numero } = req.params;
        
        if (!numero) {
            return res.status(400).json({
                success: false,
                message: 'Número é obrigatório'
            });
        }
        
        const pool = require('../models/db');
        
        // Buscar informações do número no banco
        const query = `
            SELECT codpais, ddd, numero, status, saldo_minutos, data_ativacao, data_atual
            FROM numbers 
            WHERE CONCAT(codpais, ddd, numero) = $1
        `;
        
        const result = await pool.query(query, [numero]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Número não encontrado'
            });
        }
        
        const numeroInfo = result.rows[0];
        
        res.json({
            success: true,
            data: {
                numero: numero,
                codpais: numeroInfo.codpais,
                ddd: numeroInfo.ddd,
                numero_individual: numeroInfo.numero,
                status: numeroInfo.status,
                saldo_minutos: numeroInfo.saldo_minutos,
                data_ativacao: numeroInfo.data_ativacao,
                data_atual: numeroInfo.data_atual,
                saldo_suficiente: numeroInfo.saldo_minutos > 0
            }
        });
    } catch (error) {
        console.error('Erro ao obter status do número:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /conversas/clientesconectados - Obter clientes conectados
router.get('/clientesconectados', async (req, res) => {
    try {
        const pool = require('../models/db');
        
        // Buscar números ativos com saldo
        const query = `
            SELECT codpais, ddd, numero, status, saldo_minutos, data_ativacao, data_atual
            FROM numbers 
            WHERE status = 'ativo' 
            AND saldo_minutos > 0
            ORDER BY data_ativacao DESC
        `;
        
        const result = await pool.query(query);
        const numerosAtivos = result.rows;
        
        // Verificar se há múltiplos números para iniciar conversas automáticas
        let deveIniciarConversas = false;
        if (numerosAtivos.length > 1) {
            deveIniciarConversas = true;
        }
        
        res.json({
            success: true,
            data: {
                totalClientes: numerosAtivos.length,
                clientes: numerosAtivos.map(cliente => ({
                    numero_completo: `${cliente.codpais}${cliente.ddd}${cliente.numero}`,
                    codpais: cliente.codpais,
                    ddd: cliente.ddd,
                    numero: cliente.numero,
                    status: cliente.status,
                    saldo_minutos: cliente.saldo_minutos,
                    data_ativacao: cliente.data_ativacao,
                    data_atual: cliente.data_atual
                })),
                deveIniciarConversas: deveIniciarConversas,
                message: deveIniciarConversas 
                    ? `Sistema com ${numerosAtivos.length} números ativos - Conversas automáticas habilitadas`
                    : `Sistema com ${numerosAtivos.length} número(s) ativo(s) - Conversas automáticas desabilitadas`
            }
        });
    } catch (error) {
        console.error('Erro ao obter clientes conectados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /conversas/status - Obter status das conversas (mantido para compatibilidade)
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
