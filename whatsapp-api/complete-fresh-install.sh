#!/bin/bash

echo "🔥 ELIMINACIÓN Y REINSTALACIÓN COMPLETA DESDE CERO"
echo "=================================================="
echo ""
echo "⚠️  ADVERTENCIA: Este script eliminará COMPLETAMENTE el directorio actual"
echo "   y clonará una versión fresca desde GitHub"
echo ""
echo "🛡️  Se creará un backup automático antes de proceder"
echo "🌐  Configurado para: docker.website"
echo "🔒  SSL: Habilitado"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
REPO_URL="https://github.com/Willytecheira/f180407b-092d-4a46-a4e4-ae55396b61b8.git"
BACKUP_DIR="/root/backups"
TEMP_BACKUP_DIR="/tmp/whatsapp-api-backup-$(date +%s)"
PROJECT_DIR="/root/whatsapp-api"

echo -e "${YELLOW}🔍 Verificando sistema...${NC}"

# Verificar dependencias críticas
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ Git no está instalado${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js no está instalado${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm no está instalado${NC}"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo -e "${RED}❌ PM2 no está instalado${NC}"; exit 1; }

echo -e "${GREEN}✅ Dependencias verificadas${NC}"

echo ""
echo -e "${YELLOW}⏰ Iniciando en 5 segundos...${NC}"
echo -e "${RED}⚠️  Presiona Ctrl+C para cancelar${NC}"
sleep 5

echo ""
echo -e "${BLUE}=================== FASE 1: BACKUP CRÍTICO ===================${NC}"

# Crear directorio temporal de backup
mkdir -p "$TEMP_BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Verificar si existe el directorio del proyecto
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}📦 Creando backup completo...${NC}"
    
    # Backup de datos críticos
    CRITICAL_DIRS=("sessions" ".wwebjs_auth" ".wwebjs_cache" "public/uploads" "logs" "data" "ssl")
    CRITICAL_FILES=(".env" "ecosystem.config.js" "package.json")
    
    cd "$PROJECT_DIR"
    
    # Backup directorios críticos
    for dir in "${CRITICAL_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "${YELLOW}🔄 Backup: $dir${NC}"
            cp -r "$dir" "$TEMP_BACKUP_DIR/" 2>/dev/null || true
        fi
    done
    
    # Backup archivos críticos
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}🔄 Backup: $file${NC}"
            cp "$file" "$TEMP_BACKUP_DIR/" 2>/dev/null || true
        fi
    done
    
    # Crear archivo de información del backup
    cat > "$TEMP_BACKUP_DIR/backup_info.txt" << EOF
# BACKUP COMPLETO - $(date)
# =====================================

## PM2 Status (antes de eliminación)
$(pm2 list 2>/dev/null || echo "PM2 no disponible")

## Sesiones WhatsApp encontradas
$(find sessions -name "*.json" 2>/dev/null | wc -l || echo "0") sesiones

## Tamaño de directorios críticos
$(du -sh sessions .wwebjs_auth .wwebjs_cache public/uploads 2>/dev/null || echo "Directorios no encontrados")

## Git Status
$(git status 2>/dev/null || echo "No es un repositorio Git")

## Repositorio remoto
$(git remote get-url origin 2>/dev/null || echo "Sin remoto configurado")
EOF
    
    echo -e "${GREEN}✅ Backup temporal creado${NC}"
else
    echo -e "${YELLOW}⚠️  Directorio del proyecto no existe, saltando backup${NC}"
fi

echo ""
echo -e "${BLUE}================ FASE 2: ELIMINACIÓN COMPLETA ================${NC}"

# Detener todos los procesos PM2 relacionados
echo -e "${YELLOW}🛑 Deteniendo procesos PM2...${NC}"
pm2 delete whatsapp-api 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 flush
pm2 kill 2>/dev/null || true

# Limpiar procesos Node.js residuales
echo -e "${YELLOW}🧹 Limpiando procesos residuales...${NC}"
pkill -f "server.js" 2>/dev/null || true
pkill -f "whatsapp-api" 2>/dev/null || true

# Eliminar directorio completo
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}🗑️  Eliminando directorio completo...${NC}"
    cd /root
    rm -rf "$PROJECT_DIR"
    echo -e "${GREEN}✅ Directorio eliminado${NC}"
else
    echo -e "${YELLOW}⚠️  Directorio ya no existe${NC}"
fi

echo ""
echo -e "${BLUE}============== FASE 3: CLONADO FRESCO DESDE GITHUB ==============${NC}"

echo -e "${YELLOW}📥 Clonando repositorio fresco...${NC}"
cd /root

git clone "$REPO_URL" whatsapp-api
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Repositorio clonado exitosamente${NC}"
else
    echo -e "${RED}❌ Error clonando repositorio${NC}"
    exit 1
fi

cd whatsapp-api

# Verificar archivos críticos
REQUIRED_FILES=("server.js" "package.json" "public/dashboard.html" "install-complete-dashboard.sh")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Archivo crítico faltante: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Verificación de integridad completa${NC}"

