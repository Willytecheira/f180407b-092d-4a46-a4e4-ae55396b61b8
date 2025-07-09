const express = require('express');
const multer = require('multer');
const path = require('path');

// Configurar multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = (sessionManager) => {
  const router = express.Router();

  // POST /api/start-session - Crear nueva sesión
  router.post('/start-session', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId es requerido'
        });
      }

      const result = await sessionManager.createSession(sessionId);
      res.json(result);

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/qr/:sessionId - Obtener código QR
  router.get('/qr/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const qrCode = sessionManager.getQRCode(sessionId);
      
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          error: 'QR no disponible para esta sesión'
        });
      }

      res.json({
        success: true,
        sessionId,
        qr: qrCode
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/status/:sessionId - Estado de la sesión
  router.get('/status/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const status = sessionManager.getSessionStatus(sessionId);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Sesión no encontrada'
        });
      }

      res.json({
        success: true,
        ...status
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/sessions - Listar todas las sesiones
  router.get('/sessions', (req, res) => {
    try {
      const sessions = sessionManager.getAllSessions();
      
      console.log(`📋 Listando ${sessions.length} sesiones`);
      
      res.json({
        success: true,
        sessions,
        total: sessions.length,
        active: sessions.filter(s => s.status === 'connected').length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/send-message - Enviar mensaje de texto
  router.post('/send-message', async (req, res) => {
    try {
      const { sessionId, number, message, options } = req.body;
      
      if (!sessionId || !number || !message) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, number y message son requeridos'
        });
      }

      const result = await sessionManager.sendMessage(sessionId, number, message, options);
      
      res.json({
        success: true,
        sessionId,
        number,
        ...result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/send-media - Enviar archivos multimedia
  router.post('/send-media', upload.single('media'), async (req, res) => {
    try {
      const { sessionId, number, caption, mediaUrl, mediaBase64 } = req.body;
      
      if (!sessionId || !number) {
        return res.status(400).json({
          success: false,
          error: 'sessionId y number son requeridos'
        });
      }

      let media;
      let options = { caption };

      if (req.file) {
        // Archivo subido
        const base64Data = req.file.buffer.toString('base64');
        media = `data:${req.file.mimetype};base64,${base64Data}`;
        options.mimetype = req.file.mimetype;
        options.filename = req.file.originalname;
        options.fileSize = req.file.size;
      } else if (mediaBase64) {
        // Base64 desde body
        media = mediaBase64;
        options.mimetype = req.body.mimetype || 'image/jpeg';
        options.filename = req.body.filename || 'media';
      } else if (mediaUrl) {
        // URL externa
        media = mediaUrl;
        options.filename = req.body.filename;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar media: archivo, mediaBase64 o mediaUrl'
        });
      }

      const result = await sessionManager.sendMedia(sessionId, number, media, options);
      
      res.json({
        success: true,
        sessionId,
        number,
        mediaType: options.mimetype,
        fileName: options.filename,
        ...result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/messages/:sessionId - Obtener mensajes
  router.get('/messages/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const { limit = 50 } = req.query;
      
      const messages = sessionManager.getSessionMessages(sessionId, parseInt(limit));
      
      res.json({
        success: true,
        sessionId,
        messages,
        total: messages.length
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/logout/:sessionId - Cerrar sesión
  router.post('/logout/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const result = await sessionManager.logoutSession(sessionId);
      
      res.json({
        success: true,
        sessionId,
        ...result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/health - Estado de salud del servidor
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeSessions: sessionManager.getActiveSessionsCount(),
      uptime: process.uptime()
    });
  });

  // POST /api/:sessionId/webhook - Configurar webhook dinámicamente
  router.post('/:sessionId/webhook', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { url, events } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId es requerido'
        });
      }

      // Verificar que la sesión existe
      const session = sessionManager.getSessionStatus(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: `Sesión ${sessionId} no encontrada`
        });
      }

      // Configurar webhook para la sesión específica
      const result = await sessionManager.configureWebhook(sessionId, url, events);
      
      res.json({
        success: true,
        sessionId,
        message: 'Webhook configurado exitosamente',
        webhookUrl: url,
        events: events || ['all'],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error configurando webhook para ${req.params.sessionId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/:sessionId/webhook - Obtener configuración de webhook
  router.get('/:sessionId/webhook', (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Verificar que la sesión existe
      const session = sessionManager.getSessionStatus(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: `Sesión ${sessionId} no encontrada`
        });
      }

      const webhookConfig = sessionManager.getWebhookConfig(sessionId);
      
      res.json({
        success: true,
        sessionId,
        ...webhookConfig
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE /api/:sessionId/webhook - Eliminar webhook
  router.delete('/:sessionId/webhook', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Verificar que la sesión existe
      const session = sessionManager.getSessionStatus(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: `Sesión ${sessionId} no encontrada`
        });
      }

      const result = await sessionManager.configureWebhook(sessionId, null, null);
      
      res.json({
        success: true,
        sessionId,
        message: 'Webhook eliminado exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
};