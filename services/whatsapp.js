const { Client, NoAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

class WhatsAppService {
  constructor() {
    this.clients = new Map(); // Armazena clientes por browserId
    this.qrCodes = new Map(); // Armazena QR codes por browserId
    this.io = null; // Será definido depois
  }

  // Definir instância do Socket.IO
  setIO(io) {
    this.io = io;
  }

  // Escolhe a estratégia de autenticação
  getAuthStrategy(browserId) {
    // Sempre usar NoAuth para forçar nova sessão a cada inicialização
    console.log(`[Auth] Usando NoAuth para ${browserId} - sessão sempre nova`);
    return new NoAuth();
  }

  // Limpar cache do Chromium
  clearChromiumCache() {
    try {
      const cachePath = path.join(process.cwd(), '.wwebjs_auth');
      if (fs.existsSync(cachePath)) {
        console.log('Limpando cache do Chromium...');
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log('Cache limpo com sucesso!');
        return true;
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
    return false;
  }

  // Inicializa um cliente WhatsApp para um número específico
  async initializeClient(codpais, ddd, numero, browserId, options = {}) {
    const { force = false } = options;
    const numberKey = `${codpais}${ddd}${numero}`;
    console.log(`Inicializando cliente para: ${numberKey}`);
    
    if (this.clients.has(browserId)) {
      const existing = this.clients.get(browserId);
      // Se já conectado, retornar sucesso idempotente
      if (existing && existing.isConnected === true && !force) {
        console.log(`Cliente ${numberKey} já conectado. Retornando idempotente.`);
        return { success: true, message: 'Cliente já conectado' };
      }
      // Se force, desconectar antes de recriar
      if (force) {
        console.log(`Force=true: desconectando cliente existente ${numberKey} antes de reinicializar.`);
        try {
          await this.disconnectClient(codpais, ddd, numero, browserId);
        } catch (e) {
          console.warn('Erro ao forçar desconexão antes de reinicializar:', e?.message || e);
        }
      } else {
        console.log(`Cliente ${numberKey} já existe (inicializando/recuperando). Retornando idempotente.`);
        return { success: true, message: 'Cliente já está inicializado ou em processo de inicialização' };
      }
    }

    console.log(`Criando novo cliente para ${numberKey}`);
    const client = new Client({
      authStrategy: this.getAuthStrategy(browserId),
      puppeteer: {
        headless: true, // Voltando para headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-zygote',
          '--single-process',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--disable-accelerated-2d-canvas',
          '--no-zygote',
          '--disable-gpu-sandbox',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox'
        ],
        timeout: 60000 // 60 segundos de timeout
      }
    });

    console.log(`Cliente criado, configurando eventos...`);

    // Evento: QR Code gerado
    client.on('qr', async (qr) => {
      console.log(`QR Code recebido para ${numberKey}`);
      try {
        const qrCodeDataUrl = await qrcode.toDataURL(qr);
        this.qrCodes.set(browserId, qrCodeDataUrl);
        console.log(`QR Code gerado para ${numberKey}`);
        
        // Emitir evento via Socket.IO para o room específico
        if (this.io && browserId) {
          this.io.to(browserId).emit('qr', { 
            id: numberKey, 
            src: qrCodeDataUrl,
            browserId: browserId
          });
          this.io.to(browserId).emit('message', { 
            id: numberKey, 
            text: 'QR Code recebido, escaneie por favor!',
            browserId: browserId
          });
        }
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      }
    });

    // Evento: Cliente pronto
    client.on('ready', async () => {
      console.log(`=== EVENTO READY DISPARADO ===`);
      console.log(`Cliente WhatsApp pronto para ${numberKey}`);
      this.qrCodes.delete(browserId); // Remove QR code quando conectado
      
      try {
        // Obter informações do cliente para capturar o número real
        const clientInfo = client.info;
        console.log('Informações do cliente:', clientInfo);
        
        // Capturar o número real do WhatsApp
        const realNumber = clientInfo.wid.user; // Número sem @c.us
        console.log(`Número real do WhatsApp: ${realNumber}`);
        
        // Conversas demo embutidas para renderização rápida
        const demoChats = [
          { id: 'demo1', name: 'João Silva', lastMessage: 'Olá! Como vai?', status: 'MOBILE', isGroup: false },
          { id: 'demo2', name: 'Maria Santos', lastMessage: 'Bom dia! Tudo bem?', status: 'MOBILE', isGroup: false },
          { id: 'demo3', name: 'Pedro Costa', lastMessage: 'Obrigado pela ajuda!', status: 'MOBILE', isGroup: false },
          { id: 'demo4', name: 'Ana Oliveira', lastMessage: 'Vou chegar em 10 minutos', status: 'MOBILE', isGroup: false },
          { id: 'demo5', name: 'Carlos Lima', lastMessage: 'Preciso de informações', status: 'MOBILE', isGroup: false },
          { id: 'demo6', name: 'Lucia Ferreira', lastMessage: 'Encontrei o que procurava', status: 'MOBILE', isGroup: false },
          { id: 'demo7', name: 'Roberto Alves', lastMessage: 'Amanhã às 14h?', status: 'MOBILE', isGroup: false },
          { id: 'demo8', name: 'Fernanda Rocha', lastMessage: 'Perfeito! Combinado', status: 'MOBILE', isGroup: false }
        ];
        
        console.log(`Usando ${demoChats.length} conversas demo para renderização rápida`);
        
        // Emitir evento via Socket.IO com o número real e conversas demo para o room específico
        if (this.io && browserId) {
          console.log('Emitindo evento ready via Socket.IO...');
          this.io.to(browserId).emit('ready', { 
            id: numberKey,
            realNumber: realNumber,
            clientInfo: clientInfo,
            recentChats: demoChats,
            browserId: browserId
          });
          console.log('Evento ready emitido com sucesso');
          
          this.io.to(browserId).emit('message', { 
            id: numberKey, 
            text: 'WhatsApp está pronto!',
            browserId: browserId
          });
        } else {
          console.log('Socket.IO não está configurado ou browserId não fornecido');
        }

      } catch (error) {
        console.error('Erro ao obter informações do cliente:', error);
        
        // Emitir evento sem número real em caso de erro
        if (this.io && browserId) {
          this.io.to(browserId).emit('ready', { 
            id: numberKey,
            browserId: browserId
          });
          this.io.to(browserId).emit('message', { 
            id: numberKey, 
            text: 'WhatsApp está pronto!',
            browserId: browserId
          });
        }
      }
    });

    // Evento: Mensagem recebida
    client.on('message', async (message) => {
      // Filtrar mensagens de status
      if (message.from === 'status@broadcast') {
        // console.log(`Mensagem de status ignorada: ${message.body}`);
        return;
      }

      if (message.from.includes('@g.us')) {
        // console.log(`Mensagem de status ignorada: ${message.body}`);
        return;
      }
      
      console.log(`Mensagem recebida de ${message.from}: ${message.body}`);

      // Não atualizar conversas em tempo real para manter performance
      // As conversas demo são estáticas e rápidas

      // Aqui você pode implementar a lógica de processamento de mensagens
      // Por exemplo, verificar saldo, limites, etc.

      // Resposta automática simples
      if (message.body.toLowerCase() === 'oi' || message.body.toLowerCase() === 'olá') {
        await message.reply('Olá! Bem-vindo ao sistema de aquecedor WhatsApp.');
      }
    });

    // Evento: Autenticado
    client.on('authenticated', async () => {
      console.log(`Cliente ${numberKey} autenticado`);
      
      // Aguardar um pouco e verificar se o cliente está pronto
      setTimeout(async () => {
        try {
          if (client.isConnected) {
            console.log(`Cliente ${numberKey} está conectado, emitindo ready...`);
            
            // Obter informações do cliente
            const clientInfo = client.info;
            const realNumber = clientInfo.wid.user;
            
            // Conversas demo para renderização rápida
            const demoChats = [
              { id: 'demo1', name: 'João Silva', lastMessage: 'Olá! Como vai?', status: 'MOBILE', isGroup: false },
              { id: 'demo2', name: 'Maria Santos', lastMessage: 'Bom dia! Tudo bem?', status: 'MOBILE', isGroup: false },
              { id: 'demo3', name: 'Pedro Costa', lastMessage: 'Obrigado pela ajuda!', status: 'MOBILE', isGroup: false },
              { id: 'demo4', name: 'Ana Oliveira', lastMessage: 'Vou chegar em 10 minutos', status: 'MOBILE', isGroup: false }
            ];
            
            // Emitir evento ready
            if (this.io && browserId) {
              this.io.to(browserId).emit('ready', { 
                id: numberKey,
                realNumber: realNumber,
                clientInfo: clientInfo,
                recentChats: demoChats,
                browserId: browserId
              });
              this.io.to(browserId).emit('message', { 
                id: numberKey, 
                text: 'WhatsApp está pronto!',
                browserId: browserId
              });
            }
          }
        } catch (error) {
          console.error('Erro ao verificar cliente pronto:', error);
        }
      }, 3000); // Aguardar 3 segundos
      
      // Emitir evento via Socket.IO para o room específico
      if (this.io && browserId) {
        this.io.to(browserId).emit('authenticated', { 
          id: numberKey,
          browserId: browserId
        });
        this.io.to(browserId).emit('message', { 
          id: numberKey, 
          text: 'WhatsApp está autenticado!',
          browserId: browserId
        });
      }
    });

    // Evento: Autenticação falhou
    client.on('auth_failure', (msg) => {
      console.log(`Falha de autenticação para ${numberKey}:`, msg);
      // Nota: evitar limpar cache automaticamente aqui para não conflitar com o logout
      
      // Emitir evento via Socket.IO para o room específico
      if (this.io && browserId) {
        this.io.to(browserId).emit('auth_failure', { 
          id: numberKey,
          message: msg,
          browserId: browserId
        });
        this.io.to(browserId).emit('message', { 
          id: numberKey, 
          text: 'Falha na autenticação.',
          browserId: browserId
        });
      }
    });

    // Evento: Loading screen
    client.on('loading_screen', (percent, message) => {
      console.log(`Loading ${numberKey}: ${percent}% - ${message}`);
    });

    // Evento: Cliente desconectado
    client.on('disconnected', (reason) => {
      console.log(`Cliente ${numberKey} desconectado:`, reason);
      // Nota: evitar limpar cache automaticamente aqui para não conflitar com o logout
      
      this.clients.delete(browserId);
      this.qrCodes.delete(browserId);
      
      // Emitir evento via Socket.IO para o room específico
      if (this.io && browserId) {
        this.io.to(browserId).emit('disconnected', { 
          id: numberKey,
          reason: reason,
          browserId: browserId
        });
        this.io.to(browserId).emit('message', { 
          id: numberKey, 
          text: 'WhatsApp foi desconectado!',
          browserId: browserId
        });
      }
    });

    try {
      console.log(`Inicializando cliente ${numberKey}...`);
      console.log(`Aguardando inicialização...`);
      
      // Adicionar timeout para evitar travamento
      const initPromise = client.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na inicialização')), 60000); // 60 segundos
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log(`Cliente ${numberKey} inicializado com sucesso`);
      this.clients.set(browserId, client);
      return { success: true, message: 'Cliente inicializado com sucesso' };
    } catch (error) {
      console.error(`Erro ao inicializar cliente ${numberKey}:`, error);
      return { error: error.message };
    }
  }

  // Obtém informações do cliente conectado
  getClientInfo(browserId) {
    const client = this.clients.get(browserId);

    if (!client) {
      return null;
    }

    return {
      isConnected: client.isConnected,
      browserId: browserId,
      // Aqui você pode adicionar mais informações do cliente se necessário
    };
  }

  // Obtém o QR Code para um browserId
  getQRCode(browserId) {
    return this.qrCodes.get(browserId) || null;
  }

  // Verifica se um cliente está conectado
  isConnected(browserId) {
    console.log(`[isConnected] Verificando browserId: ${browserId}`);
    console.log(`[isConnected] Clientes ativos:`, Array.from(this.clients.keys()));
    
    const client = this.clients.get(browserId);
    
    if (client) {
      // Com NoAuth, vamos considerar conectado se o cliente existe e não foi destruído
      // O isConnected pode ser false mesmo com o cliente funcionando
      const connected = client && !client.destroyed;
      console.log(`[isConnected] Cliente encontrado para ${browserId}`);
      console.log(`[isConnected] - isConnected: ${client.isConnected}`);
      console.log(`[isConnected] - destroyed: ${client.destroyed}`);
      console.log(`[isConnected] - resultado final: ${connected}`);
      return connected;
    }
    
    console.log(`[isConnected] Cliente não encontrado para ${browserId}`);
    return false;
  }

  // Envia mensagem de texto
  async sendMessage(codpais, ddd, numero, to, message, browserId) {
    const numberKey = `${codpais}${ddd}${numero}`;
    const client = this.clients.get(browserId);
    
    if (!client) {
      throw new Error('Cliente não encontrado');
    }

    if (!client.isConnected) {
      throw new Error('Cliente não está conectado');
    }

    try {
      const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
      const result = await client.sendMessage(chatId, message);
      
      // Não atualizar conversas para manter performance
      // As conversas demo são estáticas e rápidas
      
      return { success: true, messageId: result.id._serialized };
    } catch (error) {
      throw new Error(`Erro ao enviar mensagem: ${error.message}`);
    }
  }

  // Desconecta um cliente
  async disconnectClient(codpais, ddd, numero, browserId) {
    const numberKey = `${codpais}${ddd}${numero}`;
    const client = this.clients.get(browserId);

    if (client) {
      // Primeiro, logout para que RemoteAuth remova a sessão remota no store (Postgres)
      try {
        if (typeof client.logout === 'function') {
          console.log(`[Disconnect] Executando logout para ${numberKey}`);
          await client.logout();
        }
      } catch (error) {
        if (error && (error.code === 'EBUSY' || error.code === 'EPERM')) {
          console.warn('[Disconnect] Ignorando erro no logout (arquivo bloqueado):', error.message);
        } else {
          console.warn('[Disconnect] Erro no logout, seguindo para destroy:', error.message || error);
        }
      }

      // Depois, destruir o cliente/puppeteer
      try {
        console.log(`[Disconnect] Destruindo cliente ${numberKey}`);
        await client.destroy();
      } catch (error) {
        // Evitar crash em Windows quando arquivos estão bloqueados (EBUSY/EPERM)
        if (error && (error.code === 'EBUSY' || error.code === 'EPERM')) {
          console.warn('Ignorando erro ao destruir cliente (arquivo bloqueado):', error.message);
        } else {
          console.error('Erro ao destruir cliente:', error);
        }
      }
      this.clients.delete(browserId);
      this.qrCodes.delete(browserId);
      return { success: true, message: 'Cliente desconectado' };
    }

    return { error: 'Cliente não encontrado' };
  }

  // Lista todos os clientes ativos
  getActiveClients() {
    const activeClients = [];
    for (const [browserId, client] of this.clients) {
      activeClients.push({
        browserId: browserId,
        connected: client.isConnected
      });
    }
    return activeClients;
  }
}

module.exports = new WhatsAppService(); 