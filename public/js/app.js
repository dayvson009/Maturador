// Variáveis globais
let connectedNumbers = [];
let currentNumber = null;
let qrCheckInterval = null;
let browserId = null; // ID único para este navegador
let sessionCounter = 0; // Contador para gerar números únicos

// Funções auxiliares
// Gerar browserId de fallback (caso o servidor não responda)
function generateFallbackBrowserId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `fallback_${timestamp}_${random}`;
}

// Obter browserId da sessão do servidor
async function getBrowserIdFromSession() {
    console.log('Função getBrowserIdFromSession chamada');
    try {
        // Primeiro, tentar carregar do localStorage
        const savedBrowserId = localStorage.getItem('browserId');
        
        if (savedBrowserId) {
            console.log('BrowserId encontrado no localStorage:', savedBrowserId);
            browserId = savedBrowserId;
            return;
        }
        
        // Se não existe no localStorage, obter do servidor
        console.log('Obtendo browserId do servidor...');
        const response = await fetch('/api/browser-id');
        
        if (response.ok) {
            const data = await response.json();
            browserId = data.browserId;
            
            // Salvar no localStorage para persistência
            localStorage.setItem('browserId', browserId);
            console.log('BrowserId obtido do servidor e salvo:', browserId);
        } else {
            console.error('Erro ao obter browserId do servidor');
            // Fallback: gerar um browserId local
            browserId = generateFallbackBrowserId();
            localStorage.setItem('browserId', browserId);
            console.log('BrowserId de fallback gerado:', browserId);
        }
    } catch (error) {
        console.error('Erro ao obter browserId:', error);
        // Fallback: gerar um browserId local
        browserId = generateFallbackBrowserId();
        localStorage.setItem('browserId', browserId);
        console.log('BrowserId de fallback gerado:', browserId);
    }
}

// Conectar ao Socket.IO
const socket = io();

// Eventos do Socket.IO
socket.on('connect', async () => {
    console.log('Conectado ao servidor via Socket.IO');
    console.log('Socket ID:', socket.id);
    
    // Obter browserId da sessão do servidor
    await getBrowserIdFromSession();
    
    // Entrar no room específico deste navegador
    socket.emit('join-browser-room', { browserId });
});

socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
});

// Evento: QR Code recebido (filtrado por browserId)
socket.on('qr', (data) => {
    console.log('=== EVENTO QR RECEBIDO ===');
    console.log('QR Code recebido para:', data.id);
    console.log('Browser ID:', data.browserId);
    
    // Só processar se for para este navegador
    if (data.browserId === browserId) {
        displayQRCode(data.src);
    } else {
        console.log('QR ignorado - não é para este navegador');
    }
});

// Evento: Falha de autenticação (filtrado por browserId)
socket.on('auth_failure', (data) => {
    console.log('=== EVENTO AUTH_FAILURE RECEBIDO ===');
    console.log('ID:', data.id);
    console.log('Mensagem:', data.message);
    console.log('Browser ID:', data.browserId);
    
    // Só processar se for para este navegador
    if (data.browserId === browserId) {
        // Mostrar estado inicial
        showInitialState();
        
        // Mostrar mensagem para o usuário
        alert('Falha na autenticação! O cache foi limpo automaticamente. Tente conectar novamente.');
    } else {
        console.log('Auth failure ignorado - não é para este navegador');
    }
});

// Evento: WhatsApp desconectado (filtrado por browserId)
socket.on('disconnected', (data) => {
    console.log('=== EVENTO DISCONNECTED RECEBIDO ===');
    console.log('ID:', data.id);
    console.log('Motivo:', data.reason);
    console.log('Browser ID:', data.browserId);
    
    // Só processar se for para este navegador
    if (data.browserId === browserId) {
        // Remover número da lista de conectados
        const index = connectedNumbers.findIndex(n => n.id === data.id);
        if (index !== -1) {
            connectedNumbers.splice(index, 1);
            saveConnectedNumbers();
            displayNumbers();
            console.log('Número removido da lista de conectados');
        }
        
        // Mostrar estado inicial
        showInitialState();
        
        // Mostrar mensagem para o usuário
        alert('WhatsApp foi desconectado! O cache foi limpo automaticamente.');
    } else {
        console.log('Disconnected ignorado - não é para este navegador');
    }
});

