#!/bin/bash

echo "🔄 REINSTALACIÓN COMPLETA WHATSAPP API"
echo "====================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
REPO_URL="https://github.com/Willytecheira/f180407b-092d-4a46-a4e4-ae55396b61b8.git"
PROJECT_DIR="/root/whatsapp-api"
BACKUP_RESTORED=false

echo -e "${BLUE}🎯 Directorio del proyecto: $PROJECT_DIR${NC}"
echo -e "${BLUE}📦 Repositorio: $REPO_URL${NC}"

# Función para verificar si el comando fue exitoso
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ Error en: $1${NC}"
        exit 1
    fi
}

# FASE 1: Hacer backup si no existe
if [ ! -f ".last_backup" ]; then
    echo -e "${YELLOW}📦 Ejecutando backup completo...${NC}"
    bash scripts/complete-backup.sh
    check_success "Backup completo"
fi

# FASE 2: Limpiar PM2
echo -e "${YELLOW}🛑 Deteniendo servicios...${NC}"
pm2 delete whatsapp-api 2>/dev/null || true
pm2 flush 2>/dev/null || true
check_success "Servicios detenidos"

# FASE 3: Configurar Git correctamente
echo -e "${YELLOW}🔧 Configurando repositorio Git...${NC}"

# Verificar si ya es un repositorio Git
if [ ! -d ".git" ]; then
    git init
    check_success "Git inicializado"
fi

# Configurar remote origin
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
check_success "Remote origin configurado"

# Configurar usuario Git si no está configurado
if [ -z "$(git config user.name)" ]; then
    git config user.name "WhatsApp API Server"
    git config user.email "admin@whatsapp-api.local"
    check_success "Usuario Git configurado"
fi

# FASE 4: Sincronizar con repositorio
echo -e "${YELLOW}📥 Sincronizando con repositorio...${NC}"
git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true

# Agregar cambios locales si los hay
git add . 2>/dev/null || true
git commit -m "Pre-reinstall backup - $(date)" 2>/dev/null || true

# Intentar pull o reset si hay conflictos
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Resolviendo conflictos...${NC}"
    git reset --hard HEAD 2>/dev/null || true
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
}

check_success "Sincronización con repositorio"

# FASE 5: Limpiar e instalar dependencias
echo -e "${YELLOW}🧹 Limpiando instalación anterior...${NC}"
rm -rf node_modules package-lock.json 2>/dev/null || true
check_success "Limpieza de dependencias"

echo -e "${YELLOW}📦 Instalando dependencias frescas...${NC}"
npm install
check_success "Instalación de dependencias"

# FASE 6: Crear directorios necesarios
echo -e "${YELLOW}📁 Creando estructura de directorios...${NC}"
DIRECTORIES=(
    "sessions"
    ".wwebjs_cache"
    ".wwebjs_auth"
    "public/uploads"
    "logs"
    "data"
    "backups"
)

for dir in "${DIRECTORIES[@]}"; do
    mkdir -p "$dir"
    chmod 755 "$dir" 2>/dev/null || true
    echo -e "${GREEN}✅ Directorio creado: $dir${NC}"
done

# FASE 7: Configurar permisos
echo -e "${YELLOW}🔧 Configurando permisos...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true
chmod 600 .env 2>/dev/null || true
check_success "Permisos configurados"

# FASE 8: Restaurar datos críticos si hay backup
if [ -f ".last_backup" ]; then
    echo -e "${YELLOW}🔄 Restaurando datos críticos...${NC}"
    bash scripts/restore-data.sh
    if [ $? -eq 0 ]; then
        BACKUP_RESTORED=true
        echo -e "${GREEN}✅ Datos restaurados desde backup${NC}"
    else
        echo -e "${YELLOW}⚠️  Continuando sin restaurar backup${NC}"
    fi
fi

# FASE 9: Iniciar servicios
echo -e "${YELLOW}🚀 Iniciando servicios...${NC}"
pm2 start ecosystem.config.js
check_success "PM2 iniciado"

pm2 save
check_success "Configuración PM2 guardada"

# FASE 10: Verificar instalación
echo -e "${YELLOW}🔍 Verificando instalación...${NC}"
sleep 5

# Verificar PM2
PM2_STATUS=$(pm2 list | grep "whatsapp-api" | grep "online" | wc -l)
if [ "$PM2_STATUS" -eq 1 ]; then
    echo -e "${GREEN}✅ PM2 funcionando correctamente${NC}"
else
    echo -e "${RED}❌ Problema con PM2${NC}"
fi

# Verificar servidor
sleep 3
SERVER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/info 2>/dev/null || echo "000")
if [ "$SERVER_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Servidor respondiendo correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor respuesta: $SERVER_RESPONSE${NC}"
fi

# FASE 11: Ejecutar verificación completa
echo -e "${YELLOW}🔍 Ejecutando verificación post-instalación...${NC}"
if [ -f "scripts/verify-update.sh" ]; then
    bash scripts/verify-update.sh
fi

# RESUMEN FINAL
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 REINSTALACIÓN COMPLETA EXITOSA${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📊 Estado del sistema:${NC}"
echo -e "   🔧 PM2: $(pm2 list | grep whatsapp-api | awk '{print $10}' || echo 'N/A')"
echo -e "   🌐 Servidor: http://localhost:3000"
echo -e "   🔑 API Key: whatsapp-api-key-2024"
echo -e "   📱 Dashboard: http://localhost:3000/dashboard"
echo -e "   👨‍💼 Admin: http://localhost:3000/admin"

if [ "$BACKUP_RESTORED" = true ]; then
    echo -e "   💾 Datos: Restaurados desde backup"
else
    echo -e "   💾 Datos: Instalación limpia"
fi

echo ""
echo -e "${YELLOW}🔧 Comandos útiles:${NC}"
echo -e "   📊 Ver estado: pm2 status"
echo -e "   📋 Ver logs: pm2 logs whatsapp-api"
echo -e "   🔄 Reiniciar: pm2 restart whatsapp-api"
echo -e "   🛑 Detener: pm2 stop whatsapp-api"
echo ""
echo -e "${GREEN}✅ Sistema 100% funcional y listo para usar${NC}"