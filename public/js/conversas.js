// Variáveis globais para conversas
let conversasAtivas = false;
let saldoAtual = 0;
let numeroAtual = null;

// Elementos do DOM
const iniciarBtn = document.getElementById('iniciar-conversas');
const pararBtn = document.getElementById('parar-conversas');
const adicionarCreditoBtn = document.getElementById('adicionar-credito');
const saldoAtualElement = document.getElementById('saldo-atual');
const statusConversasElement = document.getElementById('status-conversas');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (iniciarBtn) iniciarBtn.addEventListener('click', iniciarConversas);
    if (pararBtn) pararBtn.addEventListener('click', pararConversas);
    if (adicionarCreditoBtn) adicionarCreditoBtn.addEventListener('click', adicionarCredito);
    
    // Verificar saldo inicial
    setTimeout(verificarSaldoInicial, 1000);
});

// Iniciar conversas automáticas
async function iniciarConversas() {
    try {
        // Verificar se há números conectados
        if (connectedNumbers.length === 0) {
            mostrarNotificacao('Nenhum WhatsApp conectado', 'error');
            return;
        }

        // Usar o número real do primeiro WhatsApp conectado
        const numeroConectado = connectedNumbers[0];
        numeroAtual = numeroConectado.realNumber || numeroConectado.id;
        
        console.log('Usando número para conversas:', numeroAtual);
        console.log('Número real:', numeroConectado.realNumber);
        console.log('Número da sessão:', numeroConectado.id);
        
        const response = await fetch('/conversas/iniciar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                browserId: browserId,
                numero: numeroAtual
            })
        });

        const data = await response.json();
        
        if (data.success) {
            conversasAtivas = true;
            atualizarInterface();
            mostrarNotificacao('Conversas automáticas iniciadas!', 'success');
            
            // Iniciar verificação periódica de saldo
            iniciarVerificacaoSaldo();
        } else {
            mostrarNotificacao(data.message || 'Erro ao iniciar conversas', 'error');
        }
    } catch (error) {
        console.error('Erro ao iniciar conversas:', error);
        mostrarNotificacao('Erro ao iniciar conversas', 'error');
    }
}

// Parar conversas automáticas
async function pararConversas() {
    try {
        const response = await fetch('/conversas/parar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                browserId: browserId
            })
        });

        const data = await response.json();
        
        if (data.success) {
            conversasAtivas = false;
            atualizarInterface();
            mostrarNotificacao('Conversas automáticas paradas!', 'success');
            
            // Parar verificação periódica de saldo
            pararVerificacaoSaldo();
        } else {
            mostrarNotificacao(data.message || 'Erro ao parar conversas', 'error');
        }
    } catch (error) {
        console.error('Erro ao parar conversas:', error);
        mostrarNotificacao('Erro ao parar conversas', 'error');
    }
}

// Adicionar crédito (para testes)
async function adicionarCredito() {
    try {
        console.log('Tentando adicionar crédito...');
        console.log('numeroAtual:', numeroAtual);
        console.log('connectedNumbers:', connectedNumbers);
        
        if (!numeroAtual) {
            // Tentar usar o primeiro número conectado
            if (connectedNumbers.length > 0) {
                const numeroConectado = connectedNumbers[0];
                numeroAtual = numeroConectado.realNumber || numeroConectado.id;
                console.log('Usando primeiro número conectado:', numeroAtual);
                console.log('Número real:', numeroConectado.realNumber);
            } else {
                mostrarNotificacao('Nenhum número selecionado', 'error');
                return;
            }
        }

        console.log('Enviando requisição para adicionar crédito...');
        const response = await fetch('/conversas/adicionar-credito', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numero: numeroAtual,
                minutos: 1
            })
        });

        console.log('Resposta recebida:', response.status);
        const data = await response.json();
        console.log('Dados da resposta:', data);
        
        if (data.success) {
            mostrarNotificacao('+1 minuto adicionado!', 'success');
            await verificarSaldo(); // Atualizar saldo
        } else {
            mostrarNotificacao(data.message || 'Erro ao adicionar crédito', 'error');
        }
    } catch (error) {
        console.error('Erro ao adicionar crédito:', error);
        mostrarNotificacao('Erro ao adicionar crédito', 'error');
    }
}