// Evento: Chats recebidos (filtrado por browserId)
socket.on('chats', (data) => {
    console.log('=== EVENTO CHATS RECEBIDO ===');
    console.log('ID:', data.id);
    console.log('Número de conversas:', data.recentChats?.length || 0);
    console.log('Primeiras 3 conversas:', data.recentChats?.slice(0, 3) || []);
    console.log('Browser ID:', data.browserId);
    
    // Só processar se for para este navegador
    if (data.browserId === browserId) {
        // Carregar conversas reais
        loadRealConversations(data.recentChats);
    } else {
        console.log('Chats ignorados - não são para este navegador');
    }
});

// Evento: WhatsApp pronto (filtrado por browserId)
socket.on('ready', (data) => {
    console.log('=== EVENTO READY RECEBIDO ===');
    console.log('WhatsApp pronto para:', data.id);
    console.log('Número real:', data.realNumber);
    console.log('Info do cliente:', data.clientInfo);
    console.log('Conversas recentes:', data.recentChats);
    console.log('Browser ID:', data.browserId);
    
    // Só processar se for para este navegador
    if (data.browserId === browserId) {
        // Esconder QR Code
        document.getElementById('qr-container').classList.add('hidden');
        
        // Mostrar conversas primeiro (por trás)
        showConversations();
        
        // Mostrar tag "Aquecendo WhatsApp" sobre as conversas
        showHeatingWhatsApp();
        
        // Após 2 segundos, ocultar a tag e mostrar conversas
        setTimeout(() => {
            hideHeatingWhatsApp();
            // Processar conexão com número real
            onWhatsAppConnected(data.id, data.realNumber, data.clientInfo, data.recentChats);
        }, 2000);
        
    } else {
        console.log('Ready ignorado - não é para este navegador');
    }
});

// Evento: WhatsApp autenticado (filtrado por browserId)
socket.on('authenticated', (data) => {
    console.log('=== EVENTO AUTHENTICATED RECEBIDO ===');
    console.log('WhatsApp autenticado para:', data.id);
    console.log('Browser ID:', data.browserId);
    
    // Só processar se for para este navegador
    if (data.browserId === browserId) {
        console.log('WhatsApp autenticado para este navegador');
    } else {
        console.log('Authenticated ignorado - não é para este navegador');
    }
});

// Evento: Mensagem do servidor (filtrado por browserId)
socket.on('message', (data) => {
    console.log('=== EVENTO MESSAGE RECEBIDO ===');
    console.log('ID:', data.id);
    console.log('Mensagem:', data.text);
    console.log('Browser ID:', data.browserId);
    
    // Só processar se for para este navegador
    if (data.browserId === browserId) {
        console.log('Mensagem processada para este navegador');
    } else {
        console.log('Message ignorado - não é para este navegador');
    }
});

// Evento: Sessão criada
socket.on('session-created', (data) => {
    console.log('=== EVENTO SESSION-CREATED RECEBIDO ===');
    console.log('Sessão criada:', data.id);
});

// Evento: Erro na sessão
socket.on('session-error', (data) => {
    console.error('=== EVENTO SESSION-ERROR RECEBIDO ===');
    console.error('Erro na sessão:', data.error);
});

// Carregar números conectados do localStorage
function loadConnectedNumbers() {
    const saved = localStorage.getItem('connectedNumbers');
    if (saved) {
        connectedNumbers = JSON.parse(saved);
    }
}

