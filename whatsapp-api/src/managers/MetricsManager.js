const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class MetricsManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.dataPath = path.join(process.cwd(), 'data');
    this.metricsFile = path.join(this.dataPath, 'metrics.json');
    this.systemMetrics = [];
    this.sessionMetrics = new Map();
    this.startTime = Date.now();
    
    this.initializeStorage();
    
    // Collect initial metrics immediately
    this.collectSystemMetrics();
    this.collectSessionMetrics();
    this.startMetricsCollection();
  }

  async initializeStorage() {
    try {
      await fs.ensureDir(this.dataPath);
      await this.loadMetrics();
      console.log('📊 MetricsManager inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando MetricsManager:', error);
    }
  }

  async loadMetrics() {
    try {
      if (await fs.pathExists(this.metricsFile)) {
        const data = await fs.readJson(this.metricsFile);
        this.systemMetrics = data.systemMetrics || [];
        this.sessionMetrics = new Map(Object.entries(data.sessionMetrics || {}));
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }

  async saveMetrics() {
    try {
      const data = {
        systemMetrics: this.systemMetrics.slice(-1000), // Mantener últimas 1000 entradas
        sessionMetrics: Object.fromEntries(this.sessionMetrics.entries()),
        lastSaved: new Date().toISOString()
      };
      await fs.writeJson(this.metricsFile, data, { spaces: 2 });
    } catch (error) {
      console.error('Error guardando métricas:', error);
    }
  }

  startMetricsCollection() {
    console.log('🚀 Iniciando recolección de métricas...');
    
    // Recopilar métricas iniciales inmediatamente
    this.collectSystemMetrics();
    this.collectSessionMetrics();
    
    // Recopilar métricas del sistema cada 30 segundos
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Recopilar métricas de sesiones cada 60 segundos
    setInterval(() => {
      this.collectSessionMetrics();
    }, 60000);

    // Guardar métricas cada 5 minutos
    setInterval(() => {
      this.saveMetrics();
    }, 300000);
    
    console.log('✅ Métricas iniciales recopiladas');
  }

  collectSystemMetrics() {
    try {
      console.log('📊 Recopilando métricas del sistema...');
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metrics = {
        timestamp: new Date().toISOString(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          process: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
          }
        },
        cpu: {
          loadAverage: os.loadavg(),
          usage: cpuUsage,
          cores: os.cpus().length
        },
        uptime: {
          system: os.uptime(),
          process: process.uptime()
        },
        sessions: {
          total: this.sessionManager.sessions.size,
          active: this.sessionManager.getActiveSessionsCount(),
          qr: this.sessionManager.qrCodes.size
        }
      };

      this.systemMetrics.push(metrics);
      console.log('✅ Métricas recopiladas. Total entries:', this.systemMetrics.length);
      
      // Mantener solo las últimas 2880 entradas (24 horas de datos cada 30 segundos)
      if (this.systemMetrics.length > 2880) {
        this.systemMetrics = this.systemMetrics.slice(-2880);
      }

    } catch (error) {
      console.error('❌ Error recopilando métricas del sistema:', error);
    }
  }

  collectSessionMetrics() {
    try {
      const sessions = this.sessionManager.getAllSessions();
      const timestamp = new Date().toISOString();

      sessions.forEach(session => {
        const sessionId = session.sessionId;
        
        if (!this.sessionMetrics.has(sessionId)) {
          this.sessionMetrics.set(sessionId, []);
        }

        const sessionData = this.sessionMetrics.get(sessionId);
        const messages = this.sessionManager.getSessionMessages(sessionId, 1000);
        
        const recentMessages = messages.filter(msg => {
          const msgTime = new Date(msg.timestamp * 1000);
          const oneHourAgo = new Date(Date.now() - 3600000);
          return msgTime > oneHourAgo;
        });

        const metrics = {
          timestamp,
          status: session.status,
          connectedAt: session.connectedAt,
          messageCount: messages.length,
          recentMessages: recentMessages.length,
          lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
          hasQR: session.hasQR
        };

        sessionData.push(metrics);
        
        // Mantener solo las últimas 1440 entradas por sesión (24 horas cada minuto)
        if (sessionData.length > 1440) {
          sessionData.splice(0, sessionData.length - 1440);
        }

        this.sessionMetrics.set(sessionId, sessionData);
      });

    } catch (error) {
      console.error('Error recopilando métricas de sesiones:', error);
    }
  }

  getCurrentSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      return {
        timestamp: new Date().toISOString(),
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usage: ((usedMemory / totalMemory) * 100).toFixed(2),
          process: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            heapUsage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2)
          }
        },
        cpu: {
          loadAverage: os.loadavg(),
          cores: os.cpus().length,
          platform: os.platform(),
          arch: os.arch()
        },
        os: {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          release: os.release()
        },
        process: {
          pid: process.pid,
          nodeVersion: process.version,
          uptime: process.uptime()
        },
        uptime: {
          system: os.uptime(),
          process: process.uptime(),
          formatted: this.formatUptime(process.uptime())
        },
        sessions: {
          total: this.sessionManager.sessions.size,
          active: this.sessionManager.getActiveSessionsCount(),
          qr: this.sessionManager.qrCodes.size,
          webhooks: this.sessionManager.webhooks.size
        }
      };
    } catch (error) {
      console.error('Error obteniendo métricas actuales:', error);
      return null;
    }
  }

  getHistoricalMetrics(hours = 24) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

    const filteredMetrics = this.systemMetrics.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      return metricTime >= startTime && metricTime <= endTime;
    });

    return {
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        hours
      },
      data: filteredMetrics,
      summary: this.calculateSummary(filteredMetrics)
    };
  }

  getSessionMetrics(sessionId, hours = 24) {
    const sessionData = this.sessionMetrics.get(sessionId) || [];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

    const filteredData = sessionData.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      return metricTime >= startTime && metricTime <= endTime;
    });

    return {
      sessionId,
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        hours
      },
      data: filteredData,
      summary: this.calculateSessionSummary(filteredData)
    };
  }

  calculateSummary(metrics) {
    if (metrics.length === 0) return null;

    const memoryUsage = metrics.map(m => (m.memory.used / m.memory.total) * 100);
    const sessionCounts = metrics.map(m => m.sessions.active);

    return {
      memory: {
        avg: (memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length).toFixed(2),
        max: Math.max(...memoryUsage).toFixed(2),
        min: Math.min(...memoryUsage).toFixed(2)
      },
      sessions: {
        avg: Math.round(sessionCounts.reduce((a, b) => a + b, 0) / sessionCounts.length),
        max: Math.max(...sessionCounts),
        min: Math.min(...sessionCounts)
      },
      dataPoints: metrics.length
    };
  }

  calculateSessionSummary(metrics) {
    if (metrics.length === 0) return null;

    const messageCounts = metrics.map(m => m.recentMessages);
    const connectedCount = metrics.filter(m => m.status === 'connected').length;

    return {
      messages: {
        total: messageCounts.reduce((a, b) => a + b, 0),
        avg: Math.round(messageCounts.reduce((a, b) => a + b, 0) / messageCounts.length),
        max: Math.max(...messageCounts)
      },
      connectivity: {
        uptime: ((connectedCount / metrics.length) * 100).toFixed(2),
        dataPoints: metrics.length
      }
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m ${secs}s`;
    }
  }

  getHealthStatus() {
    const current = this.getCurrentSystemMetrics();
    if (!current) return { status: 'unknown' };

    const memoryUsage = parseFloat(current.memory.usage);
    const heapUsage = parseFloat(current.memory.process.heapUsage);
    const activeSessions = current.sessions.active;

    let status = 'healthy';
    let alerts = [];

    if (memoryUsage > 90) {
      status = 'critical';
      alerts.push('Memoria del sistema crítica (>90%)');
    } else if (memoryUsage > 80) {
      status = 'warning';
      alerts.push('Memoria del sistema alta (>80%)');
    }

    if (heapUsage > 90) {
      status = 'critical';
      alerts.push('Memoria del proceso crítica (>90%)');
    } else if (heapUsage > 80 && status === 'healthy') {
      status = 'warning';
      alerts.push('Memoria del proceso alta (>80%)');
    }

    if (activeSessions === 0) {
      status = status === 'healthy' ? 'warning' : status;
      alerts.push('No hay sesiones activas');
    }

    return {
      status,
      alerts,
      metrics: current,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = MetricsManager;