// Verificar saldo
async function verificarSaldo() {
    try {
        if (!numeroAtual) return;
        console.log('Verificando saldo para >>>>>:', numeroAtual);
        const response = await fetch(`/conversas/saldo/${numeroAtual}`);
        const data = await response.json();
        console.log('Resposta da API:', data);
        if (data.success) {
            saldoAtual = parseFloat(data.data.saldo_minutos);
            atualizarSaldoDisplay();
            
            // Verificar se saldo está baixo
            if (saldoAtual <= 5 && saldoAtual > 0) {
                mostrarNotificacao(`⚠️ Saldo baixo: ${saldoAtual.toFixed(1)} minutos`, 'warning');
            } else if (saldoAtual <= 0) {
                mostrarNotificacao('❌ Saldo esgotado!', 'error');
                if (conversasAtivas) {
                    await pararConversas();
                }
            }
        }
    } catch (error) {
        console.error('Erro ao verificar saldo:', error);
    }
}

// Verificar saldo inicial
async function verificarSaldoInicial() {
    if (connectedNumbers.length > 0) {
        const numeroConectado = connectedNumbers[0];
        numeroAtual = numeroConectado.realNumber || numeroConectado.id;
        console.log('Verificando saldo inicial para:', numeroAtual);
        await verificarSaldo();
    }
}

// Atualizar interface
function atualizarInterface() {
    if (iniciarBtn) iniciarBtn.disabled = conversasAtivas;
    if (pararBtn) pararBtn.disabled = !conversasAtivas;
    
    if (statusConversasElement) {
        statusConversasElement.textContent = conversasAtivas ? 'Ativo' : 'Parado';
        statusConversasElement.style.color = conversasAtivas ? '#4CAF50' : '#f44336';
    }
}

// Atualizar display de saldo
function atualizarSaldoDisplay() {
    if (saldoAtualElement) {
        saldoAtualElement.textContent = `${saldoAtual.toFixed(1)}min`;
        
        // Mudar cor baseado no saldo
        if (saldoAtual <= 0) {
            saldoAtualElement.style.color = '#f44336';
        } else if (saldoAtual <= 5) {
            saldoAtualElement.style.color = '#ff9800';
        } else {
            saldoAtualElement.style.color = '#ffd700';
        }
    }
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remover notificação anterior se existir
    const notificacaoExistente = document.querySelector('.notification');
    if (notificacaoExistente) {
        notificacaoExistente.remove();
    }

    // Criar nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notification ${tipo}`;
    notificacao.textContent = mensagem;
    
    document.body.appendChild(notificacao);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (notificacao.parentNode) {
            notificacao.remove();
        }
    }, 5000);
}

// Verificação periódica de saldo
let verificarSaldoInterval = null;

function iniciarVerificacaoSaldo() {
    if (verificarSaldoInterval) {
        clearInterval(verificarSaldoInterval);
    }
    
    verificarSaldoInterval = setInterval(async () => {
        if (conversasAtivas) {
            await verificarSaldo();
        }
    }, 30000); // Verificar a cada 30 segundos
}

function pararVerificacaoSaldo() {
    if (verificarSaldoInterval) {
        clearInterval(verificarSaldoInterval);
        verificarSaldoInterval = null;
    }
}

// Atualizar número atual quando números conectados mudarem
function atualizarNumeroAtual() {
    if (connectedNumbers.length > 0) {
        const numeroConectado = connectedNumbers[0];
        numeroAtual = numeroConectado.realNumber || numeroConectado.id;
        console.log('Atualizando número atual para:', numeroAtual);
        verificarSaldo();
    } else {
        numeroAtual = null;
        saldoAtual = 0;
        atualizarSaldoDisplay();
    }
}

// Exportar funções para uso global
window.conversasAutomaticas = {
    iniciarConversas,
    pararConversas,
    adicionarCredito,
    verificarSaldo,
    atualizarNumeroAtual
};