// Salvar números conectados no localStorage
function saveConnectedNumbers() {
    localStorage.setItem('connectedNumbers', JSON.stringify(connectedNumbers));
}

// Mostrar estado inicial
function showInitialState() {
    document.getElementById('qr-container').classList.add('hidden');
    document.getElementById('conversations-container').classList.add('hidden');
}

// Mostrar QR Code
function showQRCode(qrCodeDataUrl) {
    document.getElementById('qr-container').classList.remove('hidden');
    document.getElementById('conversations-container').classList.add('hidden');
    
    // Gerar número único para este dispositivo
    const deviceId = generateDeviceId();
    createWhatsAppSession(deviceId);
}

// Gerar ID único para dispositivo
function generateDeviceId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `device_${timestamp}_${random}`;
}

// Gerar número único para cada sessão
function generateUniqueNumber() {
    sessionCounter++;
    // Usar timestamp + contador para garantir unicidade
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
    const counter = sessionCounter.toString().padStart(3, '0'); // Contador com 3 dígitos
    const uniqueNum = `550091${timestamp}${counter}`;
    console.log(`Gerando número único: ${uniqueNum} (contador: ${sessionCounter})`);
    return uniqueNum;
}

// Criar sessão WhatsApp via Socket.IO
function createWhatsAppSession() {
    const status = document.getElementById('qr-status');
    status.textContent = 'Inicializando WhatsApp...';
    
    // Limpar QR anterior se existir
    const qrContainer = document.getElementById('qr-code');
    if (qrContainer) {
        qrContainer.innerHTML = '';
    }
    
    // Gerar número único para esta sessão
    const uniqueNumber = generateUniqueNumber();
    console.log(`Gerando sessão com número único: ${uniqueNumber}`);
    console.log(`Usando browserId: ${browserId}`);
    
    // Emitir evento para criar sessão
    socket.emit('create-session', {
        codpais: '55',
        ddd: '00',
        numero: uniqueNumber,
        browserId: browserId
    });
}

// Mostrar tag flutuante "Aquecendo WhatsApp"
function showHeatingWhatsApp() {
    const heatingElement = document.getElementById('heating-whatsapp');
    if (heatingElement) {
        heatingElement.classList.remove('hidden');
        heatingElement.classList.add('visible');
        console.log('Tag "Aquecendo WhatsApp" exibida');
    }
}

// Ocultar tag flutuante "Aquecendo WhatsApp"
function hideHeatingWhatsApp() {
    const heatingElement = document.getElementById('heating-whatsapp');
    if (heatingElement) {
        heatingElement.classList.remove('visible');
        console.log('Tag "Aquecendo WhatsApp" ocultada');
    }
}

// WhatsApp conectado com sucesso
async function onWhatsAppConnected(numberId, realNumber, clientInfo, recentChats) {
    try {
        // Verificar se o número já existe
        const existingNumber = connectedNumbers.find(n => n.id === numberId);
        if (existingNumber) {
            console.log('Número já existe na lista:', numberId);
            return;
        }

        // Usar o número único da sessão (não o número real do WhatsApp)
        const phoneNumber = numberId; // Usar o numberId que é o número único da sessão
        console.log('Usando número da sessão:', phoneNumber);
        
        // Extrair código do país e DDD do número da sessão
        let codpais = '55';
        let ddd = '00';
        let numero = phoneNumber.substring(6); // Remove "550091" do início
        
        console.log(`Extraindo do número ${phoneNumber}: codpais=${codpais}, ddd=${ddd}, numero=${numero}`);
        
        // Adicionar número à lista
        const newNumber = {
            id: numberId,
            codpais: codpais,
            ddd: ddd,
            numero: numero,
            realNumber: realNumber || phoneNumber, // Número real do WhatsApp (se disponível)
            status: 'ativo',
            deviceId: browserId, // Usar o browserId da sessão
            connectedAt: new Date().toISOString(),
            clientInfo: clientInfo, // Informações adicionais do cliente
            recentChats: recentChats // Conversas recentes
        };
        
        connectedNumbers.push(newNumber);
        saveConnectedNumbers();
        
        // Salvar o número real no banco de dados
        await saveRealNumberToDatabase(newNumber);
        
        // Atualizar interface
        displayNumbers();
        
        // Carregar conversas reais
        loadRealConversations(recentChats);
        
        // Atualizar número atual para conversas automáticas
        if (window.conversasAutomaticas && window.conversasAutomaticas.atualizarNumeroAtual) {
            window.conversasAutomaticas.atualizarNumeroAtual();
        }
        
    } catch (error) {
        console.error('Erro ao processar conexão WhatsApp:', error);
    }
}

