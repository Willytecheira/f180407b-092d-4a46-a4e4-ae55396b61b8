#!/bin/bash

echo "🔄 Actualizando WhatsApp API desde GitHub..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
REPO_URL=${1:-"origin"}

echo -e "${BLUE}📋 Iniciando proceso de actualización...${NC}"

# Verificar si estamos en un repositorio git
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: No es un repositorio Git${NC}"
    echo -e "${YELLOW}💡 Configurando repositorio automáticamente...${NC}"
    
    # Inicializar Git si no existe
    git init
    git remote add origin https://github.com/Willytecheira/f180407b-092d-4a46-a4e4-ae55396b61b8.git 2>/dev/null || git remote set-url origin https://github.com/Willytecheira/f180407b-092d-4a46-a4e4-ae55396b61b8.git
    
    # Configurar usuario si no está configurado
    if [ -z "$(git config user.name)" ]; then
        git config user.name "WhatsApp API Server"
        git config user.email "admin@whatsapp-api.local"
    fi
    
    echo -e "${GREEN}✅ Repositorio Git configurado${NC}"
fi

# Paso 1: Crear backup de datos críticos
echo -e "${YELLOW}💾 Creando backup de datos críticos...${NC}"
bash scripts/backup-data.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en backup. Abortando actualización${NC}"
    exit 1
fi

# Paso 2: Obtener cambios desde GitHub
echo -e "${YELLOW}📡 Obteniendo cambios desde GitHub...${NC}"
git fetch origin

# Verificar si hay cambios
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✅ Ya estás en la última versión${NC}"
    exit 0
fi

# Mostrar cambios que se van a aplicar
echo -e "${BLUE}📝 Cambios detectados:${NC}"
git log --oneline HEAD..origin/main 2>/dev/null || git log --oneline HEAD..origin/master

# Confirmar actualización
read -p "¿Continuar con la actualización? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  Actualización cancelada${NC}"
    exit 0
fi

# Paso 3: Aplicar cambios
echo -e "${YELLOW}🔄 Aplicando cambios...${NC}"
git pull origin main 2>/dev/null || git pull origin master

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al aplicar cambios desde Git${NC}"
    echo -e "${YELLOW}🔄 Intentando rollback...${NC}"
    bash scripts/rollback.sh
    exit 1
fi

# Paso 4: Restaurar datos críticos
echo -e "${YELLOW}📁 Restaurando datos críticos...${NC}"
bash scripts/restore-data.sh

# Paso 5: Actualizar dependencias
echo -e "${YELLOW}📦 Actualizando dependencias...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al instalar dependencias${NC}"
    echo -e "${YELLOW}🔄 Ejecutando rollback...${NC}"
    bash scripts/rollback.sh
    exit 1
fi

# Paso 6: Reiniciar aplicación con PM2
echo -e "${YELLOW}🔄 Reiniciando aplicación...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🛑 Deteniendo instancia anterior...${NC}"
    pm2 delete whatsapp-api 2>/dev/null || true
    
    echo -e "${YELLOW}🚀 Iniciando aplicación fresca...${NC}"
    pm2 start ecosystem.config.js
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error al iniciar con PM2${NC}"
        echo -e "${YELLOW}🔄 Ejecutando rollback...${NC}"
        bash scripts/rollback.sh
        exit 1
    fi
    
    echo -e "${YELLOW}💾 Guardando configuración PM2...${NC}"
    pm2 save
else
    echo -e "${YELLOW}⚠️  PM2 no encontrado, reinicia manualmente la aplicación${NC}"
fi

# Paso 7: Verificar actualización
echo -e "${YELLOW}🔍 Verificando actualización...${NC}"
sleep 5
bash scripts/verify-update.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Actualización completada exitosamente${NC}"
    echo -e "${GREEN}🌐 La aplicación está disponible en: https://docker.website${NC}"
    echo -e "${BLUE}📊 Para ver logs: pm2 logs whatsapp-api${NC}"
    echo -e "${BLUE}📋 Para ver estado: pm2 status${NC}"
else
    echo -e "${RED}❌ La verificación falló. Considera hacer rollback${NC}"
    echo -e "${YELLOW}🔄 Para rollback: bash scripts/rollback.sh${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 ¡Actualización completada!${NC}"