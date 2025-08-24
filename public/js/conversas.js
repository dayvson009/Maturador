// Variáveis globais para conversas
let conversasAtivas = false;
let saldoAtual = 0;
let numeroAtual = null;

// Elementos do DOM
const statusConversasElement = document.getElementById('status-conversas');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Atualizar status inicial
    atualizarStatusConversas('Aguardando conexão...');
});

// Função para atualizar status das conversas
function atualizarStatusConversas(status) {
    if (statusConversasElement) {
        statusConversasElement.textContent = status;
    }
}

// Função para iniciar conversas automaticamente (chamada pelo backend)
async function iniciarConversasAutomaticas(browserId, numero) {
    try {
        console.log('Iniciando conversas automáticas para:', numero);
        
        const response = await fetch('/conversas/iniciar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                browserId: browserId,
                numero: numero
            })
        });

        const data = await response.json();
        
        if (data.success) {
            conversasAtivas = true;
            atualizarStatusConversas('🔄 Ativo - Conversando...');
            console.log('Conversas automáticas iniciadas com sucesso!');
        } else {
            atualizarStatusConversas('❌ Erro ao iniciar conversas');
            console.error('Erro ao iniciar conversas:', data.message);
        }
    } catch (error) {
        console.error('Erro ao iniciar conversas automáticas:', error);
        atualizarStatusConversas('❌ Erro na conexão');
    }
}

// Função para parar conversas (mantida para compatibilidade, mas não usada no front-end)
async function pararConversas() {
    // Função mantida para compatibilidade com o backend
    console.log('Função pararConversas chamada - não implementada no front-end');
}

// Função removida - crédito é adicionado manualmente no banco de dados

// Funções removidas - não são mais necessárias com a nova implementação

// Função removida - não é mais necessária

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

// Funções removidas - não são mais necessárias com a nova implementação

// Exportar funções para uso global
window.conversasAutomaticas = {
    iniciarConversasAutomaticas,
    pararConversas,
    atualizarStatusConversas
};
