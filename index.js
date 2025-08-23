// Carregar variáveis de ambiente primeiro
require('dotenv').config({ path: './.env' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configurar sessão
app.use(session({
  secret: 'aquecedor-whatsapp-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // true se usar HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware para gerar browserId único por sessão
app.use((req, res, next) => {
  if (!req.session.browserId) {
    req.session.browserId = generateUniqueBrowserId();
    console.log(`Nova sessão criada com browserId: ${req.session.browserId}`);
  }
  next();
});

// Função para gerar browserId único
function generateUniqueBrowserId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `browser_${timestamp}_${random}`.replace(/[^a-zA-Z0-9_]/g, '');
}

// Configurar arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar EJS como engine de views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const dbHealthRouter = require('./routes/dbHealth');
const numbersRouter = require('./routes/numbers');
const whatsappRouter = require('./routes/whatsapp');
const conversasRouter = require('./routes/conversas');
app.use(dbHealthRouter);
app.use(numbersRouter);
app.use(whatsappRouter);
app.use('/conversas', conversasRouter);

// Endpoint para obter browserId da sessão
app.get('/api/browser-id', (req, res) => {
  res.json({ browserId: req.session.browserId });
});

// Endpoint de teste
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rota principal - página inicial
app.get('/', (req, res) => {
  res.render('index');
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });

  // Evento para entrar no room específico do navegador
  socket.on('join-browser-room', (data) => {
    const { browserId } = data;
    if (browserId) {
      socket.join(browserId);
      console.log(`Socket ${socket.id} entrou no room: ${browserId}`);
    }
  });

  // Evento para criar nova sessão WhatsApp
  socket.on('create-session', async (data) => {
    console.log('Criando sessão:', data);
    
    try {
      const whatsappService = require('./services/whatsapp');
      // Configurar Socket.IO no serviço
      whatsappService.setIO(io);
      console.log('Socket.IO configurado no serviço WhatsApp');
      
      const result = await whatsappService.initializeClient(data.codpais, data.ddd, data.numero, data.browserId, { force: false });
      
      if (result.success) {
        socket.emit('session-created', { 
          id: `${data.codpais}${data.ddd}${data.numero}`,
          success: true 
        });
      } else {
        socket.emit('session-error', { 
          id: `${data.codpais}${data.ddd}${data.numero}`,
          error: result.error 
        });
      }
    } catch (error) {
      socket.emit('session-error', { 
        id: `${data.codpais}${data.ddd}${data.numero}`,
        error: error.message 
      });
    }
  });
});

// Exportar io para usar em outros arquivos
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 