// Salvar número real no banco de dados
async function saveRealNumberToDatabase(number) {
    try {
        // Usar o número real do WhatsApp se disponível
        const numeroParaSalvar = number.realNumber || `${number.codpais}${number.ddd}${number.numero}`;
        
        // Extrair código do país e DDD do número real
        let codpais = '55';
        let ddd = '00';
        let numeroFinal = numeroParaSalvar;
        
        if (numeroParaSalvar.length >= 13) {
            // Formato: 558185315669
            codpais = numeroParaSalvar.substring(0, 2); // 55
            ddd = numeroParaSalvar.substring(2, 4);     // 81
            numeroFinal = numeroParaSalvar.substring(4); // 85315669
        } else if (numeroParaSalvar.length >= 11) {
            // Formato: 8185315669 (sem código do país)
            codpais = '55';
            ddd = numeroParaSalvar.substring(0, 2);     // 81
            numeroFinal = numeroParaSalvar.substring(2); // 85315669
        } else if (numeroParaSalvar.length >= 9) {
            // Formato: 85315669 (apenas número)
            codpais = '55';
            ddd = '00'; // DDD padrão
            numeroFinal = numeroParaSalvar;
        }
        
        console.log('Salvando número real no banco:', numeroParaSalvar);
        console.log('Extraído:', { codpais, ddd, numero: numeroFinal });
        
        const response = await fetch('/numbers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                codpais: codpais,
                ddd: ddd,
                numero: numeroFinal,
                status: 'ativo',
                data_ativacao: new Date().toISOString(),
                data_expiracao: null,
                saldo_minutos: 0.5, // 30 segundos inicial
                data_atual: new Date().toISOString(),
                total_mensagens: 0,
                total_conversas_ativas: 0
            })
        });
        
        if (response.ok) {
            console.log('Número real salvo no banco de dados:', numeroParaSalvar);
        } else {
            const errorData = await response.json();
            console.error('Erro ao salvar número no banco:', errorData);
        }
    } catch (error) {
        console.error('Erro ao salvar número:', error);
    }
}

// Exibir QR Code
function displayQRCode(qrCodeDataUrl) {
    const qrContainer = document.getElementById('qr-code');
    
    if (qrContainer) {
        qrContainer.innerHTML = `<img src="${qrCodeDataUrl}" alt="QR Code WhatsApp">`;
    }
}

// Mostrar conversas
function showConversations() {
    document.getElementById('qr-container').classList.add('hidden');
    document.getElementById('conversations-container').classList.remove('hidden');
    
    // Carregar conversas simuladas
    loadConversations();
}

