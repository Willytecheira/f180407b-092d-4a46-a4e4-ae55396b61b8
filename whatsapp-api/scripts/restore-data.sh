#!/bin/bash

echo "📁 Restaurando datos críticos desde backup..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para restaurar desde backup más reciente
restore_from_latest() {
    if [ ! -f ".last_backup" ]; then
        echo -e "${RED}❌ No se encontró referencia al último backup${NC}"
        return 1
    fi

    BACKUP_FILE=$(cat .last_backup)
    BACKUP_PATH="./backups/$BACKUP_FILE"

    if [ ! -f "$BACKUP_PATH" ]; then
        echo -e "${RED}❌ Archivo de backup no encontrado: $BACKUP_PATH${NC}"
        return 1
    fi

    echo -e "${BLUE}📦 Usando backup: $BACKUP_FILE${NC}"
    restore_from_file "$BACKUP_PATH"
}

# Función para restaurar desde archivo específico
restore_from_file() {
    local backup_file=$1
    local temp_dir="./temp_restore_$$"

    echo -e "${YELLOW}📂 Extrayendo backup...${NC}"
    mkdir -p "$temp_dir"
    tar -xzf "$backup_file" -C "$temp_dir"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error extrayendo backup${NC}"
        rm -rf "$temp_dir"
        return 1
    fi

    # Encontrar el directorio extraído
    extracted_dir=$(ls "$temp_dir" | head -1)
    if [ -z "$extracted_dir" ]; then
        echo -e "${RED}❌ No se pudo encontrar contenido del backup${NC}"
        rm -rf "$temp_dir"
        return 1
    fi

    backup_content_dir="$temp_dir/$extracted_dir"

    # Restaurar cada directorio/archivo crítico
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
    )

    for item in "${CRITICAL_ITEMS[@]}"; do
        if [ -e "$backup_content_dir/$item" ]; then
            echo -e "${YELLOW}🔄 Restaurando: $item${NC}"
            
            # Crear directorio padre si es necesario
            parent_dir=$(dirname "$item")
            if [ "$parent_dir" != "." ] && [ ! -d "$parent_dir" ]; then
                mkdir -p "$parent_dir"
            fi

            # Restaurar item
            if [ -d "$backup_content_dir/$item" ]; then
                # Es un directorio
                if [ -d "$item" ]; then
                    rm -rf "$item"
                fi
                cp -r "$backup_content_dir/$item" "$item"
            else
                # Es un archivo
                cp "$backup_content_dir/$item" "$item"
            fi

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ $item restaurado${NC}"
            else
                echo -e "${RED}❌ Error restaurando $item${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  No encontrado en backup: $item${NC}"
        fi
    done

    # Configurar permisos
    echo -e "${YELLOW}🔧 Configurando permisos...${NC}"
    chmod 755 sessions .wwebjs_auth .wwebjs_cache public/uploads logs data 2>/dev/null
    chmod 600 .env 2>/dev/null
    chmod +x scripts/*.sh 2>/dev/null

    # Limpiar archivos temporales
    rm -rf "$temp_dir"

    echo -e "${GREEN}✅ Datos restaurados correctamente${NC}"
    return 0
}

# Verificar argumentos
if [ $# -eq 0 ]; then
    # Sin argumentos, usar backup más reciente
    restore_from_latest
elif [ $# -eq 1 ]; then
    # Con argumento, usar archivo específico
    if [ -f "backups/$1" ]; then
        restore_from_file "backups/$1"
    else
        echo -e "${RED}❌ Archivo de backup no encontrado: backups/$1${NC}"
        echo -e "${BLUE}💡 Backups disponibles:${NC}"
        ls -la backups/*.tar.gz 2>/dev/null || echo "No hay backups disponibles"
        exit 1
    fi
else
    echo "Uso: $0 [archivo_backup.tar.gz]"
    echo "Sin argumentos: usa el backup más reciente"
    echo "Con argumento: usa el archivo específico"
    exit 1
fi