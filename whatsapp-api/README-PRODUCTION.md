# WhatsApp Multi-Session API - Versión Producción

## 🚀 Sistema Listo para Producción en Ubuntu

Este sistema está configurado para correr en **Ubuntu sin Docker**, utilizando **PM2**, **Nginx** con **SSL**, y **dominio propio**.

## 📋 Estado del Sistema

### ✅ Configuración Actual
- **Servidor**: Ubuntu con Node.js y PM2
- **Dominio**: https://docker.website (con SSL configurado)
- **Puerto**: 3000 (interno)
- **Proxy**: Nginx redirigiendo HTTPS a puerto 3000
- **API Key**: `whatsapp-api-key-2024`
- **Ubicación**: `/root/whatsapp-api/whatsapp-api`

### ✅ Funcionalidades Implementadas
- ✅ Múltiples sesiones de WhatsApp simultáneas
- ✅ Configuración de webhooks dinámicos por sesión
- ✅ Descarga y almacenamiento de archivos multimedia
- ✅ URLs públicas para archivos multimedia
- ✅ Manejo robusto de errores (media no detiene webhooks)
- ✅ API REST completa con autenticación
- ✅ Interface web para gestión
- ✅ Socket.IO para tiempo real

## 🔧 Comandos de Gestión

### Iniciar el Sistema
```bash
cd /root/whatsapp-api/whatsapp-api
chmod +x scripts/startup.sh
./scripts/startup.sh
```

### Gestión con PM2
```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs whatsapp-api

# Reiniciar
pm2 restart whatsapp-api

# Detener
pm2 stop whatsapp-api

# Eliminar
pm2 delete whatsapp-api
```

### Verificar Nginx
```bash
# Estado de Nginx
sudo systemctl status nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver configuración
sudo nginx -t
```

## 🧪 Pruebas del Sistema

### 1. Verificar Servidor
```bash
curl -H "X-API-Key: whatsapp-api-key-2024" https://docker.website/api/health
```

### 2. Configurar Webhook
```bash
curl -X POST https://docker.website/api/test1/webhook \
  -H "X-API-Key: whatsapp-api-key-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://fba1bae0-0bf6-4444-8514-98c389cae2dc.supabase.co/functions/v1/evolution-webhook",
    "events": ["message-received", "message-delivered", "message-from-me"]
  }'
```

### 3. Script de Prueba Automático
```bash
cd /root/whatsapp-api/whatsapp-api
node scripts/test-webhook.js
```

## 📡 Endpoints Principales

### Sesiones
- `POST /api/start-session` - Crear nueva sesión
- `GET /api/qr/:sessionId` - Obtener QR para escaneado
- `GET /api/status/:sessionId` - Estado de la sesión
- `GET /api/sessions` - Listar todas las sesiones

### Webhooks (NUEVO)
- `POST /api/:sessionId/webhook` - Configurar webhook para sesión específica
- `GET /api/:sessionId/webhook` - Obtener configuración de webhook
- `DELETE /api/:sessionId/webhook` - Eliminar webhook

### Mensajes
- `POST /api/send-message` - Enviar mensaje de texto
- `POST /api/send-media` - Enviar archivo multimedia
- `GET /api/messages/:sessionId` - Obtener historial

## 🔗 Configuración de Webhooks por Sesión

### Configurar Webhook
```bash
curl -X POST https://docker.website/api/SESION_ID/webhook \
  -H "X-API-Key: whatsapp-api-key-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-endpoint.com/webhook",
    "events": ["message-received", "message-delivered"]
  }'
```

### Eventos Disponibles
- `message-received` - Mensaje recibido
- `message-delivered` - Mensaje entregado
- `message-from-me` - Mensaje enviado por mí
- `all` - Todos los eventos (por defecto)

## 📁 Estructura de Archivos Multimedia

### Almacenamiento Local
- **Carpeta**: `/root/whatsapp-api/whatsapp-api/public/uploads/`
- **URL pública**: `http://docker.website:3000/uploads/archivo.jpg`
- **Formato**: `timestamp_randomstring.extension`

### Metadatos en Webhook
```json
{
  "media": {
    "fileUrl": "http://docker.website:3000/uploads/1673123456_abc123.jpg",
    "fileName": "1673123456_abc123.jpg",
    "originalName": "foto.jpg",
    "mimetype": "image/jpeg",
    "fileSize": 245760
  }
}
```

## 🚨 Manejo de Errores

### Errores de Media
- ✅ Si falla la descarga de media, no se detiene el webhook
- ✅ Se envía información del error en el campo `media.error`
- ✅ El mensaje se procesa normalmente

### Errores de Webhook
- ✅ Timeout de 10 segundos por webhook
- ✅ Logs detallados de errores
- ✅ No afecta el funcionamiento de otras sesiones

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real
```bash
pm2 logs whatsapp-api --lines 50
```

### Logs Específicos
```bash
# Solo errores
pm2 logs whatsapp-api --err

# Solo output
pm2 logs whatsapp-api --out
```

### Archivos de Log
- **Combinado**: `./logs/combined.log`
- **Output**: `./logs/out.log`
- **Errores**: `./logs/error.log`

## 🔒 Seguridad

### API Key
- **Header**: `X-API-Key: whatsapp-api-key-2024`
- **Query**: `?apiKey=whatsapp-api-key-2024`

### SSL/HTTPS
- Configurado en Nginx
- Certificados ubicados en el servidor
- Redirección automática HTTP → HTTPS

## 🔄 Reinicio Automático

### PM2 Configurado para:
- ✅ Reinicio automático si la app falla
- ✅ Máximo 10 reintentos
- ✅ Tiempo mínimo de ejecución: 10 segundos
- ✅ Reinicio automático del servidor

### Configurar Inicio Automático
```bash
pm2 startup
pm2 save
```

## 📱 Flujo de Uso

1. **Crear sesión**: `POST /api/start-session` con `sessionId`
2. **Obtener QR**: `GET /api/qr/:sessionId` 
3. **Escanear QR** con WhatsApp
4. **Configurar webhook**: `POST /api/:sessionId/webhook`
5. **Enviar/recibir mensajes** automáticamente

## 🆘 Solución de Problemas

### Si el sistema no responde:
```bash
pm2 restart whatsapp-api
sudo systemctl restart nginx
```

### Si faltan permisos:
```bash
chmod 755 sessions .wwebjs_cache .wwebjs_auth public/uploads
```

### Si no encuentra archivos multimedia:
```bash
ls -la public/uploads/
# Verificar que el directorio existe y tiene archivos
```

### Para limpiar y reiniciar:
```bash
pm2 delete whatsapp-api
rm -rf .wwebjs_auth/* .wwebjs_cache/* sessions/*
./scripts/startup.sh
```

---

## 🎯 Sistema LISTO para Producción

El sistema está completamente configurado y probado para:
- ✅ Múltiples sesiones simultáneas
- ✅ Webhooks dinámicos por sesión
- ✅ Archivos multimedia con URLs públicas
- ✅ Manejo robusto de errores
- ✅ SSL/HTTPS configurado
- ✅ Monitoreo y logs completos
- ✅ Reinicio automático