// Carregar conversas reais do WhatsApp
function loadRealConversations(chats) {
    const conversationsList = document.getElementById('conversations-list');
    
    if (!chats || chats.length === 0) {
        conversationsList.innerHTML = '<p style="color: #6c757d; text-align: center; margin: 20px 0;">Nenhuma conversa encontrada</p>';
        return;
    }
    
    console.log(`Carregando ${chats.length} conversas reais`);
    
    const conversationsHTML = chats.map(chat => {
        // Obter informações do chat
        const name = chat.name || chat.id.split('@')[0];
        const lastMessage = chat.lastMessage?.body || 'Nenhuma mensagem';
        const timestamp = chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString() : '';
        
        // Determinar status (online/offline) baseado no tipo de chat
        let status = 'MOBILE';
        if (chat.isGroup) {
            status = 'GRUPO';
        } else if (chat.isMe) {
            status = 'VOCÊ';
        }
        
        // Truncar mensagem se for muito longa
        const displayMessage = lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage;
        
        return `
            <div class="conversation-item">
                <div class="conversation-avatar">
                    ${name.charAt(0).toUpperCase()}
                </div>
                <div class="conversation-info">
                    <div class="conversation-name">${name}</div>
                    <div class="conversation-message">${displayMessage}</div>
                </div>
                <div class="conversation-status">${status}</div>
            </div>
        `;
    }).join('');
    
    conversationsList.innerHTML = conversationsHTML;
    console.log('Conversas carregadas com sucesso');
}

// Carregar conversas (simulado) - mantido para compatibilidade
function loadConversations() {
    const conversationsList = document.getElementById('conversations-list');
    
    // Conversas simuladas (fallback)
    const conversations = [
        { name: 'Sharifah Norazura', message: 'At school', status: 'MOBILE' },
        { name: 'Sharmi Fateh', message: 'Miss U My Dear Baby NJ..', status: 'MOBILE' },
        { name: 'Shiba', message: 'May all of us be guided Amin', status: 'MOBILE' },
        { name: 'Shuib Samsudin', message: 'typing...', status: 'MOBILE' },
        { name: 'Siti Ali', message: '😊', status: 'MOBILE' },
        { name: 'Siti Hajar', message: '', status: 'MOBILE' },
        { name: 'João Silva', message: 'Olá! Como vai?', status: 'MOBILE' },
        { name: 'Maria Santos', message: 'Bom dia! Tudo bem?', status: 'MOBILE' },
        { name: 'Pedro Costa', message: 'Obrigado pela ajuda!', status: 'MOBILE' },
        { name: 'Ana Oliveira', message: 'Vou chegar em 10 minutos', status: 'MOBILE' },
        { name: 'Carlos Lima', message: 'Preciso de informações', status: 'MOBILE' },
        { name: 'Lucia Ferreira', message: 'Encontrei o que procurava', status: 'MOBILE' },
        { name: 'Roberto Alves', message: 'Amanhã às 14h?', status: 'MOBILE' },
        { name: 'Fernanda Rocha', message: 'Perfeito! Combinado', status: 'MOBILE' },
        { name: 'Marcos Pereira', message: 'Vou verificar e te aviso', status: 'MOBILE' }
    ];
    
    conversationsList.innerHTML = conversations.map(conv => `
        <div class="conversation-item">
            <div class="conversation-avatar">
                ${conv.name.charAt(0)}
            </div>
            <div class="conversation-info">
                <div class="conversation-name">${conv.name}</div>
                <div class="conversation-message">${conv.message}</div>
            </div>
            <div class="conversation-status">${conv.status}</div>
        </div>
    `).join('');
}

