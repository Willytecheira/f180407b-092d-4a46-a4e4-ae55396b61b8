# WhatsApp Multi-Session API

Una API REST completa para gestionar múltiples instancias de WhatsApp Web simultáneamente, basada en `whatsapp-web.js`.

## 🚀 Características

- **Múltiples sesiones simultáneas**: Crea y maneja varias instancias de WhatsApp Web
- **Persistencia de sesiones**: Utiliza `LocalAuth` para mantener las sesiones activas
- **API REST completa**: Endpoints para enviar/recibir mensajes, gestionar sesiones
- **Interfaz web incluida**: Panel de control para gestionar sesiones visualmente
- **WebSocket en tiempo real**: Notificaciones instantáneas de nuevos mensajes
- **Soporte multimedia**: Envío y recepción de imágenes, audios, documentos
- **Autenticación por API Key**: Seguridad básica incluida
- **Compatible con Ubuntu**: Instalación directa sin Docker

## 📋 Requisitos

- Ubuntu 18.04+ / Debian 10+
- Node.js 16+ 
- 2GB+ RAM disponible
- Conexión a internet estable

## 🛠️ Instalación en Ubuntu

### 1. Instalación automática de dependencias

```bash
# Ejecutar como root
sudo bash install.sh
```

Este script instalará:
- Node.js y npm
- Chromium y dependencias de Puppeteer
- PM2 para gestión de procesos
- Todas las librerías del sistema necesarias

### 2. Instalación manual (alternativa)

Si prefieres instalar manualmente:

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Chromium y dependencias
sudo apt-get update
sudo apt-get install -y chromium-browser \
  libxss1 libgconf-2-4 libxrandr2 libasound2 \
  libpangocairo-1.0-0 libatk1.0-0 libcairo-gobject2 \
  libgtk-3-0 libgdk-pixbuf2.0-0 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 \
  libxi6 libxinerama1 libxtst6 libappindicator1 \
  libnss3 lsb-release xdg-utils fonts-liberation \
  libappindicator3-1 libatk-bridge2.0-0 libdrm2 \
  libnspr4 xvfb libgbm-dev libxshmfence1

# Instalar PM2 globalmente (opcional)
sudo npm install -g pm2
```

### 3. Configuración del proyecto

```bash
# Clonar o descargar el proyecto
cd /path/to/whatsapp-api

# Instalar dependencias de Node.js
npm install

# Configurar variables de entorno (opcional)
cp .env.example .env
nano .env  # Editar configuración si es necesario
```

### 4. Ejecutar la aplicación

#### Modo desarrollo:
```bash
node server.js
```

#### Modo producción con PM2:
```bash
# Iniciar con PM2
pm2 start server.js --name whatsapp-api

# Configurar para iniciar automáticamente
pm2 startup
pm2 save

# Ver logs
pm2 logs whatsapp-api

# Reiniciar
pm2 restart whatsapp-api

# Detener
pm2 stop whatsapp-api
```

## 🌐 Acceso a la aplicación

Una vez iniciada, accede a:
- **Interfaz web**: http://localhost:3000
- **API**: http://localhost:3000/api/
- **Health check**: http://localhost:3000/info

## 📚 Documentación API

### Autenticación

Todas las peticiones API requieren el header:
```
X-API-Key: whatsapp-api-key-2024
```

### Endpoints Principales

#### 🔹 Crear Nueva Sesión
```bash
POST /api/start-session
Content-Type: application/json

{
  "sessionId": "mi-sesion-01"
}
```

#### 🔹 Obtener Código QR
```bash
GET /api/qr/{sessionId}
```

#### 🔹 Estado de Sesión
```bash
GET /api/status/{sessionId}
```

#### 🔹 Listar Sesiones
```bash
GET /api/sessions
```

#### 🔹 Enviar Mensaje de Texto
```bash
POST /api/send-message
Content-Type: application/json

{
  "sessionId": "mi-sesion-01",
  "number": "5491123456789",
  "message": "¡Hola desde la API!"
}
```

#### 🔹 Enviar Archivo Multimedia
```bash
POST /api/send-media
Content-Type: multipart/form-data

sessionId: mi-sesion-01
number: 5491123456789
caption: Descripción del archivo
media: [archivo] // o mediaUrl / mediaBase64
```

#### 🔹 Obtener Mensajes
```bash
GET /api/messages/{sessionId}?limit=50
```

#### 🔹 Cerrar Sesión
```bash
POST /api/logout/{sessionId}
```

## 🖥️ Interfaz Web

La interfaz web está disponible en `http://localhost:3000` e incluye:

- **Panel de control**: Crear y gestionar sesiones
- **Visualización de QR**: Para vincular dispositivos
- **Chat de prueba**: Enviar mensajes directamente desde el navegador
- **Monitoreo en tiempo real**: Estado de conexiones y mensajes
- **Documentación integrada**: Ejemplos de uso de la API

## ⚙️ Configuración

### Variables de Entorno (.env)

```bash
PORT=3000                           # Puerto del servidor
API_KEY=whatsapp-api-key-2024      # Clave de autenticación
WEBHOOK_URL=http://example.com/webhook  # URL para reenviar mensajes (opcional)
NODE_ENV=production                 # Entorno de ejecución
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser  # Ruta de Chromium
SESSIONS_DIR=./sessions            # Directorio de sesiones
CACHE_DIR=./.wwebjs_cache         # Directorio de cache
AUTH_DIR=./.wwebjs_auth           # Directorio de autenticación
```

## 🔄 Webhooks

El sistema puede reenviar todos los mensajes recibidos a una URL webhook:

```bash
# Configurar webhook
POST /webhook/config
Content-Type: application/json

{
  "webhookUrl": "https://tu-servidor.com/webhook"
}
```

Los mensajes se envían en formato:
```json
{
  "id": "mensaje_id",
  "sessionId": "mi-sesion-01",
  "from": "5491123456789@c.us",
  "body": "Texto del mensaje",
  "type": "chat",
  "timestamp": 1640995200,
  "contact": {
    "name": "Juan Pérez", 
    "number": "5491123456789"
  },
  "media": {
    "mimetype": "image/jpeg",
    "data": "base64_data",
    "filename": "imagen.jpg"
  }
}
```

## 🛡️ Seguridad

- **Autenticación por API Key**: Protege todos los endpoints
- **Firewall**: Configura UFW para permitir solo el puerto 3000
- **Usuario dedicado**: Ejecuta la aplicación con usuario sin privilegios
- **Permisos de archivos**: Configuración automática de permisos

### Configuración básica de firewall:
```bash
sudo ufw allow 3000
sudo ufw enable
```

## 📊 Monitoreo

### Logs con PM2
```bash
# Ver logs en tiempo real
pm2 logs whatsapp-api

# Ver logs específicos
pm2 logs whatsapp-api --lines 100

# Monitoreo del sistema
pm2 monit
```

### Health Check
```bash
# Estado de salud
curl http://localhost:3000/info

# Health check de la API
curl -H "X-API-Key: whatsapp-api-key-2024" http://localhost:3000/api/health
```

## 🔧 Mantenimiento

### Backup de Sesiones
```bash
# Respaldar directorio de sesiones
tar -czf sessions-backup-$(date +%Y%m%d).tar.gz ./sessions ./.wwebjs_auth ./.wwebjs_cache
```

### Limpiar Sesiones
```bash
# Detener aplicación
pm2 stop whatsapp-api

# Limpiar sesiones
rm -rf ./sessions/* ./.wwebjs_auth/* ./.wwebjs_cache/*

# Reiniciar
pm2 restart whatsapp-api
```

### Actualizar Dependencias
```bash
# Actualizar paquetes npm
npm update

# Reinstalar módulos de Node.js (si hay problemas)
rm -rf node_modules package-lock.json
npm install
```

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de permisos en directorios**:
   ```bash
   sudo chown -R $USER:$USER ./sessions ./.wwebjs_auth ./.wwebjs_cache
   chmod -R 755 ./sessions ./.wwebjs_auth ./.wwebjs_cache
   ```

2. **Chromium no encontrado**:
   ```bash
   # Verificar instalación
   which chromium-browser
   
   # Reinstalar si es necesario
   sudo apt-get install --reinstall chromium-browser
   ```

3. **Puerto en uso**:
   ```bash
   # Verificar qué proceso usa el puerto 3000
   sudo lsof -i :3000
   
   # Cambiar puerto en .env
   PORT=3001
   ```

4. **Problemas de memoria**:
   ```bash
   # Aumentar memoria swap si es necesario
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Logs de Debug
```bash
# Ejecutar en modo debug
DEBUG=* node server.js

# O con PM2
pm2 start server.js --name whatsapp-api-debug -- --inspect
```

## 🚀 Inicio Rápido

Para usuarios experimentados:

```bash
# 1. Ejecutar instalación de dependencias
sudo bash install.sh

# 2. Instalar dependencias de Node.js
npm install

# 3. Iniciar aplicación
node server.js

# 4. Acceder a http://localhost:3000
```

## 📝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🤝 Soporte

Para soporte o preguntas:

- Crea un issue en GitHub
- Revisa la documentación en `/api/health`
- Verifica los logs de PM2

---

⚡ **¡Listo para usar!** Ejecuta `bash install.sh && npm install && node server.js` y comienza a gestionar múltiples instancias de WhatsApp Web.