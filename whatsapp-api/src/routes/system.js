const express = require('express');
const fs = require('fs-extra');
const path = require('path');

module.exports = (sessionManager, userManager) => {
  const router = express.Router();

  // GET /api/system/api-key - Obtener información de la API Key (parcialmente oculta)
  router.get('/api-key', (req, res) => {
    try {
      const apiKey = process.env.API_KEY || 'whatsapp-api-key-2024';
      const maskedKey = apiKey.substring(0, 8) + '*'.repeat(apiKey.length - 12) + apiKey.substring(apiKey.length - 4);

      res.json({
        success: true,
        apiKey: maskedKey,
        fullLength: apiKey.length,
        lastChanged: process.env.API_KEY_CHANGED_AT || 'Desconocido'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/system/api-key - Generar nueva API Key
  router.post('/api-key/generate', (req, res) => {
    try {
      // Generar nueva API Key de 32 caracteres
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let newApiKey = '';
      for (let i = 0; i < 32; i++) {
        newApiKey += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const maskedKey = newApiKey.substring(0, 8) + '*'.repeat(newApiKey.length - 12) + newApiKey.substring(newApiKey.length - 4);

      res.json({
        success: true,
        newApiKey: maskedKey,
        fullKey: newApiKey, // Solo para mostrar una vez
        message: 'Nueva API Key generada. Guárdala en un lugar seguro.',
        warning: 'Esta es la única vez que verás la clave completa'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // PUT /api/system/api-key - Actualizar API Key
  router.put('/api-key', async (req, res) => {
    try {
      const { newApiKey, currentApiKey } = req.body;

      if (!newApiKey || !currentApiKey) {
        return res.status(400).json({
          success: false,
          error: 'newApiKey y currentApiKey son requeridos'
        });
      }

      // Verificar que la API Key actual es correcta
      const currentKey = process.env.API_KEY || 'whatsapp-api-key-2024';
      if (currentApiKey !== currentKey) {
        return res.status(401).json({
          success: false,
          error: 'API Key actual incorrecta'
        });
      }

      // Actualizar la variable de entorno (temporal)
      process.env.API_KEY = newApiKey;
      process.env.API_KEY_CHANGED_AT = new Date().toISOString();

      // Guardar en archivo de configuración para persistencia
      const configPath = path.join(process.cwd(), '.env.runtime');
      const configContent = `API_KEY=${newApiKey}\nAPI_KEY_CHANGED_AT=${process.env.API_KEY_CHANGED_AT}\n`;
      await fs.writeFile(configPath, configContent);

      // Log del cambio
      console.log(`🔑 API Key actualizada por ${req.user?.username || 'usuario'} en ${new Date().toISOString()}`);

      res.json({
        success: true,
        message: 'API Key actualizada exitosamente',
        changedAt: process.env.API_KEY_CHANGED_AT,
        warning: 'Los clientes deberán usar la nueva API Key para futuras peticiones'
      });
    } catch (error) {
      console.error('Error actualizando API Key:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/system/config - Configuración del sistema
  router.get('/config', (req, res) => {
    try {
      const config = {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'production',
        serverIP: process.env.SERVER_IP || 'localhost',
        sessionsDir: process.env.SESSIONS_DIR || './sessions',
        cacheDir: process.env.CACHE_DIR || './.wwebjs_cache',
        authDir: process.env.AUTH_DIR || './.wwebjs_auth',
        disableHttps: process.env.DISABLE_HTTPS || 'false',
        forceHttp: process.env.FORCE_HTTP || 'false'
      };

      res.json({
        success: true,
        config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // PUT /api/system/config - Actualizar configuración
  router.put('/config', async (req, res) => {
    try {
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'config es requerido'
        });
      }

      // Validar configuración
      const allowedConfigs = [
        'SERVER_IP',
        'SESSIONS_DIR', 
        'CACHE_DIR',
        'AUTH_DIR',
        'DISABLE_HTTPS',
        'FORCE_HTTP'
      ];

      const updates = {};
      Object.keys(config).forEach(key => {
        if (allowedConfigs.includes(key)) {
          updates[key] = config[key];
          process.env[key] = config[key];
        }
      });

      // Guardar cambios
      const configPath = path.join(process.cwd(), '.env.runtime');
      let existingConfig = '';
      if (await fs.pathExists(configPath)) {
        existingConfig = await fs.readFile(configPath, 'utf8');
      }

      Object.keys(updates).forEach(key => {
        const regex = new RegExp(`^${key}=.*$`, 'gm');
        const newLine = `${key}=${updates[key]}`;
        
        if (regex.test(existingConfig)) {
          existingConfig = existingConfig.replace(regex, newLine);
        } else {
          existingConfig += `\n${newLine}`;
        }
      });

      await fs.writeFile(configPath, existingConfig);

      console.log(`⚙️ Configuración actualizada por ${req.user?.username || 'usuario'}`);

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        updates,
        warning: 'Algunos cambios requieren reinicio del servidor'
      });
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/system/restart - Reiniciar servidor (requiere PM2)
  router.post('/restart', async (req, res) => {
    try {
      const { force = false } = req.body;

      console.log(`🔄 Reinicio solicitado por ${req.user?.username || 'usuario'}`);

      res.json({
        success: true,
        message: 'Reinicio programado',
        warning: 'El servidor se reiniciará en 5 segundos'
      });

      // Programar reinicio
      setTimeout(() => {
        if (force) {
          process.exit(0);
        } else {
          // Intentar reinicio graceful con PM2
          process.kill(process.pid, 'SIGUSR2');
        }
      }, 5000);

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/system/logs - Obtener logs del sistema
  router.get('/logs', async (req, res) => {
    try {
      const { lines = 100, level = 'all' } = req.query;
      const logsPath = path.join(process.cwd(), 'logs');
      
      let logs = [];

      if (await fs.pathExists(logsPath)) {
        const logFiles = await fs.readdir(logsPath);
        
        for (const file of logFiles.slice(-3)) { // Últimos 3 archivos
          const filePath = path.join(logsPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const fileLines = content.split('\n').filter(line => line.trim());
          
          fileLines.forEach(line => {
            logs.push({
              file,
              timestamp: new Date().toISOString(),
              content: line
            });
          });
        }
      }

      // Filtrar por nivel si se especifica
      if (level !== 'all') {
        logs = logs.filter(log => 
          log.content.toLowerCase().includes(level.toLowerCase())
        );
      }

      // Limitar número de líneas
      logs = logs.slice(-parseInt(lines));

      res.json({
        success: true,
        logs,
        total: logs.length
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