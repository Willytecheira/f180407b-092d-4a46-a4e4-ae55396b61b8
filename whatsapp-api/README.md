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
- **Docker Ready**: Configuración completa para despliegue con Docker

## 📋 Requisitos

- Node.js 16+ o Docker
- 2GB+ RAM disponible
- Conexión a internet estable

## 🛠️ Instalación y Uso

### Con Docker (Recomendado)

1. **Clona o crea el proyecto**:
```bash
mkdir whatsapp-api && cd whatsapp-api
# Copia todos los archivos del proyecto aquí
```

2. **Ejecuta con Docker Compose**:
```bash
docker compose up -d
```

3. **Accede a la aplicación**:
   - Interfaz web: http://localhost:3000
   - API: http://localhost:3000/api/

### Instalación Manual

1. **Instala dependencias**:
```bash
npm install
```

2. **Configura variables de entorno** (opcional):
```bash
cp .env.example .env
# Edita .env con tus configuraciones
```

3. **Inicia el servidor**:
```bash
npm start
```

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

### Variables de Entorno

```bash
PORT=3000                           # Puerto del servidor
API_KEY=whatsapp-api-key-2024      # Clave de autenticación
WEBHOOK_URL=http://example.com/webhook  # URL para reenviar mensajes (opcional)
NODE_ENV=production                 # Entorno de ejecución
```

### Docker Compose Personalizado

Puedes modificar `docker-compose.yml` para:

- Cambiar puertos de acceso
- Configurar webhook URL
- Añadir volúmenes adicionales
- Integrar con bases de datos

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
- **Rate limiting**: Previene abuso de la API
- **Validación de entrada**: Sanitiza todos los datos recibidos
- **Ejecutión sin privilegios**: El contenedor Docker no usa root

## 📊 Monitoreo

### Logs
```bash
# Ver logs del contenedor
docker compose logs -f whatsapp-api

# Logs en tiempo real
docker compose logs -f --tail=100 whatsapp-api
```

### Health Check
```bash
# Estado de salud
curl http://localhost:3000/info

# Health check del contenedor
docker compose exec whatsapp-api curl http://localhost:3000/api/health
```

## 🔧 Mantenimiento

### Backup de Sesiones
```bash
# Respaldar directorio de sesiones
tar -czf sessions-backup-$(date +%Y%m%d).tar.gz ./sessions
```

### Limpiar Sesiones
```bash
# Detener contenedores
docker compose down

# Limpiar sesiones
rm -rf ./sessions/*

# Reiniciar
docker compose up -d
```

### Actualizar
```bash
# Reconstruir imagen
docker compose build --no-cache

# Reiniciar con nueva imagen
docker compose up -d
```

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a WhatsApp**:
   - Verifica que el código QR se haya escaneado correctamente
   - Asegúrate de tener conexión a internet estable

2. **Sesión se desconecta constantemente**:
   - Revisa que el volumen de sesiones esté montado correctamente
   - Verifica que no hay otra instancia de WhatsApp Web activa

3. **Error de memoria**:
   - Aumenta la RAM disponible para Docker
   - Reduce el número de sesiones simultáneas

### Logs de Debug
```bash
# Habilitar logs detallados
docker compose exec whatsapp-api npm run dev
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
- Verifica los logs del contenedor

---

⚡ **¡Listo para usar!** Ejecuta `docker compose up -d` y comienza a gestionar múltiples instancias de WhatsApp Web.