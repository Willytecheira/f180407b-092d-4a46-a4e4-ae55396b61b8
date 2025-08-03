# 🚀 INSTRUCCIONES DE IMPORTACIÓN DESDE GITHUB

## Información del Proyecto
- **Repositorio**: https://github.com/Willytecheira/f180407b-092d-4a46-a4e4-ae55396b61b8
- **Servidor**: docker.website
- **SSL**: Habilitado con certificados válidos
- **API Key**: whatsapp-api-key-2024

## ⚡ Importación Rápida

### Opción 1: Script Maestro (Recomendado)
```bash
# Desde cualquier directorio en el servidor
bash import-from-github.sh
```

### Opción 2: Importación Manual Completa
```bash
# Conectar al servidor
ssh root@docker.website

# Ejecutar importación específica
cd /root
bash whatsapp-api/scripts/import-from-github.sh
```

### Opción 3: Para Instalación Existente
```bash
# Si ya tienes el proyecto clonado
cd /root/whatsapp-api
bash scripts/git-update.sh
```

## 🔧 Lo que Hace la Importación

### 1. **Verificación del Sistema**
- ✅ Node.js, npm, Git, PM2, Nginx
- ✅ Certificados SSL para docker.website
- ✅ Permisos y directorios

### 2. **Backup y Seguridad**
- 💾 Backup completo de datos existentes
- 🔒 Preservación de sesiones WhatsApp activas
- 📁 Respaldo de archivos críticos

### 3. **Clonado y Configuración**
- 📥 Clone desde GitHub
- ⚙️ Configuración automática para docker.website
- 🔗 Vinculación con repositorio para futuras actualizaciones

### 4. **Instalación y Despliegue**
- 📦 Instalación de dependencias
- 🌐 Configuración de Nginx con SSL
- 🚀 Inicio con PM2 y auto-arranque

### 5. **Restauración de Datos**
- 🔄 Restauración de sesiones WhatsApp
- 📄 Restauración de archivos subidos
- 🗃️ Restauración de configuraciones

### 6. **Verificación Completa**
- ✅ Prueba de endpoints API
- ✅ Verificación de dashboard
- ✅ Comprobación de SSL/HTTPS
- ✅ Validación de PM2

## 🌐 URLs Después de la Importación

- **API Principal**: https://docker.website
- **Dashboard**: https://docker.website/dashboard
- **Panel Admin**: https://docker.website/admin
- **Health Check**: https://docker.website/api/health
- **Información**: https://docker.website/info

## 🔑 Configuración

### Variables de Entorno (.env)
```env
PORT=3000
API_KEY=whatsapp-api-key-2024
SERVER_IP=https://docker.website
NODE_ENV=production
DISABLE_HTTPS=false
FORCE_HTTP=false
SESSIONS_DIR=./sessions
CACHE_DIR=./.wwebjs_cache
AUTH_DIR=./.wwebjs_auth
```

### PM2 Ecosystem
```javascript
{
  name: 'whatsapp-api',
  script: 'server.js',
  cwd: '/root/whatsapp-api',
  instances: 1,
  env: {
    NODE_ENV: 'production',
    PORT: 3000,
    SERVER_IP: 'https://docker.website'
  }
}
```

## 🛠️ Comandos Post-Importación

### Gestión PM2
```bash
pm2 status                    # Ver estado
pm2 logs whatsapp-api        # Ver logs
pm2 restart whatsapp-api     # Reiniciar
pm2 monit                    # Monitor en tiempo real
```

### Actualizaciones Futuras
```bash
cd /root/whatsapp-api
bash scripts/git-update.sh   # Actualizar desde GitHub
```

### Backup y Mantenimiento
```bash
bash scripts/complete-backup.sh    # Backup completo
bash scripts/post-install-verify.sh # Verificación
```

## 🔍 Solución de Problemas

### Si la Importación Falla
1. **Verificar prerequisitos**:
   ```bash
   node --version
   npm --version
   git --version
   pm2 --version
   nginx -t
   ```

2. **Verificar certificados SSL**:
   ```bash
   ls -la /etc/ssl/dockerwebsite/
   ```

3. **Logs de error**:
   ```bash
   pm2 logs whatsapp-api --lines 50
   tail -f /var/log/nginx/error.log
   ```

### Estado del Sistema
```bash
# Verificar todos los servicios
systemctl status nginx
pm2 status
curl -I https://docker.website
```

## 📋 Checklist Post-Importación

- [ ] ✅ Aplicación responde en https://docker.website
- [ ] ✅ Dashboard muestra datos reales
- [ ] ✅ API endpoints funcionan con API Key
- [ ] ✅ PM2 muestra proceso online
- [ ] ✅ SSL certificados válidos
- [ ] ✅ Nginx configurado correctamente
- [ ] ✅ Sesiones WhatsApp preservadas
- [ ] ✅ Logs funcionando correctamente

## 🎯 Resultado Final

**Sistema 100% funcional** con:
- 🌐 WhatsApp API en https://docker.website
- 🔒 SSL habilitado y configurado
- 📊 Dashboard operativo
- 🔧 PM2 gestionando procesos
- 📡 Nginx proxy configurado
- 🔄 Git sincronizado para actualizaciones
- 💾 Backups automáticos configurados

---

**¡Tu WhatsApp API está lista para usar en producción!** 🚀