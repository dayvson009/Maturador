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

// GET /conversas/clientesconectados - Obter clientes WhatsApp realmente conectados
router.get('/clientesconectados', async (req, res) => {
    try {
        // Importar o WhatsAppService para obter clientes realmente conectados
        const whatsappService = require('../services/whatsapp');
        
        // Obter clientes WhatsApp realmente conectados no sistema
        const clientesConectados = whatsappService.getActiveClients();
        
        // Buscar informações adicionais do banco para os clientes conectados
        const pool = require('../models/db');
        const numerosComInfo = [];
        
        // Buscar todos os números ativos no banco
        const query = `
            SELECT codpais, ddd, numero, status, saldo_minutos, data_ativacao, data_atual
            FROM numbers 
            WHERE status = 'ativo' 
            ORDER BY data_ativacao DESC
        `;
        
        const result = await pool.query(query);
        const numerosAtivos = result.rows;
        
        // Para cada cliente conectado, tentar encontrar informações correspondentes
        for (const cliente of clientesConectados) {
            try {
                // Por enquanto, vamos mostrar apenas as informações básicas do cliente
                // já que não temos browserId na tabela para fazer o relacionamento
                numerosComInfo.push({
                    browserId: cliente.browserId,
                    numero_completo: 'Cliente WhatsApp Conectado',
                    codpais: 'N/A',
                    ddd: 'N/A',
                    numero: 'N/A',
                    status: 'Conectado',
                    saldo_minutos: 'N/A',
                    data_ativacao: null,
                    data_atual: null,
                    conectado: cliente.connected,
                    status_conexao: cliente.connected ? 'Conectado' : 'Desconectado',
                    observacao: 'Cliente WhatsApp ativo no sistema'
                });
            } catch (error) {
                console.error(`Erro ao processar cliente ${cliente.browserId}:`, error);
            }
        }
        
        // Adicionar informações dos números ativos no banco (para referência)
        for (const numero of numerosAtivos) {
            numerosComInfo.push({
                browserId: 'N/A',
                numero_completo: `${numero.codpais}${numero.ddd}${numero.numero}`,
                codpais: numero.codpais,
                ddd: numero.ddd,
                numero: numero.numero,
                status: numero.status,
                saldo_minutos: numero.saldo_minutos,
                data_ativacao: numero.data_ativacao,
                data_atual: numero.data_atual,
                conectado: 'N/A',
                status_conexao: 'N/A',
                observacao: 'Número ativo no banco de dados'
            });
        }
        
        // Verificar se há múltiplos clientes conectados para iniciar conversas automáticas
        let deveIniciarConversas = false;
        if (clientesConectados.length > 1) {
            deveIniciarConversas = true;
        }
        
        res.json({
            success: true,
            data: {
                totalClientesConectados: clientesConectados.length,
                clientes: numerosComInfo,
                deveIniciarConversas: deveIniciarConversas,
                message: deveIniciarConversas 
                    ? `Sistema com ${clientesConectados.length} clientes WhatsApp conectados - Conversas automáticas habilitadas`
                    : `Sistema com ${clientesConectados.length} cliente(s) WhatsApp conectado(s) - Conversas automáticas desabilitadas`,
                detalhes: {
                    clientesWhatsApp: clientesConectados.length,
                    clientesComInfo: numerosComInfo.length,
                    status: 'Ativo'
                }
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

// POST /sendmessage - Enviar mensagem de teste
router.post('/sendmessage', async (req, res) => {
    try {
        const { from, to, message } = req.body;
        
        if (!from || !to || !message) {
            return res.status(400).json({
                success: false,
                message: 'from, to e message são obrigatórios'
            });
        }
        
        console.log(`📤 Teste de envio: ${from} -> ${to}: ${message}`);
        
        // Importar o WhatsAppService
        const whatsappService = require('../services/whatsapp');
        
        // Encontrar um cliente WhatsApp ativo para enviar a mensagem
        const clientesAtivos = whatsappService.getActiveClients();
        
        if (clientesAtivos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum cliente WhatsApp conectado'
            });
        }
        
        // Usar o primeiro cliente ativo
        const browserId = clientesAtivos[0].browserId;
        
        // Extrair componentes do número de origem
        const fromComponents = extrairComponentesNumero(from);
        
        // Enviar mensagem
        const resultado = await whatsappService.sendMessage(
            fromComponents.codpais,
            fromComponents.ddd,
            fromComponents.numero,
            to,
            message,
            browserId
        );
        
        if (resultado.success) {
            res.json({
                success: true,
                message: 'Mensagem enviada com sucesso',
                data: {
                    from: from,
                    to: to,
                    message: message,
                    messageId: resultado.messageId,
                    browserId: browserId
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: resultado.message || 'Erro ao enviar mensagem'
            });
        }
        
    } catch (error) {
        console.error('Erro ao enviar mensagem de teste:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Função auxiliar para extrair componentes do número
function extrairComponentesNumero(numero) {
    let codpais = numero.substring(0, 2);
    let ddd = numero.substring(2, 4);
    let num = numero.substring(4);
    
    return { codpais, ddd, numero: num };
}

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
