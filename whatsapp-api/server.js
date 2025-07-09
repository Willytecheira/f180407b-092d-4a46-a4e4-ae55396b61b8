const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');

const SessionManager = require('./src/SessionManager');
const apiRoutes = require('./src/routes/api');
const webhookRoutes = require('./src/routes/webhook');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'whatsapp-api-key-2024';

// Middleware de seguridad - configuración simplificada sin HTTPS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false, // Deshabilitar HTTPS Strict Transport Security
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["*"],
  credentials: false
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos SIN middleware de autenticación
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Inicializar SessionManager
const sessionManager = new SessionManager(io);

// Middleware para autenticación API (opcional)
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: 'API Key requerida. Usa el header X-API-Key o query param apiKey' 
    });
  }
  
  next();
};

// Rutas API
app.use('/api', authenticateAPI, apiRoutes(sessionManager));
app.use('/webhook', webhookRoutes(sessionManager));

// Rutas específicas (sin middleware global complicado)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Ruta de validación de sesión
app.post('/validate-session', (req, res) => {
  const { username, password } = req.body;
  
  // Usuarios hardcodeados (en producción usar base de datos)
  const users = {
    'admin': { password: 'admin123', role: 'admin' },
    'usuario': { password: 'usuario123', role: 'user' }
  };
  
  if (users[username] && users[username].password === password) {
    // Crear token de sesión
    const sessionData = {
      username: username,
      role: users[username].role,
      loginTime: new Date().toISOString()
    };
    
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    res.json({
      success: true,
      sessionToken: sessionToken,
      user: {
        username: username,
        role: users[username].role
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  }
});

// Ruta para obtener información del servidor
app.get('/info', (req, res) => {
  res.json({
    success: true,
    server: 'WhatsApp Multi-Session API',
    version: '1.0.0',
    activeSessions: sessionManager.getActiveSessionsCount(),
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Socket.IO para tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    console.log(`Cliente ${socket.id} se unió a session-${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`
🚀 WhatsApp Multi-Session API iniciado
📱 Servidor corriendo en: http://localhost:${PORT}
🔑 API Key: ${API_KEY}
📋 Usa el header X-API-Key para autenticación
  `);
  
// Crear directorios necesarios si no existen
  const directories = [
    process.env.SESSIONS_DIR || './sessions',
    process.env.CACHE_DIR || './.wwebjs_cache', 
    process.env.AUTH_DIR || './.wwebjs_auth',
    './public/uploads'
  ];
  
  directories.forEach(dir => {
    fs.ensureDirSync(dir);
    // Configurar permisos en Linux
    if (process.platform === 'linux') {
      try {
        fs.chmodSync(dir, 0o755);
      } catch (error) {
        console.warn(`⚠️ No se pudieron configurar permisos para ${dir}:`, error.message);
      }
    }
  });
  
  console.log('📁 Directorios verificados:', directories.join(', '));
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await sessionManager.closeAllSessions();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await sessionManager.closeAllSessions();
  process.exit(0);
});