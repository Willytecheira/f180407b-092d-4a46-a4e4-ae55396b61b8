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
  router.get('/dashboard', async (req, res) => {
    try {
      console.log('📊 Generando datos del dashboard...');
      
      // Obtener datos con fallbacks robustos
      let currentMetrics, health, sessions;
      
      try {
        currentMetrics = metricsManager.getCurrentSystemMetrics();
        console.log('✅ Métricas del sistema obtenidas');
      } catch (error) {
        console.error('❌ Error obteniendo métricas del sistema:', error);
        currentMetrics = {
          memory: { usage: 0, process: { heapUsage: 0 } },
          cpu: { cores: 1, loadAverage: [0, 0, 0] },
          uptime: { formatted: '0m' }
        };
      }
      
      try {
        health = metricsManager.getHealthStatus();
        console.log('✅ Estado de salud obtenido');
      } catch (error) {
        console.error('❌ Error obteniendo estado de salud:', error);
        health = { status: 'healthy', alerts: [] };
      }
      
      try {
        sessions = sessionManager.getAllSessions() || [];
        console.log('✅ Sesiones obtenidas:', sessions.length);
      } catch (error) {
        console.error('❌ Error obteniendo sesiones:', error);
        sessions = [];
      }
      
      // Calcular estadísticas con manejo seguro de errores
      const connectedSessions = sessions.filter(s => s && s.status === 'connected');
      const activeSessions = connectedSessions.length;
      
      let totalMessages = 0;
      sessions.forEach(session => {
        if (session && session.sessionId) {
          try {
            totalMessages += session.messageCount || 0;
          } catch (error) {
            console.warn('Error calculando mensajes para sesión:', session.sessionId);
          }
        }
      });
      
      console.log('📈 Estadísticas calculadas:', {
        total: sessions.length,
        active: activeSessions,
        messages: totalMessages
      });

      // Obtener datos históricos con fallback
      let memoryTrends = [];
      let sessionTrends = [];
      
      try {
        const historical = metricsManager.getHistoricalMetrics(24);
        if (historical && historical.data && historical.data.length > 0) {
          memoryTrends = historical.data.slice(-24).map(d => ({
            timestamp: d.timestamp,
            usage: parseFloat(((d.memory.used / d.memory.total) * 100).toFixed(2))
          }));
          
          sessionTrends = historical.data.slice(-24).map(d => ({
            timestamp: d.timestamp,
            active: d.sessions?.active || 0
          }));
        }
      } catch (error) {
        console.warn('❌ Error obteniendo datos históricos:', error);
      }
      
      // Si no hay datos históricos, crear punto actual
      if (memoryTrends.length === 0) {
        memoryTrends = [{
          timestamp: new Date().toISOString(),
          usage: parseFloat(currentMetrics.memory?.usage || 0)
        }];
      }
      
      if (sessionTrends.length === 0) {
        sessionTrends = [{
          timestamp: new Date().toISOString(),
          active: activeSessions
        }];
      }
      
      // Construir respuesta del dashboard
      const dashboard = {
        overview: {
          totalSessions: sessions.length,
          activeSessions: activeSessions,
          totalMessages: totalMessages,
          uptime: currentMetrics.uptime?.formatted || '0m',
          systemStatus: health.status || 'healthy'
        },
        resources: {
          memoryUsage: parseFloat(currentMetrics.memory?.usage || 0),
          heapUsage: parseFloat(currentMetrics.memory?.process?.heapUsage || 0),
          cpuCores: currentMetrics.cpu?.cores || 1,
          loadAverage: currentMetrics.cpu?.loadAverage || [0, 0, 0]
        },
        sessions: sessions.slice(0, 10).map(session => ({
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
        alerts: health.alerts || []
      };
      
      console.log('📊 Dashboard preparado exitosamente');

      res.json({
        success: true,
        dashboard
      });
      
    } catch (error) {
      console.error('💥 Error crítico en dashboard:', error);
      
      // Respuesta de emergencia
      res.json({
        success: true,
        dashboard: {
          overview: {
            totalSessions: 0,
            activeSessions: 0,
            totalMessages: 0,
            uptime: '0m',
            systemStatus: 'unknown'
          },
          resources: {
            memoryUsage: 0,
            heapUsage: 0,
            cpuCores: 1,
            loadAverage: [0, 0, 0]
          },
          sessions: [],
          trends: {
            memory: [{ timestamp: new Date().toISOString(), usage: 0 }],
            sessions: [{ timestamp: new Date().toISOString(), active: 0 }]
          },
          alerts: ['Error cargando datos del sistema']
        }
      });
    }
  });

  return router;
};