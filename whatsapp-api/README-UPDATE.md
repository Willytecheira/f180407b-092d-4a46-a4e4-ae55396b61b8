# 🔄 Guía de Actualización WhatsApp Multi-Session API

## 📋 Resumen

Esta guía explica cómo actualizar de manera segura la aplicación WhatsApp API desde GitHub sin perder datos críticos como sesiones activas, webhooks configurados, o archivos subidos.

## 🔒 Datos Protegidos

Los siguientes datos se preservan durante las actualizaciones:

- **Sesiones WhatsApp**: `sessions/`, `.wwebjs_auth/`, `.wwebjs_cache/`
- **Uploads**: `public/uploads/`
- **Configuración**: `.env`, `ecosystem.config.js`
- **Webhooks**: `data/webhooks.json`
- **Logs**: `logs/`
- **SSL**: `ssl/` (certificados)

## 🚀 Proceso de Actualización

### Método 1: Actualización Automática (Recomendado)

```bash
# Ejecutar script de actualización automática
bash scripts/git-update.sh
```

Este script hace automáticamente:
1. ✅ Backup de datos críticos
2. 📡 Pull desde GitHub
3. 📦 Actualización de dependencias
4. 🔄 Reinicio con PM2
5. 🔍 Verificación post-actualización

### Método 2: Actualización Manual

```bash
# 1. Crear backup
bash scripts/backup-data.sh

# 2. Actualizar código desde GitHub
git pull origin main

# 3. Restaurar datos críticos
bash scripts/restore-data.sh

# 4. Actualizar dependencias
npm install

# 5. Reiniciar aplicación
pm2 restart whatsapp-api

# 6. Verificar funcionamiento
bash scripts/verify-update.sh
```

## 📁 Scripts Disponibles

### `git-update.sh`
Script principal de actualización automática desde GitHub.

```bash
bash scripts/git-update.sh
```

### `backup-data.sh`
Crea backup de todos los datos críticos.

```bash
bash scripts/backup-data.sh
```

### `restore-data.sh`
Restaura datos desde el backup más reciente o uno específico.

```bash
# Usar backup más reciente
bash scripts/restore-data.sh

# Usar backup específico
bash scripts/restore-data.sh 20241223_143022.tar.gz
```

### `verify-update.sh`
Verifica que la actualización fue exitosa.

```bash
bash scripts/verify-update.sh
```

### `rollback.sh`
Revierte cambios en caso de problemas.

```bash
bash scripts/rollback.sh
```

## 🔧 Verificaciones Post-Actualización

El script de verificación comprueba:

1. ✅ Estado de PM2
2. 🌐 Respuesta del servidor
3. 🔗 API Health endpoint
4. 📊 Información del servidor
5. 👥 Sesiones activas
6. 🔗 Webhooks configurados
7. 📁 Directorios críticos
8. ⚙️ Archivos de configuración
9. 📦 Dependencias
10. 📝 Logs recientes

## 🆘 Troubleshooting

### Problemas Comunes

#### La aplicación no inicia después de la actualización

```bash
# Verificar logs de PM2
pm2 logs whatsapp-api

# Verificar estado
pm2 status

# Reiniciar aplicación
pm2 restart whatsapp-api
```

#### Sesiones perdidas

```bash
# Restaurar desde backup
bash scripts/restore-data.sh

# Reiniciar aplicación
pm2 restart whatsapp-api
```

#### Webhooks no funcionan

```bash
# Verificar webhooks configurados
curl -H "Authorization: Bearer whatsapp-api-key-2024" \
     https://docker.website/api/webhooks

# Restaurar configuración de webhooks
bash scripts/restore-data.sh
```

#### Dependencias rotas

```bash
# Limpiar e instalar dependencias
rm -rf node_modules package-lock.json
npm install
pm2 restart whatsapp-api
```

### Rollback Completo

Si todo falla, puedes hacer rollback completo:

```bash
bash scripts/rollback.sh
```

Opciones de rollback:
1. **Git rollback**: Vuelve al commit anterior
2. **Backup rollback**: Restaura datos desde backup
3. **Rollback completo**: Git + backup
4. **Cancelar**: Salir sin cambios

## 📊 Monitoreo

### Comandos Útiles

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs whatsapp-api

# Ver logs de errores
pm2 logs whatsapp-api --err

# Reiniciar aplicación
pm2 restart whatsapp-api

# Recargar aplicación (sin downtime)
pm2 reload whatsapp-api

# Ver información del proceso
pm2 show whatsapp-api
```

### URLs de Verificación

- **Web Principal**: https://docker.website
- **Panel Admin**: https://docker.website/admin
- **API Health**: https://docker.website/api/health
- **Info del Servidor**: https://docker.website/info

## 🔐 Seguridad

- Los backups incluyen timestamp para fácil identificación
- Se mantienen los últimos 5 backups automáticamente
- Los datos sensibles en `.env` se preservan
- Los certificados SSL se mantienen intactos

## 📝 Logs de Actualización

Cada actualización genera logs en:

- **PM2 Logs**: Accesibles con `pm2 logs whatsapp-api`
- **Backup Info**: `backups/[timestamp]/backup_info.txt`
- **Update Logs**: Salida del script de actualización

## 🎯 Mejores Prácticas

1. **Siempre hacer backup** antes de actualizar
2. **Verificar el estado** después de cada actualización
3. **Monitorear logs** por unos minutos post-actualización
4. **Probar funcionalidades críticas** (envío de mensajes, webhooks)
5. **Mantener backups recientes** en caso de rollback

## 📞 Soporte

Si encuentras problemas durante la actualización:

1. 🔍 Revisa los logs: `pm2 logs whatsapp-api`
2. ✅ Ejecuta verificación: `bash scripts/verify-update.sh`
3. 🔄 Si es necesario, haz rollback: `bash scripts/rollback.sh`
4. 📝 Documenta el error para análisis

---

**¡Importante!** Siempre prueba las actualizaciones en un ambiente de desarrollo antes de aplicarlas en producción.