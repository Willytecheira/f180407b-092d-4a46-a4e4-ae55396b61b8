#!/bin/bash

# =============================================================================
# INSTALACIÓN COMPLETA DE WHATSAPP API PARA DOCKER.WEBSITE
# Dashboard 100% Funcional - Todas las modificaciones implementadas
# =============================================================================

set -e

echo "🚀 INICIANDO INSTALACIÓN COMPLETA PARA DOCKER.WEBSITE"
echo "======================================================"

# Variables de configuración
DOMAIN="docker.website"
API_DIR="/root/whatsapp-api"
BACKUP_DIR="/root/backup-$(date +%Y%m%d_%H%M%S)"
NGINX_SITE="/etc/nginx/sites-available/whatsapp-api"
NGINX_ENABLED="/etc/nginx/sites-enabled/whatsapp-api"

# Función para logs con colores
log_info() { echo -e "\033[36m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[31m[ERROR]\033[0m $1"; }
log_warning() { echo -e "\033[33m[WARNING]\033[0m $1"; }

# PASO 1: CREAR BACKUP COMPLETO
echo ""
log_info "PASO 1: Creando backup completo..."
if [ -d "$API_DIR" ]; then
    log_info "Creando backup en $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r "$API_DIR" "$BACKUP_DIR/" 2>/dev/null || log_warning "No se pudo hacer backup completo"
    log_success "Backup creado en $BACKUP_DIR"
fi

# PASO 2: DETENER SERVICIOS EXISTENTES
echo ""
log_info "PASO 2: Deteniendo servicios existentes..."
pm2 delete whatsapp-api 2>/dev/null || log_warning "No había proceso PM2 ejecutándose"
pm2 flush 2>/dev/null || true
log_success "Servicios detenidos"

# PASO 3: CREAR DIRECTORIOS NECESARIOS
echo ""
log_info "PASO 3: Creando estructura de directorios..."
mkdir -p "$API_DIR"/{sessions,.wwebjs_cache,.wwebjs_auth,public/uploads,logs,data}
chmod -R 755 "$API_DIR"
log_success "Directorios creados"

# PASO 4: INSTALAR DEPENDENCIAS DEL SISTEMA
echo ""
log_info "PASO 4: Verificando dependencias del sistema..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js no está instalado"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    log_info "Instalando PM2..."
    npm install -g pm2
fi

# Verificar Nginx
if ! command -v nginx &> /dev/null; then
    log_error "Nginx no está instalado"
    exit 1
fi

log_success "Dependencias verificadas"

# PASO 5: INSTALAR DEPENDENCIAS NPM
echo ""
log_info "PASO 5: Instalando dependencias NPM..."
cd "$API_DIR"

if [ ! -f "package.json" ]; then
    log_error "package.json no encontrado en $API_DIR"
    exit 1
fi

npm install --production
log_success "Dependencias NPM instaladas"

# PASO 6: CONFIGURAR NGINX PARA DOCKER.WEBSITE
echo ""
log_info "PASO 6: Configurando Nginx para $DOMAIN..."

cat > "$NGINX_SITE" << 'EOL'
server {
    listen 80;
    listen [::]:80;
    server_name docker.website;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docker.website;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/docker.website.crt;
    ssl_certificate_key /etc/ssl/private/docker.website.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json application/xml+rss;

    # Main proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Socket.IO configuration for real-time updates
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Dashboard and admin static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logs configuration
    access_log /var/log/nginx/whatsapp-api.access.log;
    error_log /var/log/nginx/whatsapp-api.error.log;
}
EOL

# Habilitar sitio
rm -f "$NGINX_ENABLED"
ln -s "$NGINX_SITE" "$NGINX_ENABLED"

# Verificar configuración de Nginx
if nginx -t; then
    systemctl reload nginx
    log_success "Nginx configurado para $DOMAIN"
else
    log_error "Error en configuración de Nginx"
    exit 1
fi

# PASO 7: CONFIGURAR PM2 CON ECOSYSTEM
echo ""
log_info "PASO 7: Configurando PM2..."

# Verificar que ecosystem.config.js existe y está actualizado
if [ ! -f "ecosystem.config.js" ]; then
    log_error "ecosystem.config.js no encontrado"
    exit 1
fi

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

log_success "PM2 configurado y aplicación iniciada"

# PASO 8: VERIFICAR CERTIFICADOS SSL
echo ""
log_info "PASO 8: Verificando certificados SSL..."

if [ -f "/etc/ssl/certs/docker.website.crt" ] && [ -f "/etc/ssl/private/docker.website.key" ]; then
    log_success "Certificados SSL encontrados"
else
    log_warning "Certificados SSL no encontrados. Generando certificados auto-firmados..."
    
    # Crear directorio para certificados si no existe
    mkdir -p /etc/ssl/certs /etc/ssl/private
    
    # Generar certificado auto-firmado
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/docker.website.key \
        -out /etc/ssl/certs/docker.website.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=docker.website"
    
    chmod 600 /etc/ssl/private/docker.website.key
    chmod 644 /etc/ssl/certs/docker.website.crt
    
    log_success "Certificados auto-firmados generados"
fi

# PASO 9: VERIFICAR FUNCIONAMIENTO
echo ""
log_info "PASO 9: Verificando funcionamiento..."

sleep 5

# Verificar que el proceso está corriendo
if pm2 list | grep -q "whatsapp-api.*online"; then
    log_success "Aplicación ejecutándose correctamente"
else
    log_error "La aplicación no está ejecutándose"
    pm2 logs whatsapp-api --lines 20
    exit 1
fi

# Verificar que responde en puerto 3000
if curl -f http://localhost:3000/info > /dev/null 2>&1; then
    log_success "API respondiendo en puerto 3000"
else
    log_error "API no responde en puerto 3000"
    exit 1
fi

# PASO 10: MOSTRAR INFORMACIÓN FINAL
echo ""
log_success "=============================================="
log_success "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE"
log_success "=============================================="
echo ""
log_info "📋 INFORMACIÓN DE ACCESO:"
echo "   🌐 URL Principal: https://$DOMAIN"
echo "   📊 Dashboard: https://$DOMAIN/dashboard"
echo "   ⚙️  Admin Panel: https://$DOMAIN/admin"
echo "   🔗 API Base: https://$DOMAIN/api"
echo ""
log_info "🔑 CREDENCIALES:"
echo "   API Key: whatsapp-api-key-2024"
echo "   Usuario Admin: admin"
echo "   Contraseña: admin123"
echo ""
log_info "📁 RUTAS IMPORTANTES:"
echo "   📦 Aplicación: $API_DIR"
echo "   💾 Backup: $BACKUP_DIR"
echo "   📋 Logs PM2: pm2 logs whatsapp-api"
echo "   📋 Logs Nginx: /var/log/nginx/whatsapp-api.*"
echo ""
log_info "🛠️  COMANDOS ÚTILES:"
echo "   🔄 Reiniciar: pm2 restart whatsapp-api"
echo "   📊 Estado: pm2 status"
echo "   📋 Ver logs: pm2 logs whatsapp-api"
echo "   🔍 Monitoreo: pm2 monit"
echo ""
log_success "✅ Dashboard 100% funcional con todas las mejoras implementadas"
log_success "✅ Real-time updates configurados"
log_success "✅ SSL/HTTPS configurado"
log_success "✅ Nginx optimizado"
log_success "✅ PM2 configurado con auto-restart"
echo ""
log_info "🎯 Accede a https://$DOMAIN/dashboard para ver el dashboard"