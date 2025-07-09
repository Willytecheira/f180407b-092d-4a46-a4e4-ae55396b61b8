#!/bin/bash

echo "🚀 Iniciando WhatsApp Multi-Session API..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar si estamos en el directorio correcto
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: server.js no encontrado. ¿Estás en el directorio correcto?${NC}"
    exit 1
fi

# Crear directorios necesarios
echo -e "${YELLOW}📁 Creando directorios necesarios...${NC}"
mkdir -p sessions
mkdir -p .wwebjs_cache
mkdir -p .wwebjs_auth
mkdir -p public/uploads
mkdir -p logs

# Configurar permisos
echo -e "${YELLOW}🔧 Configurando permisos...${NC}"
chmod 755 sessions .wwebjs_cache .wwebjs_auth public/uploads logs
chmod +x scripts/*.sh scripts/*.js

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 no está instalado. Instalando...${NC}"
    npm install -g pm2
fi

# Detener instancia anterior si existe
echo -e "${YELLOW}🛑 Deteniendo instancia anterior...${NC}"
pm2 delete whatsapp-api 2>/dev/null || true

# Iniciar con PM2
echo -e "${YELLOW}🚀 Iniciando aplicación con PM2...${NC}"
pm2 start ecosystem.config.js

# Guardar configuración PM2
echo -e "${YELLOW}💾 Guardando configuración PM2...${NC}"
pm2 save

# Mostrar estado
echo -e "${GREEN}✅ Aplicación iniciada${NC}"
pm2 status

# Mostrar logs
echo -e "${YELLOW}📋 Mostrando logs en tiempo real (Ctrl+C para salir):${NC}"
pm2 logs whatsapp-api --lines 20