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
      const currentMetrics = metricsManager.getCurrentSystemMetrics();
      const health = metricsManager.getHealthStatus();
      const sessions = sessionManager.getAllSessions();
      
      // Calcular estadísticas rápidas
      const connectedSessions = sessions.filter(s => s.status === 'connected');
      const totalMessages = sessions.reduce((total, session) => {
        const messages = sessionManager.getSessionMessages(session.sessionId, 100);
        return total + messages.length;
      }, 0);

      // Obtener métricas de las últimas 24 horas para trends
      const historical = metricsManager.getHistoricalMetrics(24);
      
      const dashboard = {
        overview: {
          totalSessions: sessions.length,
          activeSessions: connectedSessions.length,
          totalMessages,
          uptime: currentMetrics?.uptime?.formatted || '0m',
          systemStatus: health.status
        },
        resources: {
          memoryUsage: currentMetrics?.memory?.usage || 0,
          heapUsage: currentMetrics?.memory?.process?.heapUsage || 0,
          cpuCores: currentMetrics?.cpu?.cores || 0,
          loadAverage: currentMetrics?.cpu?.loadAverage || [0, 0, 0]
        },
        sessions: sessions.map(session => ({
          id: session.sessionId,
          status: session.status,
          connectedAt: session.connectedAt,
          messageCount: session.messageCount || 0,
          hasQR: session.hasQR
        })),
        trends: {
          memory: historical.data.slice(-24).map(d => ({
            timestamp: d.timestamp,
            usage: ((d.memory.used / d.memory.total) * 100).toFixed(2)
          })),
          sessions: historical.data.slice(-24).map(d => ({
            timestamp: d.timestamp,
            active: d.sessions.active
          }))
        },
        alerts: health.alerts || []
      };

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