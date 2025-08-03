#!/bin/bash

echo "🚀 IMPORTANDO PROYECTO DESDE GITHUB A DOCKER.WEBSITE"
echo "===================================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración del repositorio
REPO_URL="https://github.com/Willytecheira/f180407b-092d-4a46-a4e4-ae55396b61b8.git"
PROJECT_DIR="/root/whatsapp-api"
BACKUP_DIR="/root/backups/pre-import-$(date +%Y%m%d_%H%M%S)"

# Función para verificar éxito de comandos
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error en: $1${NC}"
        exit 1
    fi
}

echo -e "${BLUE}📋 Configuración de importación:${NC}"
echo "  🔗 Repositorio: $REPO_URL"
echo "  📁 Directorio: $PROJECT_DIR"
echo "  🌐 Dominio: docker.website"
echo "  🔒 SSL: Habilitado"
echo ""

# Verificar prerrequisitos del sistema
echo -e "${YELLOW}🔍 Verificando prerrequisitos del sistema...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi

# Verificar Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git no está instalado${NC}"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    npm install -g pm2
    check_success "Instalación de PM2"
fi

# Verificar Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Nginx no está instalado${NC}"
    exit 1
fi

# Verificar certificados SSL
echo -e "${YELLOW}🔒 Verificando certificados SSL...${NC}"
if [ ! -f "/etc/ssl/dockerwebsite/docker.website.crt" ] || [ ! -f "/etc/ssl/dockerwebsite/docker.website.key" ]; then
    echo -e "${RED}❌ Certificados SSL no encontrados${NC}"
    echo "  Esperados en:"
    echo "  - /etc/ssl/dockerwebsite/docker.website.crt"
    echo "  - /etc/ssl/dockerwebsite/docker.website.key"
    exit 1
else
    echo -e "${GREEN}✅ Certificados SSL encontrados${NC}"
fi

# Crear backup si el directorio ya existe
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}💾 Creando backup de instalación existente...${NC}"
    mkdir -p $(dirname "$BACKUP_DIR")
    cp -r "$PROJECT_DIR" "$BACKUP_DIR"
    check_success "Backup de datos existentes"
fi

# Detener servicios existentes
echo -e "${YELLOW}🛑 Deteniendo servicios existentes...${NC}"
pm2 delete whatsapp-api 2>/dev/null || true
pm2 flush 2>/dev/null || true

# Eliminar directorio existente
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}🗑️ Eliminando instalación anterior...${NC}"
    rm -rf "$PROJECT_DIR"
fi

# Clonar repositorio desde GitHub
echo -e "${YELLOW}📥 Clonando repositorio desde GitHub...${NC}"
git clone "$REPO_URL" "$PROJECT_DIR"
check_success "Clonado del repositorio"

# Navegar al directorio del proyecto
cd "$PROJECT_DIR"

# Configurar Git
echo -e "${YELLOW}⚙️ Configurando Git...${NC}"
git config user.name "WhatsApp API Server" 2>/dev/null || true
git config user.email "admin@docker.website" 2>/dev/null || true
git remote set-url origin "$REPO_URL"
check_success "Configuración de Git"

# Crear archivo .env específico para docker.website
echo -e "${YELLOW}📝 Configurando variables de entorno para docker.website...${NC}"
cat > .env << EOF
# Puerto del servidor
PORT=3000

# API Key para autenticación
API_KEY=whatsapp-api-key-2024

# URL para webhook (opcional)
# WEBHOOK_URL=https://docker.website/webhook

# IP del servidor para generar URLs de archivos multimedia
SERVER_IP=https://docker.website

# Entorno de ejecución
NODE_ENV=production

# Configuración de Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

# Configuración de sesiones
SESSIONS_DIR=./sessions
CACHE_DIR=./.wwebjs_cache
AUTH_DIR=./.wwebjs_auth

# Configuración de red (con HTTPS en producción)
DISABLE_HTTPS=false
FORCE_HTTP=false
EOF
check_success "Configuración de variables de entorno"

# Instalar dependencias
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm install
check_success "Instalación de dependencias"

# Crear directorios necesarios
echo -e "${YELLOW}📁 Creando directorios necesarios...${NC}"
mkdir -p sessions .wwebjs_cache .wwebjs_auth public/uploads logs backups
check_success "Creación de directorios"

