# Plano de Implementação - Projeto Aquecedor WhatsApp

## Checklist de Etapas

- [x] 1. Estruturar banco de dados (PostgreSQL)
  - [x] Criar tabela `numbers`
  - [x] Criar tabela `pagamentos`
  - [x] Criar tabela `conversas_ativas`

- [x] 2. Backend (Node.js/Express)
  - [x] Configurar projeto Node.js e dependências principais
  - [x] Criar rota para listar números cadastrados
  - [x] Criar endpoints para inserir/atualizar números
  - [x] Integrar whatsapp-web.js para conexão de números
  - [x] Implementar controle de sessões e limites de mensagens
  - [x] Gerar QR code para login WhatsApp
  - [x] Implementar Socket.IO para comunicação em tempo real
  - [ ] Implementar controle de saldo de tempo por número
  - [ ] Gerar QR code PIX via Appmax
  - [ ] Receber callback de pagamento da Appmax
  - [ ] Gerenciar conversas ativas (máx. 5 por número)

- [x] 3. Frontend (Interface Web)
  - [x] Configurar projeto com EJS
  - [x] Tela inicial: QR code para login WhatsApp e botão "Inicializar WhatsApp"
  - [x] Tela principal: status do número, saldo, conversas ativas
  - [ ] Tela de bloqueio: exibir bloqueio e QR code de pagamento
  - [ ] Tela de pagamento: exibir QR code PIX e status do pagamento
  - [ ] Interface para adicionar/remover números conectados

- [ ] 4. Regras e Restrições
  - [ ] Garantir que não há login de usuário, apenas controle por número
  - [ ] Não armazenar conteúdo de mensagens, apenas metadados
  - [ ] Implementar lógica do número Master
  - [ ] Garantir resiliência a múltiplos usuários e controle de conversas

- [x] 5. Integrações
  - [x] Testar integração whatsapp-web.js
  - [ ] Testar integração Appmax API
  - [x] Testar Socket.IO

## Progresso Atual
- ✅ Backend funcional com Express e EJS
- ✅ Conexão com PostgreSQL configurada
- ✅ Integração WhatsApp básica implementada
- ✅ Interface web responsiva criada
- ✅ QR Code do WhatsApp funcionando
- ✅ Estrutura de pastas organizada

---

> Conforme as etapas forem implementadas, este checklist será atualizado. 