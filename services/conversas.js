const fs = require('fs').promises;
const path = require('path');
const pool = require('../models/db');
const whatsappService = require('./whatsapp');

class ConversasService {

    // Inicialização do serviço
    constructor() {
        this.conversasAtivas = new Map(); // browserId -> conversa
        this.mensagens = []; // chatsimulation.json
        this.intervalos = new Map(); // browserId -> setInterval
    }

    // Função utilitária para extrair código do país, DDD e número
    extrairComponentesNumero(numero) {
        let codpais = numero.substring(0, 2);
        let ddd = numero.substring(2, 4);
        let num = numero.substring(4);

        console.log(`[DEBUG] Extraindo de "${numero}": codpais=${codpais}, ddd=${ddd}, numero=${num}`);
        return { codpais, ddd, numero: num };
    }

    // Normalizar para o número real do WhatsApp (wid.user) quando vier id de sessão
    normalizarNumeroReal(browserId, numero) {
        try {
            if (typeof numero === 'string' && numero.startsWith('5500')) {
                const real = whatsappService.getRealNumber(browserId);
                if (real && /^\d{12}$/.test(real)) {
                    return real;
                }
            }
        } catch (e) {
            console.warn('Falha ao normalizar número real:', e?.message || e);
        }
        return numero;
    }

    // Carregar mensagens do JSON
    async carregarMensagens() {
        try {
            const filePath = path.join(__dirname, '..', 'chatsimulation.json');
            const data = await fs.readFile(filePath, 'utf8');
            this.mensagens = JSON.parse(data);
            console.log(`Carregadas ${this.mensagens.length} mensagens para conversas automáticas`);
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            this.mensagens = [];
        }
    }

    // Verificar dispositivos ativos no banco
    async verificarDispositivosAtivos() {
        const client = await pool.connect();
        try {
            const query = `
                SELECT codpais, ddd, numero, saldo_minutos, total_conversas_ativas
                FROM numbers 
                WHERE status = 'ativo' 
                AND saldo_minutos > 0
                ORDER BY RANDOM()
            `;
            const result = await client.query(query);
            return result.rows;
        } catch (error) {
            console.error('Erro ao verificar dispositivos ativos:', error);
            return [];
        }
    }

    // Iniciar conversas para um dispositivo
    async iniciarConversasParaDispositivo(browserId, numero) {
        try {
            console.log('Iniciando conversas para dispositivo:', browserId, numero);
            // Normalizar número: garantir que é o número real (wid.user) e não o id de sessão
            const numeroNormalizado = this.normalizarNumeroReal(browserId, numero);
            if (numero !== numeroNormalizado) {
                console.log(`[Normalização] Número de sessão detectado. Normalizando ${numero} -> ${numeroNormalizado}`);
            }
            numero = numeroNormalizado;
            console.log('Dispositivos ativos:', this.conversasAtivas);
            // Verificar se já tem conversas ativas
            if (this.conversasAtivas.has(browserId)) {
                console.log(`Conversas já ativas para ${browserId}`);
                return false;
            }

            // Verificar saldo
            const saldo = await this.verificarSaldo(numero);
            console.log('Saldo services conversas.js:', saldo);
            if (saldo <= 0) {
                console.log(`Saldo insuficiente para ${numero}`);
                return false;
            }

            // Selecionar até 3 outros dispositivos ativos E conectados no sistema
            const dispositivosAtivos = await this.verificarDispositivosAtivos();
            const conectados = whatsappService.getConnectedNumbers().map(c => c.realNumber);
            console.log('Dispositivos ativos (DB):', dispositivosAtivos);
            console.log('Números conectados (Runtime):', conectados);
            const outrosDispositivos = dispositivosAtivos
                .filter(d => `${d.codpais}${d.ddd}${d.numero}` !== numero)
                .filter(d => conectados.includes(`${d.codpais}${d.ddd}${d.numero}`))
                .slice(0, 3);

            // Se não há outros dispositivos conectados, não iniciar conversas
            if (outrosDispositivos.length === 0) {
                console.log(`Nenhum dispositivo CONECTADO disponível para conversar com ${numero}. Abortando início de conversas.`);
                return false;
            }

            // Criar conversa
            const conversa = {
                browserId,
                numero,
                dispositivos: outrosDispositivos,
                mensagemAtual: 0,
                ativo: true
            };

            this.conversasAtivas.set(browserId, conversa);

            // Iniciar loop de mensagens
            this.iniciarLoopMensagens(browserId);

            // Atualizar total_conversas_ativas no banco
            await this.atualizarConversasAtivas(numero, 1);

            console.log(`Conversas iniciadas para ${numero} com ${dispositivosParaConversar.length} dispositivos`);
            return true;

        } catch (error) {
            console.error('Erro ao iniciar conversas:', error);
            return false;
        }
    }

