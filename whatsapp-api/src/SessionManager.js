const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');

class SessionManager {
  constructor(io) {
    this.sessions = new Map();
    this.qrCodes = new Map();
    this.messages = new Map();
    this.io = io;
    this.webhookUrl = process.env.WEBHOOK_URL || null;
  }

  async createSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      throw new Error(`La sesión ${sessionId} ya existe`);
    }

    try {
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Configurar eventos del cliente
      this.setupClientEvents(client, sessionId);

      // Guardar cliente
      this.sessions.set(sessionId, {
        client,
        status: 'initializing',
        qr: null,
        connectedAt: null
      });

      // Inicializar mensajes para esta sesión
      if (!this.messages.has(sessionId)) {
        this.messages.set(sessionId, []);
      }

      // Inicializar cliente
      await client.initialize();

      return {
        success: true,
        sessionId,
        status: 'initializing',
        message: 'Sesión creada exitosamente'
      };

    } catch (error) {
      console.error(`Error creando sesión ${sessionId}:`, error);
      throw error;
    }
  }

  setupClientEvents(client, sessionId) {
    // QR Code generado
    client.on('qr', async (qr) => {
      try {
        const qrCodeData = await qrcode.toDataURL(qr);
        this.qrCodes.set(sessionId, qrCodeData);
        
        this.updateSessionStatus(sessionId, 'qr_ready');
        
        this.io.to(`session-${sessionId}`).emit('qr', {
          sessionId,
          qr: qrCodeData
        });

        console.log(`QR generado para sesión: ${sessionId}`);
      } catch (error) {
        console.error(`Error generando QR para ${sessionId}:`, error);
      }
    });

    // Cliente listo
    client.on('ready', () => {
      this.updateSessionStatus(sessionId, 'connected');
      this.qrCodes.delete(sessionId);
      
      this.io.to(`session-${sessionId}`).emit('connected', {
        sessionId,
        message: 'WhatsApp conectado exitosamente'
      });

      console.log(`✅ Sesión ${sessionId} conectada exitosamente`);
    });

    // Cliente autenticado
    client.on('authenticated', () => {
      console.log(`🔐 Sesión ${sessionId} autenticada`);
      this.updateSessionStatus(sessionId, 'authenticated');
    });

    // Error de autenticación
    client.on('auth_failure', (msg) => {
      console.error(`❌ Error de autenticación en ${sessionId}:`, msg);
      this.updateSessionStatus(sessionId, 'auth_failure');
      
      this.io.to(`session-${sessionId}`).emit('auth_failure', {
        sessionId,
        error: msg
      });
    });

    // Cliente desconectado
    client.on('disconnected', (reason) => {
      console.log(`🔌 Sesión ${sessionId} desconectada:`, reason);
      this.updateSessionStatus(sessionId, 'disconnected');
      
      this.io.to(`session-${sessionId}`).emit('disconnected', {
        sessionId,
        reason
      });
    });

    // Mensaje recibido
    client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(sessionId, message);
      } catch (error) {
        console.error(`Error procesando mensaje en ${sessionId}:`, error);
      }
    });

    // Cambio de estado de mensaje
    client.on('message_ack', (message, ack) => {
      this.io.to(`session-${sessionId}`).emit('message_ack', {
        sessionId,
        messageId: message.id._serialized,
        ack
      });
    });
  }

  async handleIncomingMessage(sessionId, message) {
    const messageData = {
      id: message.id._serialized,
      from: message.from,
      to: message.to,
      body: message.body,
      type: message.type,
      timestamp: message.timestamp,
      isForwarded: message.isForwarded,
      isMedia: message.hasMedia,
      sessionId
    };

    // Procesar media si existe
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        messageData.media = {
          mimetype: media.mimetype,
          data: media.data,
          filename: media.filename || `media_${Date.now()}`
        };
      } catch (error) {
        console.error(`Error descargando media en ${sessionId}:`, error);
        messageData.media = null;
      }
    }

    // Obtener información del contacto
    try {
      const contact = await message.getContact();
      messageData.contact = {
        name: contact.name || contact.pushname || contact.number,
        number: contact.number,
        isGroup: contact.isGroup,
        profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
      };
    } catch (error) {
      console.error(`Error obteniendo contacto en ${sessionId}:`, error);
    }

    // Guardar mensaje
    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(messageData);
    
    // Mantener solo los últimos 1000 mensajes
    if (sessionMessages.length > 1000) {
      sessionMessages.splice(0, sessionMessages.length - 1000);
    }
    
    this.messages.set(sessionId, sessionMessages);

    // Emitir a clientes conectados
    this.io.to(`session-${sessionId}`).emit('message', {
      sessionId,
      message: messageData
    });

    // Enviar a webhook si está configurado
    if (this.webhookUrl) {
      this.sendToWebhook(messageData);
    }

    console.log(`📥 Mensaje recibido en ${sessionId} de ${messageData.contact?.name || messageData.from}`);
  }

  async sendToWebhook(messageData) {
    try {
      const fetch = require('node-fetch');
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
    } catch (error) {
      console.error('Error enviando a webhook:', error);
    }
  }

  updateSessionStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      if (status === 'connected') {
        session.connectedAt = new Date();
      }
    }
  }

  async sendMessage(sessionId, number, message, options = {}) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    if (session.status !== 'connected') {
      throw new Error(`Sesión ${sessionId} no está conectada`);
    }

    try {
      const chatId = number.includes('@') ? number : `${number}@c.us`;
      const sentMessage = await session.client.sendMessage(chatId, message, options);
      
      console.log(`📤 Mensaje enviado desde ${sessionId} a ${number}`);
      
      return {
        success: true,
        messageId: sentMessage.id._serialized,
        timestamp: sentMessage.timestamp
      };
    } catch (error) {
      console.error(`Error enviando mensaje desde ${sessionId}:`, error);
      throw error;
    }
  }

  async sendMedia(sessionId, number, media, options = {}) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    if (session.status !== 'connected') {
      throw new Error(`Sesión ${sessionId} no está conectada`);
    }

    try {
      const chatId = number.includes('@') ? number : `${number}@c.us`;
      let mediaMessage;

      if (typeof media === 'string' && media.startsWith('data:')) {
        // Base64
        mediaMessage = new MessageMedia(
          options.mimetype || 'image/jpeg',
          media.split(',')[1],
          options.filename || 'media'
        );
      } else if (typeof media === 'string' && (media.startsWith('http') || media.startsWith('https'))) {
        // URL
        mediaMessage = await MessageMedia.fromUrl(media, {
          filename: options.filename
        });
      } else {
        throw new Error('Formato de media no soportado');
      }

      const sentMessage = await session.client.sendMessage(chatId, mediaMessage, {
        caption: options.caption
      });
      
      console.log(`📤 Media enviado desde ${sessionId} a ${number}`);
      
      return {
        success: true,
        messageId: sentMessage.id._serialized,
        timestamp: sentMessage.timestamp
      };
    } catch (error) {
      console.error(`Error enviando media desde ${sessionId}:`, error);
      throw error;
    }
  }

  getQRCode(sessionId) {
    return this.qrCodes.get(sessionId);
  }

  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId,
      status: session.status,
      connectedAt: session.connectedAt,
      hasQR: this.qrCodes.has(sessionId)
    };
  }

  getSessionMessages(sessionId, limit = 50) {
    const messages = this.messages.get(sessionId) || [];
    return messages.slice(-limit);
  }

  getAllSessions() {
    const sessions = [];
    for (const [sessionId, session] of this.sessions.entries()) {
      sessions.push({
        sessionId,
        status: session.status,
        connectedAt: session.connectedAt,
        hasQR: this.qrCodes.has(sessionId)
      });
    }
    return sessions;
  }

  getActiveSessionsCount() {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'connected') {
        count++;
      }
    }
    return count;
  }

  async logoutSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    try {
      await session.client.logout();
      await session.client.destroy();
      
      this.sessions.delete(sessionId);
      this.qrCodes.delete(sessionId);
      
      // Limpiar directorio de sesión
      const sessionPath = path.join('./.wwebjs_auth/session-' + sessionId);
      await fs.remove(sessionPath).catch(() => {});
      
      console.log(`🚪 Sesión ${sessionId} cerrada exitosamente`);
      
      return { success: true, message: 'Sesión cerrada exitosamente' };
    } catch (error) {
      console.error(`Error cerrando sesión ${sessionId}:`, error);
      throw error;
    }
  }

  async closeAllSessions() {
    console.log('🔄 Cerrando todas las sesiones...');
    
    const promises = [];
    for (const sessionId of this.sessions.keys()) {
      promises.push(this.logoutSession(sessionId).catch(console.error));
    }
    
    await Promise.all(promises);
    console.log('✅ Todas las sesiones cerradas');
  }
}

module.exports = SessionManager;