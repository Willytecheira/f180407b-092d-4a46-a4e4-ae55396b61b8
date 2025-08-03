#!/bin/bash

echo "🔄 ROLLBACK ESPECÍFICO AL 2 DE AGOSTO 11:13 PM"
echo "=============================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TARGET_DATE="2024-08-02"
TARGET_TIME="23:13"  # 11:13 PM en formato 24h

echo -e "${YELLOW}🎯 Buscando commit del $TARGET_DATE a las $TARGET_TIME...${NC}"

# Buscar commits en el rango de tiempo específico
echo -e "${BLUE}📋 Commits disponibles del 2 de agosto 2024:${NC}"
git log --oneline --since="2024-08-02 22:00" --until="2024-08-03 01:00" --date=local

# Buscar el commit más cercano a las 11:13 PM
TARGET_COMMIT=$(git log --since="2024-08-02 23:10" --until="2024-08-02 23:20" --format="%H" -1)

if [ -z "$TARGET_COMMIT" ]; then
    echo -e "${YELLOW}⚠️  No se encontró commit exacto a las 11:13 PM${NC}"
    echo -e "${BLUE}🔍 Buscando en rango más amplio (22:00 - 00:00)...${NC}"
    
    # Buscar en rango más amplio
    TARGET_COMMIT=$(git log --since="2024-08-02 22:00" --until="2024-08-03 00:00" --format="%H" -1)
    
    if [ -z "$TARGET_COMMIT" ]; then
        echo -e "${RED}❌ No se encontraron commits del 2 de agosto${NC}"
        echo -e "${BLUE}💡 Commits recientes disponibles:${NC}"
        git log --oneline -10
        exit 1
    fi
fi

# Mostrar información del commit objetivo
COMMIT_INFO=$(git show --format="%h - %s (%cd)" --date=local -s "$TARGET_COMMIT")
echo -e "${GREEN}✅ Commit objetivo encontrado:${NC}"
echo -e "${BLUE}📍 $COMMIT_INFO${NC}"

# Confirmar rollback
echo ""
read -p "¿Continuar con el rollback a este commit? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  Rollback cancelado${NC}"
    exit 0
fi

echo -e "${YELLOW}💾 Creando backup completo del estado actual...${NC}"

# Crear backup completo
if [ -f "scripts/backup-data.sh" ]; then
    bash scripts/backup-data.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error en backup. Abortando rollback.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Backup completado${NC}"
else
    echo -e "${YELLOW}⚠️  Script de backup no encontrado, continuando...${NC}"
fi

echo -e "${YELLOW}🔄 Ejecutando rollback git...${NC}"

# Guardar estado actual por si acaso
git stash push -m "Pre-rollback stash $(date)"

# Ejecutar rollback
git reset --hard "$TARGET_COMMIT"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Rollback git exitoso${NC}"
else
    echo -e "${RED}❌ Error en rollback git${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Reinstalando dependencias...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Advertencia: Error en npm install${NC}"
fi

echo -e "${YELLOW}💾 Restaurando datos críticos...${NC}"

# Restaurar datos críticos si existe el script
if [ -f "scripts/restore-data.sh" ]; then
    bash scripts/restore-data.sh
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Datos críticos restaurados${NC}"
    else
        echo -e "${YELLOW}⚠️  Advertencia en restauración de datos${NC}"
    fi
fi

echo -e "${YELLOW}🔄 Reiniciando aplicación con PM2...${NC}"

# Reiniciar PM2
if command -v pm2 &> /dev/null; then
    pm2 restart whatsapp-api
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PM2 reiniciado exitosamente${NC}"
    else
        echo -e "${YELLOW}⚠️  Reiniciando PM2 manualmente...${NC}"
        pm2 delete whatsapp-api 2>/dev/null
        pm2 start ecosystem.config.js
    fi
else
    echo -e "${YELLOW}⚠️  PM2 no encontrado, inicia manualmente: node server.js${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ROLLBACK COMPLETADO AL 2 DE AGOSTO 11:13 PM${NC}"
echo -e "${BLUE}📍 Commit actual: $(git log --format="%h - %s (%cd)" --date=local -1)${NC}"
echo ""
echo -e "${YELLOW}🔍 Verificando estado...${NC}"

# Verificar estado después del rollback
sleep 3
if [ -f "scripts/verify-update.sh" ]; then
    bash scripts/verify-update.sh
else
    echo -e "${BLUE}🌐 Verifica manualmente: https://docker.website${NC}"
fi

echo ""
echo -e "${GREEN}✅ Rollback al 2 de agosto 11:13 PM completado${NC}"
echo -e "${BLUE}💡 Si hay problemas, puedes volver al estado anterior con:${NC}"
echo -e "${BLUE}   git stash pop${NC}"
echo -e "${BLUE}💡 Comandos útiles:${NC}"
echo -e "${BLUE}   pm2 status${NC}"
echo -e "${BLUE}   pm2 logs whatsapp-api${NC}"