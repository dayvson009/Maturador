Visão Geral da Arquitetura do Projeto

Frontend (React): Exibir QR code para login no WhatsApp. Ver conversas recentes, foto da conversa, mas não ver mensagens. Gerenciar o fluxo de login com Google OAuth. Mostrar interface de pagamento QR code para PIX (Appmax). Exibir dispositivos conectados e interface de mensagens.

-Backend (Node.js/Express): Usar whatsapp-web.js para gerenciar conexões e mensagens do WhatsApp. Integrar Google OAuth via Passport.js. Processar pagamentos PIX via API da Appmax. Gerenciar sessões de dispositivos e limites de mensagens. Lidar com mensagens em tempo real com Socket.IO.

Banco de Dados (PostgreSQL): Armazenar dados de usuários, sessões de dispositivos, registros de pagamento e histórico de mensagens. Aplicar limites de mensagens e evitar abusos (por exemplo, reutilização de mensagens gratuitas).

COMO VAI FUNCIONAR O PROJETO:

Página 1 - como está na Primeira imagem: Com o whatsapp-web.js inicialmente já terá um número de whatsapp logado que faremos via console para escanear o QR code, vamos chamar esse usuário de Usuário Master.

Ná página inicial do site o usuário visita o aplicativo e escaneia um QR code usando whatsapp-web.js. Ou ele pode clicar no botão abaixo "Quero testar agora" ambos jogará ele para a segunda tela (página 2).

Será mostrado como o template da página 1, um mockup de celular apresentativo na direita, se ele escaneou na primeira página, será jogado para a segunda tela (página 2).

Página 2 - Como está na Segunda imagem: Nessa segunda tela já mostra o whatsapp dele conectado, e ao lado esquerdo o número dele atual logado. Caso ele não tenha logado pois ele apertou no botão "Quero testar agora" ele pode clicar no botão adicionar whatsapp, ou só escanear o QR code ao lado que ficará atualizando aguardando alguém logar, como está na terceira imagem

O backend envia 2–5 mensagens de teste para o seu número do WhatsApp e recebe respostas do número do usuário master, ou pode Trocar mensagens com outros usuários já logados que estejam ativos.

Página 2 - como está na Quarta imagem: Após o uso de 2 - 5 mensagens o é bloqueado a visualização do usuário e é solicitado fazer login, isso será mostrado na tela do mockup do celular como mostra a página 3 do arquivo do projeto, no back-end esse número fica como inativo, não poderá trocar mensagens, nem logando em outro IP é salvo no banco de dados seu status e número, usuário é solicitado a fazer login com Google (via Passport.js) (quarta imagem) para desbloquear mais 10 mensagens entre usuários ativos ou o usuário Master.

Página 2 - como está na Quinta imagem: Após atingir o limite de mensagens, o usuário é solicitado a pagar R$ 2,00 via PIX (API da Appmax) através de um QR code que será gerado na tela (quinta imagem) para acesso por 24 horas, porém terá opção ele pode escolher a quatidade de dias ativo, Esse pagamento é referente ao número em questão clicado, Pois ao lado ele pode ter mais de um número Logado.

Após o pagamento é liberado novamente o uso (sexta imagem)

Os usuários podem adicionar/remover dispositivos lembrando que o número não será removido do banco de dados com o status atual, pois caso ele faça login novamente no mesmo número o status dele permanecerá o mesmo anteriormente, evitando assim que ele possa reutilizar em outro login ou outro IP para usar as mensagens iniciais grátis.

Se ele deslogou antes de acabar o tempo de utilização o saldo continua restante no banco de dados que será vinculado ao número dele independente se ele logar em outro usuário poderá utilizar o mesmo saldo.

As mensagens trocadas entre números que estejam ativos no sistema seja do usuário master ou com o número logado atual ou outros podem ser de até 5 conversa diferentes no máximo, para não encher a caixa de conversa do usuário, as mensagens são mostradas em em tempo real via Socket.IO. e na tela mostrará as conversas atuais.

O banco de dados rastreia todas as atividades para evitar abusos e gerenciar assinaturas.

Dúvidas:

Não sei se é interessante ter o login com o google, pois o principal aqui é o whatsapp, acredito que só será preciso para saber quais números pertencem a aquele usuário.

Se ele logar o mesmo número em duas contas diferentes uma será deslogada.

Crie um plano de implementação do nosso projeto. evite overengeneering. Precisa ser uma solução simples e durável. Apresente o plano e só comece a criar depois que eu der autorização.