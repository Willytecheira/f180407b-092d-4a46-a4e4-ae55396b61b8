const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');

class SessionManager {
  constructor(io) {
    this.sessions = new Map();
    this.qrCodes = new Map();
    this.messages = new Map();
    this.webhooks = new Map(); // Nuevo: webhooks por sesión
    this.io = io;
    this.webhookUrl = process.env.WEBHOOK_URL || null;
    this.dataPath = path.join(process.cwd(), 'data');
    this.webhooksFile = path.join(this.dataPath, 'webhooks.json');
    
    // Crear directorios necesarios y cargar datos
    this.initializeStorage();
    
    // Restaurar sesiones existentes al iniciar
    this.restoreExistingSessions();
  }
  
  async initializeStorage() {
    try {
      // Crear directorios necesarios
      await fs.ensureDir(this.dataPath);
      const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
      await fs.ensureDir(uploadsPath);
      
      // Cargar webhooks guardados
      await this.loadWebhooks();
      
      console.log('📁 Almacenamiento inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando almacenamiento:', error);
    }
  }

  async loadWebhooks() {
    try {
      if (await fs.pathExists(this.webhooksFile)) {
        const webhookData = await fs.readJson(this.webhooksFile);
        this.webhooks = new Map(Object.entries(webhookData));
        console.log(`🔗 ${this.webhooks.size} webhooks cargados desde archivo`);
      }
    } catch (error) {
      console.error('Error cargando webhooks:', error);
    }
  }