// Exibir números conectados
function displayNumbers() {
    const numbersList = document.getElementById('numbers-list');
    
    if (connectedNumbers.length === 0) {
        numbersList.innerHTML = '<p style="color: #6c757d; text-align: center; margin: 20px 0;">Nenhum número conectado</p>';
    } else {
        numbersList.innerHTML = connectedNumbers.map(number => {
            // Usar número real se disponível, senão usar o formato padrão
            const displayNumber = number.realNumber || `${number.codpais}${number.ddd}${number.numero}`;
            
            // Obter o nome do dispositivo (pushname) se disponível
            const deviceName = number.clientInfo?.pushname || 'WhatsApp';
            
            return `
                <div class="number-item connected" onclick="selectNumber('${number.id}')">
                    <div class="number-info">
                        <span class="status-indicator connected"></span>
                        <div>
                            <strong>${deviceName}</strong>
                            <br>
                            <small>${displayNumber}</small>
                            <div class="saldo-indicator">
                                <span class="saldo-value" id="saldo-${number.id}">--</span>
                                <div class="saldo-bar">
                                    <div class="saldo-fill" id="saldo-fill-${number.id}" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button class="disconnect-btn" onclick="disconnectNumber('${number.id}', event)">
                        Desconectar
                    </button>
                </div>
            `;
        }).join('');
        
        // Atualizar saldos dos números conectados
        atualizarSaldosNumeros();
    }
    
    // Mostrar card informativo se já há WhatsApp conectado, senão mostrar botão
    const addButton = document.getElementById('add-whatsapp-btn');
    if (addButton) {
        if (connectedNumbers.length > 0) {
            // Card informativo para múltiplos dispositivos
            addButton.innerHTML = `
                <div class="info-card">
                    <div class="info-icon">📱</div>
                    <div class="info-content">
                        <h4>Conectar Mais Dispositivos</h4>
                        <p>Para conectar mais um aparelho, abra outro navegador e conecte outro WhatsApp.</p>
                        <small>MVC: Um dispositivo por navegador</small>
                    </div>
                </div>
            `;
            addButton.style.display = 'block';
            addButton.disabled = true;
            addButton.classList.add('info-mode');
        } else {
            // Botão normal para adicionar primeiro WhatsApp
            addButton.innerHTML = '📱 Adicionar WhatsApp';
            addButton.style.display = 'block';
            addButton.disabled = false;
            addButton.classList.remove('info-mode');
        }
    }
}

// Atualizar saldos dos números conectados
async function atualizarSaldosNumeros() {
    for (const number of connectedNumbers) {
        try {
            const response = await fetch(`/conversas/saldo/${number.id}`);
            const data = await response.json();
            
            if (data.success) {
                const saldoElement = document.getElementById(`saldo-${number.id}`);
                const saldoFillElement = document.getElementById(`saldo-fill-${number.id}`);
                
                if (saldoElement && saldoFillElement) {
                    const saldo = data.data.saldo_minutos;
                    saldoElement.textContent = `${saldo.toFixed(1)}min`;
                    
                    // Calcular porcentagem (assumindo saldo máximo de 60 minutos)
                    const porcentagem = Math.min((saldo / 60) * 100, 100);
                    saldoFillElement.style.width = `${porcentagem}%`;
                    
                    // Mudar cor baseado no saldo
                    if (saldo <= 0) {
                        saldoElement.style.color = '#f44336';
                        saldoFillElement.style.background = '#f44336';
                    } else if (saldo <= 5) {
                        saldoElement.style.color = '#ff9800';
                        saldoFillElement.style.background = '#ff9800';
                    } else {
                        saldoElement.style.color = '#ffd700';
                        saldoFillElement.style.background = 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)';
                    }
                }
            }
        } catch (error) {
            console.error(`Erro ao verificar saldo do número ${number.id}:`, error);
        }
    }
}

// Selecionar número para ver conversas
function selectNumber(numberId) {
    const number = connectedNumbers.find(n => n.id === numberId);
    if (number) {
        currentNumber = numberId;
        showConversations();
    }
}

// Desconectar número
async function disconnectNumber(numberId, event) {
    event.stopPropagation();
    
    const number = connectedNumbers.find(n => n.id === numberId);
    if (!number) return;
    
    try {
        const response = await fetch(`/whatsapp/disconnect`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                browserId: number.deviceId
            })
        });
        
        if (response.ok) {
            // Remover da lista local
            connectedNumbers = connectedNumbers.filter(n => n.id !== numberId);
            saveConnectedNumbers();
            displayNumbers();
            
            // Se era o número atual, voltar ao estado inicial
            if (currentNumber === numberId) {
                showInitialState();
                currentNumber = null;
            }
        }
    } catch (error) {
        console.error('Erro ao desconectar:', error);
    }
} 