    // Iniciar loop de mensagens
    iniciarLoopMensagens(browserId) {
        const conversa = this.conversasAtivas.get(browserId);
        if (!conversa) return;

        const enviarMensagem = async () => {
            if (!conversa.ativo) return;

            try {
                // Verificar saldo
                const saldo = await this.verificarSaldo(conversa.numero);
                if (saldo <= 0) {
                    await this.pararConversas(browserId);
                    return;
                }

                // Enviar mensagem
                await this.enviarMensagem(browserId, conversa.mensagemAtual);

                // Avançar para próxima mensagem
                conversa.mensagemAtual++;
                if (conversa.mensagemAtual >= this.mensagens.length) {
                    conversa.mensagemAtual = 0; // Voltar ao início
                }

                // Consumir saldo (1 segundo = 1/60 minuto)
                await this.consumirSaldo(conversa.numero, 1/60);

                // Verificar saldo baixo
                if (saldo <= 5) {
                    this.notificarSaldoBaixo(conversa.numero, saldo);
                }

            } catch (error) {
                console.error('Erro no loop de mensagens:', error);
            }
        };

        // Primeira mensagem imediata
        enviarMensagem();

        // Configurar intervalo
        const intervalo = setInterval(async () => {
            if (!conversa.ativo) {
                clearInterval(intervalo);
                return;
            }
            await enviarMensagem();
        }, (Math.floor(Math.random() * 10) + 1) * 1000); // 1-10 segundos

        this.intervalos.set(browserId, intervalo);
    }

    // Enviar mensagem específica
    async enviarMensagem(browserId, mensagemId) {
        const conversa = this.conversasAtivas.get(browserId);
        console.timeLog("CONVERSA>>>:",conversa)
        if (!conversa || !this.mensagens[mensagemId]) return;

        const mensagem = this.mensagens[mensagemId];
        
        // Enviar para cada dispositivo da conversa
        for (const dispositivo of conversa.dispositivos) {
            try {
                const numeroDestino = `${dispositivo.codpais}${dispositivo.ddd}${dispositivo.numero}`;
                
                // Verificar se é um dispositivo simulado (números fictícios)
                const isSimulado = ['999999999', '888888888', '777777777'].includes(dispositivo.numero);
                
                if (isSimulado) {
                    // Para dispositivos simulados, apenas logar
                    console.log(`📱 [SIMULADO] Mensagem ${mensagemId} de ${conversa.numero} para ${numeroDestino}: ${mensagem.mensagem}`);
                } else {
                    // Para dispositivos reais, enviar mensagem via WhatsApp
                    const { codpais, ddd, numero: num } = this.extrairComponentesNumero(conversa.numero);
                    const resultado = await whatsappService.sendMessage(
                        // Extrair codpais, ddd e numero do número de origem (conversa.numero)
                        codpais,
                        ddd,
                        num,
                        numeroDestino, // número de destino
                        mensagem.mensagem, // mensagem
                        browserId // browserId do cliente
                    );
                    
                    if (resultado.success) {
                        console.log(`✅ Mensagem ${mensagemId} enviada de ${conversa.numero} para ${numeroDestino}`);
                    } else {
                        console.log(`❌ Erro ao enviar mensagem ${mensagemId} para ${numeroDestino}: ${resultado.message}`);
                    }
                }
                
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
            }
        }
    }

    // Verificar saldo de um número
    async verificarSaldo(numero) {
        const client = await pool.connect();
        try {
            console.log(`Verificando saldo para número: ${numero}`);
            
            const { codpais, ddd, numero: num } = this.extrairComponentesNumero(numero);
            console.log(codpais, ddd, num)
            const query = `
                SELECT saldo_minutos 
                FROM numbers 
                WHERE codpais = $1 AND ddd = $2 AND numero = $3
            `;
            
            const result = await client.query(query, [codpais, ddd, num]);
            
            const saldo = result.rows[0]?.saldo_minutos || 0;
            
            return saldo;
        } catch (error) {
            console.error('Erro ao verificar saldo:', error);
            return 0;
        }
    }