  async saveWebhooks() {
    try {
      const webhookData = Object.fromEntries(this.webhooks.entries());
      await fs.writeJson(this.webhooksFile, webhookData, { spaces: 2 });
      console.log('💾 Webhooks guardados en archivo');
    } catch (error) {
      console.error('Error guardando webhooks:', error);
    }
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
    client.on('message_ack', async (message, ack) => {
      try {
        // Obtener información del mensaje y contacto
        const contact = await message.getContact().catch(() => null);
        const isFromMe = message.fromMe;
        
        const ackData = {
          sessionId,
          messageId: message.id._serialized,
          from: message.from,
          to: message.to,
          body: message.body,
          type: message.type,
          ack,
          ackStatus: this.getAckStatusText(ack),
          timestamp: new Date().toISOString(),
          isFromMe,
          contact: contact ? {
            name: contact.name || contact.pushname || contact.number,
            number: contact.number,
            isGroup: contact.isGroup
          } : null
        };

        // Emitir via WebSocket
        this.io.to(`session-${sessionId}`).emit('message_ack', ackData);

        // Determinar el tipo de evento para webhook basado en ACK y origen
        let eventType = 'message_ack';
        
        if (isFromMe) {
          // Mensajes enviados por nosotros
          if (ack === 1) {
            eventType = 'message-delivered';
          } else if (ack === 3) {
            eventType = 'message-read';
          }
        } else {
          // Mensajes recibidos de otros
          if (ack === 1) {
            eventType = 'message-delivered';
          } else if (ack === 3) {
            eventType = 'message-read';
          }
        }

        // Enviar a webhook si está configurado
        await this.sendToWebhook(sessionId, ackData, eventType);
        
      } catch (error) {
        console.error(`Error procesando message_ack para ${sessionId}:`, error);
      }
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
        console.log(`📎 Descargando media para mensaje ${message.id._serialized}`);
        const media = await message.downloadMedia();
        
        if (media && media.data) {
          // Generar nombre único para el archivo
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const extension = this.getFileExtension(media.mimetype);
          const fileName = `${timestamp}_${randomStr}${extension}`;
          const originalName = media.filename || fileName;
          
          // Guardar archivo en el servidor
          const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
          const filePath = path.join(uploadsPath, fileName);
          
          // Convertir base64 a buffer y guardar
          const buffer = Buffer.from(media.data, 'base64');
          await fs.writeFile(filePath, buffer);
          
          // Generar URL accesible sin puerto
          const serverIP = process.env.SERVER_IP || 'localhost';
          const fileUrl = `http://${serverIP}/uploads/${fileName}`;
          
          messageData.media = {
            fileUrl,
            fileName,
            originalName,
            mimetype: media.mimetype,
            fileSize: buffer.length
          };
          
          console.log(`💾 Media guardado: ${fileName} (${buffer.length} bytes)`);
        } else {
          console.warn(`⚠️ Media vacío para mensaje ${message.id._serialized}`);
          messageData.media = null;
        }
      } catch (error) {
        console.error(`❌ Error procesando media en ${sessionId}:`, error.message);
        // No detener el flujo, continuar sin media
        messageData.media = {
          error: 'Failed to download media',
          originalError: error.message
        };
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
    await this.sendToWebhook(sessionId, messageData, 'message-received');

    console.log(`📥 Mensaje recibido en ${sessionId} de ${messageData.contact?.name || messageData.from}`);
  }

  async sendToWebhook(sessionId, messageData, eventType = 'message') {
    try {
      // Obtener webhook específico de la sesión
      const sessionWebhook = this.webhooks.get(sessionId);
      let webhookUrl = null;
      let allowedEvents = ['all'];

      if (sessionWebhook && sessionWebhook.url) {
        webhookUrl = sessionWebhook.url;
        allowedEvents = sessionWebhook.events || ['all'];
      } else if (this.webhookUrl) {
        // Usar webhook global como fallback
        webhookUrl = this.webhookUrl;
      }

      if (!webhookUrl) {
        return; // No hay webhook configurado
      }

      // Verificar si el evento está permitido
      if (!allowedEvents.includes('all') && !allowedEvents.includes(eventType)) {
        console.log(`🚫 Evento ${eventType} no permitido para sesión ${sessionId}`);
        return;
      }

      const payload = {
        ...messageData,
        eventType,
        timestamp: new Date().toISOString()
      };

      console.log(`🔔 Enviando ${eventType} al webhook para sesión ${sessionId}`);
      
      const fetch = require('node-fetch');
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsApp-API-Webhook/1.0'
        },
        body: JSON.stringify(payload),
        timeout: 10000 // 10 segundos timeout
      });

      if (response.ok) {
        console.log(`✅ Webhook enviado exitosamente para ${sessionId} (${response.status})`);
      } else {
        console.error(`❌ Error en webhook para ${sessionId}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error enviando webhook para ${sessionId}:`, error.message);
      // No relanzar el error para evitar que detenga el flujo principal
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

      // Generar webhook para mensaje enviado
      try {
        const messageData = {
          id: sentMessage.id._serialized,
          from: sentMessage.from,
          to: sentMessage.to,
          body: message,
          type: 'chat',
          timestamp: sentMessage.timestamp,
          isFromMe: true,
          sessionId
        };

        // Obtener información del contacto si es posible
        try {
          const contact = await sentMessage.getContact();
          messageData.contact = {
            name: contact.name || contact.pushname || contact.number,
            number: contact.number,
            isGroup: contact.isGroup
          };
        } catch (contactError) {
          console.log(`No se pudo obtener contacto para mensaje enviado: ${contactError.message}`);
        }

        // Enviar webhook de mensaje enviado
        await this.sendToWebhook(sessionId, messageData, 'message-from-me');
      } catch (webhookError) {
        console.error(`Error enviando webhook para mensaje enviado:`, webhookError);
        // No detener el flujo principal por errores de webhook
      }

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

      // Generar webhook para media enviado
      try {
        const messageData = {
          id: sentMessage.id._serialized,
          from: sentMessage.from,
          to: sentMessage.to,
          body: options.caption || '',
          type: this.getMediaTypeFromMimetype(options.mimetype || mediaMessage.mimetype),
          timestamp: sentMessage.timestamp,
          isFromMe: true,
          isMedia: true,
          sessionId,
          media: {
            mimetype: options.mimetype || mediaMessage.mimetype,
            filename: options.filename || mediaMessage.filename || 'media',
            caption: options.caption
          }
        };

        // Obtener información del contacto si es posible
        try {
          const contact = await sentMessage.getContact();
          messageData.contact = {
            name: contact.name || contact.pushname || contact.number,
            number: contact.number,
            isGroup: contact.isGroup
          };
        } catch (contactError) {
          console.log(`No se pudo obtener contacto para media enviado: ${contactError.message}`);
        }

        // Enviar webhook de media enviado
        await this.sendToWebhook(sessionId, messageData, 'message-from-me');
      } catch (webhookError) {
        console.error(`Error enviando webhook para media enviado:`, webhookError);
        // No detener el flujo principal por errores de webhook
      }

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
        status: session.status || 'unknown',
        connectedAt: session.connectedAt,
        hasQR: this.qrCodes.has(sessionId),
        messageCount: this.messages.has(sessionId) ? this.messages.get(sessionId).length : 0
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
  
  // Métodos para manejo de webhooks dinámicos
  async configureWebhook(sessionId, url, events) {
    try {
      if (url) {
        this.webhooks.set(sessionId, {
          url,
          events: events || ['all'],
          configuredAt: new Date().toISOString()
        });
        console.log(`🔗 Webhook configurado para sesión ${sessionId}: ${url}`);
      } else {
        this.webhooks.delete(sessionId);
        console.log(`🗑️ Webhook eliminado para sesión ${sessionId}`);
      }
      
      // Guardar cambios en archivo
      await this.saveWebhooks();
      
      return { success: true };
    } catch (error) {
      console.error(`Error configurando webhook para ${sessionId}:`, error);
      throw error;
    }
  }

  getWebhookConfig(sessionId) {
    const webhook = this.webhooks.get(sessionId);
    return {
      sessionId,
      webhookUrl: webhook?.url || null,
      events: webhook?.events || [],
      configured: !!webhook,
      configuredAt: webhook?.configuredAt || null,
      globalWebhook: this.webhookUrl
    };
  }

  getAllWebhooks() {
    const webhooks = [];
    
    // Webhook global
    if (this.webhookUrl) {
      webhooks.push({
        type: 'global',
        sessionId: null,
        url: this.webhookUrl,
        events: ['all'],
        configured: true,
        configuredAt: 'Server startup'
      });
    }
    
    // Webhooks por sesión
    for (const [sessionId, webhook] of this.webhooks.entries()) {
      webhooks.push({
        type: 'session',
        sessionId,
        url: webhook.url,
        events: webhook.events,
        configured: true,
        configuredAt: webhook.configuredAt
      });
    }
    
    return webhooks;
  }

  getAckStatusText(ack) {
    const statusMap = {
      0: 'sent',        // Mensaje enviado
      1: 'delivered',   // Mensaje entregado al servidor
      2: 'received',    // Mensaje recibido en el dispositivo
      3: 'read'         // Mensaje leído
    };
    return statusMap[ack] || 'unknown';
  }

  getFileExtension(mimetype) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'audio/aac': '.aac',
      'audio/m4a': '.m4a',
      'audio/opus': '.opus',
      'audio/webm': '.webm',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt'
    };
    
    return extensions[mimetype] || '.bin';
  }

