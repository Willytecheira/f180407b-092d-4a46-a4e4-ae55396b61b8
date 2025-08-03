#!/bin/bash

echo "🔄 BACKUP COMPLETO PRE-REINSTALACIÓN"
echo "==================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="complete_backup_${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo -e "${BLUE}📅 Timestamp: $TIMESTAMP${NC}"

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_PATH"

# Datos críticos a respaldar
CRITICAL_ITEMS=(
    "sessions"
    ".wwebjs_auth"
    ".wwebjs_cache"
    "public/uploads"
    "logs"
    "data"
    "ssl"
    ".env"
    "ecosystem.config.js"
    "package.json"
    "server.js"
    "src"
    "public"
    "scripts"
)

echo -e "${YELLOW}📦 Respaldando datos críticos...${NC}"

# Backup de cada item crítico
for item in "${CRITICAL_ITEMS[@]}"; do
    if [ -e "$item" ]; then
        echo -e "${YELLOW}🔄 Respaldando: $item${NC}"
        
        if [ -d "$item" ]; then
            cp -r "$item" "$BACKUP_PATH/"
        else
            cp "$item" "$BACKUP_PATH/"
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $item respaldado${NC}"
        else
            echo -e "${RED}❌ Error respaldando $item${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No encontrado: $item${NC}"
    fi
done

# Capturar estado del sistema
echo -e "${YELLOW}📊 Capturando estado del sistema...${NC}"

cat > "$BACKUP_PATH/system_state.txt" << EOF
# ESTADO DEL SISTEMA - $(date)
# =====================================

## PM2 Status
$(pm2 list 2>/dev/null || echo "PM2 no disponible")

## Procesos Node.js
$(ps aux | grep node || echo "No hay procesos Node.js")

## Estructura de directorios
$(ls -la)

## Tamaño de directorios críticos
$(du -sh sessions .wwebjs_auth .wwebjs_cache public/uploads 2>/dev/null || echo "Directorios no encontrados")

## Variables de entorno (.env)
$(cat .env 2>/dev/null || echo "Archivo .env no encontrado")

## Versión de Node.js
$(node --version 2>/dev/null || echo "Node.js no disponible")

## Versión de npm
$(npm --version 2>/dev/null || echo "npm no disponible")

## Espacio en disco
$(df -h . 2>/dev/null || echo "Información de disco no disponible")

## Logs recientes (últimas 50 líneas)
$(tail -50 logs/*.log 2>/dev/null || echo "No hay logs disponibles")
EOF

# Verificar sesiones WhatsApp existentes
echo -e "${YELLOW}📱 Verificando sesiones WhatsApp...${NC}"
if [ -d "sessions" ]; then
    SESSION_COUNT=$(find sessions -name "*.json" | wc -l)
    echo -e "${BLUE}📊 Sesiones encontradas: $SESSION_COUNT${NC}"
    
    # Listar sesiones
    find sessions -name "*.json" > "$BACKUP_PATH/sessions_list.txt"
    echo -e "${GREEN}✅ Lista de sesiones guardada${NC}"
else
    echo -e "${YELLOW}⚠️  No se encontró directorio de sesiones${NC}"
fi

# Comprimir backup
echo -e "${YELLOW}🗜️  Comprimiendo backup...${NC}"
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup comprimido: ${BACKUP_NAME}.tar.gz${NC}"
    
    # Registrar último backup
    echo "${BACKUP_NAME}.tar.gz" > "../.last_backup"
    
    # Limpiar directorio temporal
    rm -rf "$BACKUP_NAME"
    
    # Mostrar información del backup
    BACKUP_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
    echo -e "${BLUE}📏 Tamaño del backup: $BACKUP_SIZE${NC}"
    
    echo ""
    echo -e "${GREEN}🎉 BACKUP COMPLETO EXITOSO${NC}"
    echo -e "${BLUE}📁 Archivo: $BACKUP_DIR/${BACKUP_NAME}.tar.gz${NC}"
    echo -e "${BLUE}📋 Estado: $BACKUP_PATH/system_state.txt (incluido)${NC}"
    
else
    echo -e "${RED}❌ Error comprimiendo backup${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${YELLOW}🔄 Preparando siguiente fase...${NC}"
echo -e "${GREEN}✅ Fase 1 COMPLETADA - Backup seguro realizado${NC}"