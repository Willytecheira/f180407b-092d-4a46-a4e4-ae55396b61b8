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
const UserManager = require('./src/managers/UserManager');
const MetricsManager = require('./src/managers/MetricsManager');
const apiRoutes = require('./src/routes/api');
const webhookRoutes = require('./src/routes/webhook');
const userRoutes = require('./src/routes/users');
const metricsRoutes = require('./src/routes/metrics');
const systemRoutes = require('./src/routes/system');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['https://docker.website', 'http://localhost:3000', 'https://localhost:3000'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'whatsapp-api-key-2024';

// Middleware de seguridad optimizado para docker.website
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: process.env.NODE_ENV === 'production', // Habilitar HSTS solo en producción
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: ['https://docker.website', 'http://localhost:3000', 'https://localhost:3000'],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir solo archivos estáticos específicos (CSS, JS, images) - NO HTML
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Inicializar managers
const sessionManager = new SessionManager(io);
const userManager = new UserManager();
const metricsManager = new MetricsManager(sessionManager);

// Middleware para autenticación API
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

// Middleware para autenticación de usuarios (API)
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-session-token'];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de sesión requerido'
      });
    }

    // Decodificar token (simple base64 en este caso)
    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
    const user = userManager.getUser(sessionData.username);
    
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no válido o inactivo'
      });
    }

    // Verificar expiración (24 horas)
    const loginTime = new Date(sessionData.loginTime);
    const now = new Date();
    const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return res.status(401).json({
        success: false,
        error: 'Sesión expirada'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

// Middleware para autenticación web (páginas HTML)
const authenticateWeb = async (req, res, next) => {
  try {
    // Para páginas HTML, permitir acceso si hay una sesión válida en localStorage
    // El token será validado por JavaScript en el cliente
    // Solo bloqueamos si claramente no hay autenticación
    
    // Simplemente servir la página - la validación real se hace en el frontend
    // y se redirige desde JavaScript si no hay sesión válida
    next();
  } catch (error) {
    return res.redirect('/login.html');
  }
};

// Rutas API
app.use('/api', authenticateAPI, apiRoutes(sessionManager));
app.use('/api/users', authenticateAPI, authenticateUser, userRoutes(userManager));
app.use('/api/metrics', authenticateAPI, metricsRoutes(metricsManager, sessionManager));
app.use('/api/system', authenticateAPI, authenticateUser, systemRoutes(sessionManager, userManager));
app.use('/webhook', webhookRoutes(sessionManager));

// Rutas específicas para páginas HTML
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', authenticateWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', authenticateWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/dashboard', authenticateWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin.html', authenticateWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/dashboard.html', authenticateWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/index.html', authenticateWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de validación de sesión (actualizada para usar UserManager)
app.post('/validate-session', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username y password son requeridos'
      });
    }

    const user = await userManager.validateCredentials(username, password);
    
    if (user) {
      // Crear token de sesión
      const sessionData = {
        username: user.username,
        role: user.role,
        loginTime: new Date().toISOString()
      };
      
      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      res.json({
        success: true,
        sessionToken: sessionToken,
        user: {
          username: user.username,
          role: user.role,
          email: user.email
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
  } catch (error) {
    console.error('Error en validación de sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
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

// Socket.IO para tiempo real con broadcasting mejorado
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  // Join to dashboard updates
  socket.join('dashboard');
  
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    console.log(`Cliente ${socket.id} se unió a session-${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
  
  // Send initial data
  socket.emit('dashboard-ready', { 
    timestamp: new Date().toISOString(),
    status: 'connected'
  });
});

// Función para broadcast de actualizaciones
function broadcastUpdate(type, data) {
  try {
    io.to('dashboard').emit(type, {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
}

// Configurar broadcasts periódicos de métricas
setInterval(() => {
  try {
    if (io.engine.clientsCount > 0) {
      const currentMetrics = metricsManager.getCurrentSystemMetrics();
      broadcastUpdate('metrics-update', {
        type: 'system',
        metrics: currentMetrics
      });
    }
  } catch (error) {
    console.error('Error broadcasting metrics:', error);
  }
}, 30000); // Cada 30 segundos

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
  await metricsManager.saveMetrics();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await sessionManager.closeAllSessions();
  await metricsManager.saveMetrics();
  process.exit(0);
});