const express = require('express');

module.exports = (sessionManager) => {
  const router = express.Router();

  // POST /webhook/messages - Endpoint para recibir mensajes (para integraciones externas)
  router.post('/messages', (req, res) => {
    try {
      const { sessionId, action, data } = req.body;
      
      console.log('Webhook recibido:', { sessionId, action, data });
      
      // Aquí puedes agregar lógica personalizada para manejar webhooks entrantes
      // Por ejemplo, respuestas automáticas, integración con CRM, etc.
      
      res.json({
        success: true,
        message: 'Webhook procesado exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /webhook/config - Obtener configuración de webhook
  router.get('/config', (req, res) => {
    res.json({
      success: true,
      webhookUrl: process.env.WEBHOOK_URL || null,
      enabled: !!process.env.WEBHOOK_URL
    });
  });

  // POST /webhook/config - Configurar webhook
  router.post('/config', (req, res) => {
    try {
      const { webhookUrl } = req.body;
      
      if (webhookUrl) {
        process.env.WEBHOOK_URL = webhookUrl;
        sessionManager.webhookUrl = webhookUrl;
      } else {
        delete process.env.WEBHOOK_URL;
        sessionManager.webhookUrl = null;
      }
      
      res.json({
        success: true,
        message: 'Configuración de webhook actualizada',
        webhookUrl: webhookUrl || null
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};