// Limpar cache do Chromium
async function clearCache() {
    try {
        const button = document.getElementById('clear-cache-btn');
        button.textContent = '🧹 Limpando...';
        button.disabled = true;
        
        const response = await fetch('/whatsapp/clear-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Cache limpo com sucesso! Agora você pode tentar conectar novamente.');
            console.log('Cache limpo com sucesso');
        } else {
            alert('Nenhum cache encontrado para limpar.');
            console.log('Nenhum cache encontrado');
        }
    } catch (error) {
        alert('Erro ao limpar cache: ' + error.message);
        console.error('Erro ao limpar cache:', error);
    } finally {
        const button = document.getElementById('clear-cache-btn');
        button.textContent = '🧹 Limpar Cache';
        button.disabled = false;
    }
}

// Inicializar página
document.addEventListener('DOMContentLoaded', async function() {
    loadConnectedNumbers();
    showInitialState();
    displayNumbers();
    
    // Aguardar um pouco antes de validar para dar tempo do servidor responder
    setTimeout(async () => {
        // Validar se os clientes ainda estão realmente conectados
        await validateConnectedClients();
    }, 1000); // 1 segundo de delay
});

// Validar se os clientes ainda estão conectados
async function validateConnectedClients() {
    if (connectedNumbers.length === 0) {
        console.log('Nenhum cliente para validar');
        return;
    }
    
    console.log(`Iniciando validação de ${connectedNumbers.length} cliente(s)...`);
    console.log('Clientes a validar:', connectedNumbers.map(n => ({ id: n.id, deviceId: n.deviceId })));
    console.log('BrowserId atual da sessão:', browserId);
    
    for (let i = connectedNumbers.length - 1; i >= 0; i--) {
        const number = connectedNumbers[i];
        console.log(`Validando cliente ${number.id} com deviceId: ${number.deviceId}`);
        
        try {
            // Verificar status do cliente no servidor usando browserId
            const url = `/whatsapp/status?browserId=${number.deviceId}`;
            console.log(`Fazendo request para: ${url}`);
            
            const response = await fetch(url);
            console.log(`Resposta recebida para ${number.id}:`, response.status, response.statusText);
            
            if (!response.ok) {
                console.log(`Erro HTTP ao validar cliente ${number.id} (${response.status}). Mantendo cliente por segurança.`);
                // Em caso de erro HTTP, manter o cliente (não remover)
                continue;
            }
            
            const data = await response.json();
            console.log(`Dados recebidos para ${number.id}:`, data);
            
            // Só remover se o servidor confirmar explicitamente que não está conectado
            // Com NoAuth, é melhor ser conservador e manter o cliente
            if (data.connected === false) {
                console.log(`Cliente ${number.id} confirmado como desconectado, removendo...`);
                connectedNumbers.splice(i, 1);
            } else if (data.connected === true) {
                console.log(`Cliente ${number.id} confirmado como conectado`);
            } else {
                console.log(`Cliente ${number.id} - status não confirmado, mantendo por segurança`);
            }
        } catch (error) {
            console.error(`Erro ao validar cliente ${number.id}:`, error);
            // Em caso de erro de rede, manter o cliente (não remover)
            console.log(`Mantendo cliente ${number.id} devido a erro de validação`);
        }
    }
    
    console.log(`Validação concluída. ${connectedNumbers.length} cliente(s) restante(s)`);
    
    // Salvar lista atualizada
    saveConnectedNumbers();
    
    // Atualizar interface
    displayNumbers();
    
    // Se não há mais clientes conectados, voltar ao estado inicial
    if (connectedNumbers.length === 0) {
        console.log('Nenhum cliente ativo, voltando ao estado inicial');
        showInitialState();
        currentNumber = null;
    }
} 