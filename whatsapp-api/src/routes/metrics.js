const express = require('express');

module.exports = (metricsManager, sessionManager) => {
  const router = express.Router();

  // GET /api/metrics/system - Métricas actuales del sistema
  router.get('/system', (req, res) => {
    try {
      const metrics = metricsManager.getCurrentSystemMetrics();
      
      if (!metrics) {
        return res.status(500).json({
          success: false,
          error: 'Error obteniendo métricas del sistema'
        });
      }

      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/metrics/historical - Métricas históricas
  router.get('/historical', (req, res) => {
    try {
      const { hours = 24 } = req.query;
      const metrics = metricsManager.getHistoricalMetrics(parseInt(hours));

      res.json({
        success: true,
        ...metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/metrics/sessions - Métricas de todas las sesiones
  router.get('/sessions', (req, res) => {
    try {
      const { hours = 24 } = req.query;
      const sessions = sessionManager.getAllSessions();
      const sessionMetrics = [];

      sessions.forEach(session => {
        const metrics = metricsManager.getSessionMetrics(session.sessionId, parseInt(hours));
        sessionMetrics.push(metrics);
      });

      res.json({
        success: true,
        sessions: sessionMetrics,
        total: sessionMetrics.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/metrics/sessions/:sessionId - Métricas de una sesión específica
  router.get('/sessions/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const { hours = 24 } = req.query;
      
      const session = sessionManager.getSessionStatus(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Sesión no encontrada'
        });
      }

      const metrics = metricsManager.getSessionMetrics(sessionId, parseInt(hours));

      res.json({
        success: true,
        ...metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/metrics/health - Estado de salud del sistema
  router.get('/health', (req, res) => {
    try {
      const health = metricsManager.getHealthStatus();

      res.json({
        success: true,
        ...health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/metrics/dashboard - Resumen para dashboard
  router.get('/dashboard', (req, res) => {
  try {
      const currentMetrics = metricsManager.getCurrentSystemMetrics() || {};
      const health = metricsManager.getHealthStatus() || { status: 'unknown', alerts: [] };
      const sessions = sessionManager.getAllSessions() || [];
      
      // Calcular estadísticas rápidas
      const connectedSessions = sessions.filter(s => s && s.status === 'connected');
      
      // Calcular mensajes de forma más segura
      let totalMessages = 0;
      try {
        totalMessages = sessions.reduce((total, session) => {
          if (!session || !session.sessionId) return total;
          try {
            const messages = sessionManager.getSessionMessages(session.sessionId, 100);
            return total + (Array.isArray(messages) ? messages.length : 0);
          } catch (msgError) {
            return total;
          }
        }, 0);
      } catch (msgError) {
        console.error('Error calculating total messages:', msgError);
        totalMessages = 0;
      }
      
      console.log('📈 Stats calculated - Connected:', connectedSessions.length, 'Total msgs:', totalMessages);

      // Obtener métricas de las últimas 24 horas para trends
      const historical = metricsManager.getHistoricalMetrics(24);
      console.log('📈 Historical data:', historical);
      
      // Generar datos de memoria en tiempo real si no hay históricos
      const memoryTrends = historical?.data?.length > 0 
        ? historical.data.slice(-24).map(d => ({
            timestamp: d.timestamp,
            usage: ((d.memory.used / d.memory.total) * 100).toFixed(2)
          }))
        : [{
            timestamp: new Date().toISOString(),
            usage: currentMetrics?.memory?.usage?.toFixed(2) || '0'
          }];

      // Generar datos de sesiones en tiempo real si no hay históricos  
      const sessionTrends = historical?.data?.length > 0
        ? historical.data.slice(-24).map(d => ({
            timestamp: d.timestamp,
            active: d.sessions?.active || 0
          }))
        : [{
            timestamp: new Date().toISOString(),
            active: connectedSessions.length
          }];
      
      const dashboard = {
        overview: {
          totalSessions: sessions.length || 0,
          activeSessions: connectedSessions.length || 0,
          totalMessages: totalMessages || 0,
          uptime: (currentMetrics && currentMetrics.uptime && currentMetrics.uptime.formatted) || '0m',
          systemStatus: (health && health.status) || 'healthy'
        },
        resources: {
          memoryUsage: (currentMetrics && currentMetrics.memory && currentMetrics.memory.usage) || 0,
          heapUsage: (currentMetrics && currentMetrics.memory && currentMetrics.memory.process && currentMetrics.memory.process.heapUsage) || 0,
          cpuCores: (currentMetrics && currentMetrics.cpu && currentMetrics.cpu.cores) || 1,
          loadAverage: (currentMetrics && currentMetrics.cpu && currentMetrics.cpu.loadAverage) || [0, 0, 0]
        },
        sessions: sessions.map(session => ({
          id: session.sessionId || 'unknown',
          status: session.status || 'disconnected',
          connectedAt: session.connectedAt || new Date().toISOString(),
          messageCount: session.messageCount || 0,
          hasQR: session.hasQR || false
        })),
        trends: {
          memory: memoryTrends,
          sessions: sessionTrends
        },
        alerts: health?.alerts || []
      };
      
      console.log('📊 Final dashboard:', dashboard);

      res.json({
        success: true,
        dashboard
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