    // Consumir saldo
    async consumirSaldo(numero, minutos) {
        const client = await pool.connect();
        try {
            const { codpais, ddd, numero: num } = this.extrairComponentesNumero(numero);

            const query = `
                UPDATE numbers 
                SET saldo_minutos = GREATEST(0, saldo_minutos - $4),
                    total_mensagens = total_mensagens + 1
                WHERE codpais = $1 AND ddd = $2 AND numero = $3
            `;
            await client.query(query, [codpais, ddd, num, minutos]);
        } catch (error) {
            console.error('Erro ao consumir saldo:', error);
        }
    }

    // Atualizar total de conversas ativas
    async atualizarConversasAtivas(numero, delta) {
        const client = await pool.connect();
        try {
            const { codpais, ddd, numero: num } = this.extrairComponentesNumero(numero);

            const query = `
                UPDATE numbers 
                SET total_conversas_ativas = GREATEST(0, total_conversas_ativas + $4)
                WHERE codpais = $1 AND ddd = $2 AND numero = $3
            `;
            await client.query(query, [codpais, ddd, num, delta]);
        } catch (error) {
            console.error('Erro ao atualizar conversas ativas:', error);
        }
    }

    // Parar conversas de um dispositivo
    async pararConversas(browserId) {
        const conversa = this.conversasAtivas.get(browserId);
        if (!conversa) return;

        // Parar loop
        conversa.ativo = false;
        const intervalo = this.intervalos.get(browserId);
        if (intervalo) {
            clearInterval(intervalo);
            this.intervalos.delete(browserId);
        }

        // Atualizar banco
        await this.atualizarConversasAtivas(conversa.numero, -1);

        // Remover da lista
        this.conversasAtivas.delete(browserId);

        console.log(`Conversas paradas para ${conversa.numero}`);
    }

    // Notificar saldo baixo
    notificarSaldoBaixo(numero, saldo) {
        // TODO: Emitir evento via Socket.IO
        console.log(`⚠️ Saldo baixo para ${numero}: ${saldo} minutos restantes`);
    }

    // Adicionar crédito (para testes)
    async adicionarCredito(numero, minutos) {
        const client = await pool.connect();
        try {
            console.log(`Tentando adicionar ${minutos} minutos para número: ${numero}`);
            
            const { codpais, ddd, numero: num } = this.extrairComponentesNumero(numero);
            console.log(`Extraído: codpais=${codpais}, ddd=${ddd}, numero=${num}`);

            // Primeiro verificar se o registro existe
            const checkQuery = `
                SELECT saldo_minutos 
                FROM numbers 
                WHERE codpais = $1 AND ddd = $2 AND numero = $3
            `;
            const checkResult = await client.query(checkQuery, [codpais, ddd, num]);
            console.log(`Verificação: ${checkResult.rows.length} registros encontrados`);
            
            if (checkResult.rows.length === 0) {
                // Se não existe, criar o registro
                console.log('Criando novo registro...');
                const insertQuery = `
                    INSERT INTO numbers (codpais, ddd, numero, status, data_ativacao, saldo_minutos, total_mensagens, total_conversas_ativas)
                    VALUES ($1, $2, $3, 'ativo', NOW(), $4, 0, 0)
                `;
                await client.query(insertQuery, [codpais, ddd, num, minutos]);
                console.log(`Registro criado e +${minutos} minutos adicionados para ${numero}`);
            } else {
                // Se existe, atualizar o saldo
                console.log('Atualizando registro existente...');
                const updateQuery = `
                    UPDATE numbers 
                    SET saldo_minutos = saldo_minutos + $4
                    WHERE codpais = $1 AND ddd = $2 AND numero = $3
                `;
                
                await client.query(updateQuery, [codpais, ddd, num, minutos]);
                console.log(`+${minutos} minutos adicionados para ${numero}`);
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao adicionar crédito:', error);
            return false;
        }
    }

    // Obter status das conversas
    getStatusConversas() {
        const status = [];
        for (const [browserId, conversa] of this.conversasAtivas) {
            status.push({
                browserId,
                numero: conversa.numero,
                dispositivos: conversa.dispositivos.length,
                mensagemAtual: conversa.mensagemAtual,
                ativo: conversa.ativo
            });
        }
        return status;
    }
}

module.exports = new ConversasService();