# Configurar permisos
echo -e "${YELLOW}🔧 Configurando permisos...${NC}"
chmod 755 sessions .wwebjs_cache .wwebjs_auth public/uploads logs backups
chmod +x scripts/*.sh 2>/dev/null || true
chmod 644 .env
check_success "Configuración de permisos"

# Restaurar datos críticos del backup si existe
if [ -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}🔄 Restaurando datos críticos del backup...${NC}"
    
    # Restaurar sesiones
    if [ -d "$BACKUP_DIR/sessions" ]; then
        cp -r "$BACKUP_DIR/sessions"/* sessions/ 2>/dev/null || true
        echo -e "${GREEN}✅ Sesiones restauradas${NC}"
    fi
    
    # Restaurar archivos auth
    if [ -d "$BACKUP_DIR/.wwebjs_auth" ]; then
        cp -r "$BACKUP_DIR/.wwebjs_auth"/* .wwebjs_auth/ 2>/dev/null || true
        echo -e "${GREEN}✅ Archivos de autenticación restaurados${NC}"
    fi
    
    # Restaurar cache
    if [ -d "$BACKUP_DIR/.wwebjs_cache" ]; then
        cp -r "$BACKUP_DIR/.wwebjs_cache"/* .wwebjs_cache/ 2>/dev/null || true
        echo -e "${GREEN}✅ Cache restaurado${NC}"
    fi
    
    # Restaurar uploads
    if [ -d "$BACKUP_DIR/public/uploads" ]; then
        cp -r "$BACKUP_DIR/public/uploads"/* public/uploads/ 2>/dev/null || true
        echo -e "${GREEN}✅ Archivos subidos restaurados${NC}"
    fi
fi

# Configurar Nginx
echo -e "${YELLOW}🌐 Configurando Nginx...${NC}"
if [ -f "nginx.conf" ]; then
    sudo cp nginx.conf /etc/nginx/sites-available/whatsapp-api
    sudo ln -sf /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Verificar configuración de Nginx
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        check_success "Configuración de Nginx"
    else
        echo -e "${RED}❌ Error en la configuración de Nginx${NC}"
        exit 1
    fi
fi

# Iniciar aplicación con PM2
echo -e "${YELLOW}🚀 Iniciando aplicación con PM2...${NC}"
pm2 start ecosystem.config.js
check_success "Inicio de la aplicación"

# Guardar configuración PM2
pm2 save
pm2 startup

# Verificar que la aplicación esté funcionando
echo -e "${YELLOW}🔍 Verificando funcionamiento...${NC}"
sleep 5

# Verificar PM2
if pm2 status | grep -q "whatsapp-api.*online"; then
    echo -e "${GREEN}✅ Aplicación ejecutándose en PM2${NC}"
else
    echo -e "${RED}❌ Error: Aplicación no está en línea en PM2${NC}"
    pm2 logs whatsapp-api --lines 20
    exit 1
fi

# Verificar servidor local
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "200\|302"; then
    echo -e "${GREEN}✅ Servidor local respondiendo${NC}"
else
    echo -e "${RED}❌ Error: Servidor local no responde${NC}"
    exit 1
fi

# Ejecutar verificación post-instalación si existe
if [ -f "scripts/post-install-verify.sh" ]; then
    echo -e "${YELLOW}🔍 Ejecutando verificación post-instalación...${NC}"
    bash scripts/post-install-verify.sh
fi

echo ""
echo -e "${GREEN}🎉 ¡IMPORTACIÓN COMPLETADA EXITOSAMENTE!${NC}"
echo "=============================================="
echo ""
echo -e "${GREEN}🌐 Tu WhatsApp API está disponible en: https://docker.website${NC}"
echo -e "${GREEN}🔑 API Key: whatsapp-api-key-2024${NC}"
echo -e "${GREEN}🔒 SSL: Habilitado${NC}"
echo -e "${GREEN}📊 Dashboard: https://docker.website/dashboard${NC}"
echo -e "${GREEN}🔧 Admin: https://docker.website/admin${NC}"
echo ""
echo -e "${BLUE}📋 Información del sistema:${NC}"
echo "  📁 Directorio: $PROJECT_DIR"
echo "  💾 Backup: $BACKUP_DIR"
echo "  🔗 Repositorio: $REPO_URL"
echo ""
echo -e "${YELLOW}📊 Estado actual:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}📋 Comandos útiles:${NC}"
echo "  🔍 Ver logs: pm2 logs whatsapp-api"
echo "  🔄 Reiniciar: pm2 restart whatsapp-api"
echo "  📊 Monitorear: pm2 monit"
echo "  🔄 Actualizar: bash scripts/git-update.sh"
echo ""
echo -e "${GREEN}✅ Sistema importado y funcionando correctamente${NC}"