  getMediaTypeFromMimetype(mimetype) {
    if (!mimetype) return 'unknown';
    
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'ptt'; // WhatsApp Web.js usa 'ptt' para audio
    if (mimetype.startsWith('application/pdf')) return 'document';
    if (mimetype.startsWith('application/')) return 'document';
    if (mimetype.startsWith('text/')) return 'document';
    
    return 'document';
  }

  async restoreExistingSessions() {
    try {
      console.log('🔄 Buscando sesiones existentes para restaurar...');
      
      const authPath = './.wwebjs_auth';
      
      // Verificar si existe el directorio de autenticación
      if (!await fs.pathExists(authPath)) {
        console.log('📁 No se encontraron sesiones previas');
        return;
      }
      
      // Leer directorios de sesiones
      const sessionDirs = await fs.readdir(authPath);
      const sessionIds = sessionDirs
        .filter(dir => dir.startsWith('session-'))
        .map(dir => dir.replace('session-', ''));
      
      if (sessionIds.length === 0) {
        console.log('📁 No se encontraron sesiones previas');
        return;
      }
      
      console.log(`🔍 Encontradas ${sessionIds.length} sesiones para restaurar:`, sessionIds);
      
      // Restaurar cada sesión
      for (const sessionId of sessionIds) {
        try {
          console.log(`🔧 Restaurando sesión: ${sessionId}`);
          
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

          // Inicializar cliente (sin await para no bloquear)
          client.initialize().catch(error => {
            console.error(`❌ Error restaurando sesión ${sessionId}:`, error);
            this.sessions.delete(sessionId);
          });
          
          console.log(`✅ Sesión ${sessionId} agregada para restauración`);
          
        } catch (error) {
          console.error(`❌ Error procesando sesión ${sessionId}:`, error);
        }
      }
      
      console.log(`🚀 Proceso de restauración iniciado para ${sessionIds.length} sesiones`);
      
    } catch (error) {
      console.error('❌ Error en proceso de restauración:', error);
    }
  }
}

module.exports = SessionManager;