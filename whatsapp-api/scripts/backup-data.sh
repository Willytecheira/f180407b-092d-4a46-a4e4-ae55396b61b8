#!/bin/bash

echo "💾 Creando backup de datos críticos..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
BACKUP_BASE="./backups"

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📁 Directorio de backup: $BACKUP_DIR${NC}"

# Datos críticos a respaldar
CRITICAL_DIRS=(
    "sessions"
    ".wwebjs_auth"
    ".wwebjs_cache"
    "public/uploads"
    "logs"
    "data"
    "ssl"
)

CRITICAL_FILES=(
    ".env"
    "ecosystem.config.js"
)

# Respaldar directorios
for dir in "${CRITICAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${YELLOW}📂 Respaldando directorio: $dir${NC}"
        cp -r "$dir" "$BACKUP_DIR/"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $dir respaldado${NC}"
        else
            echo -e "${RED}❌ Error respaldando $dir${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Directorio no existe: $dir${NC}"
    fi
done

# Respaldar archivos
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${YELLOW}📄 Respaldando archivo: $file${NC}"
        cp "$file" "$BACKUP_DIR/"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $file respaldado${NC}"
        else
            echo -e "${RED}❌ Error respaldando $file${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Archivo no existe: $file${NC}"
    fi
done

# Crear información del backup
echo "Backup creado: $(date)" > "$BACKUP_DIR/backup_info.txt"
echo "Commit actual: $(git rev-parse HEAD 2>/dev/null || echo 'No disponible')" >> "$BACKUP_DIR/backup_info.txt"
echo "Branch actual: $(git branch --show-current 2>/dev/null || echo 'No disponible')" >> "$BACKUP_DIR/backup_info.txt"

# Comprimir backup
echo -e "${YELLOW}🗜️  Comprimiendo backup...${NC}"
cd "$BACKUP_BASE"
tar -czf "$(basename $BACKUP_DIR).tar.gz" "$(basename $BACKUP_DIR)"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup comprimido: $(basename $BACKUP_DIR).tar.gz${NC}"
    rm -rf "$(basename $BACKUP_DIR)"
else
    echo -e "${RED}❌ Error comprimiendo backup${NC}"
fi
cd ..

# Limpiar backups antiguos (mantener últimos 5)
echo -e "${YELLOW}🧹 Limpiando backups antiguos...${NC}"
cd "$BACKUP_BASE"
ls -t *.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
cd ..

echo -e "${GREEN}✅ Backup completado: $BACKUP_DIR.tar.gz${NC}"

# Guardar referencia del último backup
echo "$BACKUP_DIR.tar.gz" > ".last_backup"

exit 0