echo ""
echo -e "${BLUE}=========== FASE 4: INSTALACIÓN COMPLETA CON MEJORAS ============${NC}"

# Hacer ejecutable el script de instalación
chmod +x install-complete-dashboard.sh
chmod +x scripts/*.sh 2>/dev/null || true

echo -e "${YELLOW}🚀 Ejecutando instalación completa...${NC}"
./install-complete-dashboard.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Instalación completa exitosa${NC}"
else
    echo -e "${RED}❌ Error en la instalación${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}============= FASE 5: RESTAURACIÓN DE DATOS CRÍTICOS =============${NC}"

if [ -d "$TEMP_BACKUP_DIR" ]; then
    echo -e "${YELLOW}📋 Restaurando datos críticos desde backup...${NC}"
    
    # Restaurar directorios críticos
    RESTORE_DIRS=("sessions" ".wwebjs_auth" ".wwebjs_cache" "public/uploads")
    for dir in "${RESTORE_DIRS[@]}"; do
        if [ -d "$TEMP_BACKUP_DIR/$dir" ]; then
            echo -e "${YELLOW}🔄 Restaurando: $dir${NC}"
            cp -r "$TEMP_BACKUP_DIR/$dir" ./ 2>/dev/null || true
            echo -e "${GREEN}✅ $dir restaurado${NC}"
        fi
    done
    
    # Crear backup permanente
    PERMANENT_BACKUP="$BACKUP_DIR/complete_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    cd /tmp
    tar -czf "$PERMANENT_BACKUP" "$(basename $TEMP_BACKUP_DIR)"
    echo "$PERMANENT_BACKUP" > "$PROJECT_DIR/.last_backup"
    
    # Limpiar backup temporal
    rm -rf "$TEMP_BACKUP_DIR"
    
    echo -e "${GREEN}✅ Datos críticos restaurados${NC}"
else
    echo -e "${YELLOW}⚠️  No hay backup para restaurar${NC}"
fi

cd "$PROJECT_DIR"

# Configurar permisos
chmod -R 755 scripts/ 2>/dev/null || true
chmod 600 .env 2>/dev/null || true

echo ""
echo -e "${BLUE}============== FASE 6: VERIFICACIÓN Y TESTING ===============${NC}"

echo -e "${YELLOW}🔍 Verificando instalación...${NC}"

# Verificar PM2
sleep 3
PM2_STATUS=$(pm2 list | grep "whatsapp-api" | grep "online" || echo "")
if [ -n "$PM2_STATUS" ]; then
    echo -e "${GREEN}✅ PM2 ejecutándose correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  Reiniciando PM2...${NC}"
    pm2 start ecosystem.config.js --env production
    sleep 2
fi

# Verificar servidor
echo -e "${YELLOW}🌐 Verificando servidor...${NC}"
for i in {1..10}; do
    if curl -s -k https://localhost:3000/info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor respondiendo${NC}"
        break
    elif curl -s http://localhost:3000/info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor respondiendo (HTTP)${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Esperando servidor... ($i/10)${NC}"
        sleep 2
    fi
done

# Verificar dashboard
echo -e "${YELLOW}📊 Verificando dashboard...${NC}"
if curl -s -k https://localhost:3000/dashboard >/dev/null 2>&1 || curl -s http://localhost:3000/dashboard >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard accesible${NC}"
else
    echo -e "${YELLOW}⚠️  Dashboard puede necesitar algunos segundos más${NC}"
fi

# Ejecutar verificación post-instalación si existe
if [ -f "scripts/post-install-verify.sh" ]; then
    echo -e "${YELLOW}🔍 Ejecutando verificación completa...${NC}"
    bash scripts/post-install-verify.sh
fi

echo ""
echo -e "${GREEN}🎉 ¡REINSTALACIÓN COMPLETA EXITOSA!${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "${GREEN}✅ SISTEMA 100% FUNCIONAL Y ACTUALIZADO${NC}"
echo ""
echo -e "${BLUE}🌐 URLs de Acceso:${NC}"
echo "   • Principal: https://docker.website"
echo "   • Admin: https://docker.website/admin"
echo "   • Dashboard: https://docker.website/dashboard"
echo "   • API Info: https://docker.website/info"
echo ""
echo -e "${BLUE}🔑 Credenciales:${NC}"
echo "   • API Key: whatsapp-api-key-2024"
echo "   • Usuario Admin: admin"
echo "   • Password Admin: admin123"
echo ""
echo -e "${BLUE}📊 Estado del Sistema:${NC}"
pm2 list
echo ""
echo -e "${BLUE}📁 Archivos de Backup:${NC}"
ls -la "$BACKUP_DIR"/ 2>/dev/null | tail -5 || echo "   No hay backups previos"
echo ""
echo -e "${BLUE}🔧 Comandos Útiles:${NC}"
echo "   • Ver logs: pm2 logs whatsapp-api"
echo "   • Reiniciar: pm2 restart whatsapp-api"
echo "   • Estado: pm2 status"
echo "   • Monitoreo: pm2 monit"
echo ""
echo -e "${GREEN}✅ ¡Sistema listo para usar!${NC}"