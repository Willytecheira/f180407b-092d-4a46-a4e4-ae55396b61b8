#!/bin/bash

echo "🚀 Desplegando WhatsApp API con SSL en docker.website"
echo "======================================================"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: server.js no encontrado. ¿Estás en el directorio correcto?${NC}"
    exit 1
fi

# Verificar certificados SSL
echo -e "${YELLOW}🔒 Verificando certificados SSL...${NC}"
if [ ! -f "/etc/ssl/dockerwebsite/docker.website.crt" ] || [ ! -f "/etc/ssl/dockerwebsite/docker.website.key" ]; then
    echo -e "${RED}❌ Certificados SSL no encontrados en:${NC}"
    echo "  - /etc/ssl/dockerwebsite/docker.website.crt"
    echo "  - /etc/ssl/dockerwebsite/docker.website.key"
    exit 1
else
    echo -e "${GREEN}✅ Certificados SSL encontrados${NC}"
fi

# Verificar Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Nginx no está instalado${NC}"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    npm install -g pm2
fi

# Crear archivo .env desde .env.example si no existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creando archivo .env...${NC}"
    cp .env.example .env
fi

# Crear directorios necesarios
echo -e "${YELLOW}📁 Creando directorios necesarios...${NC}"
mkdir -p sessions .wwebjs_cache .wwebjs_auth public/uploads logs

# Configurar permisos
echo -e "${YELLOW}🔧 Configurando permisos...${NC}"
chmod 755 sessions .wwebjs_cache .wwebjs_auth public/uploads logs
chmod +x scripts/*.sh

# Instalar dependencias
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm install

# Configurar Nginx
echo -e "${YELLOW}🌐 Configurando Nginx...${NC}"
sudo cp nginx.conf /etc/nginx/sites-available/whatsapp-api
sudo ln -sf /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración de Nginx
sudo nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en la configuración de Nginx${NC}"
    exit 1
fi

# Recargar Nginx
echo -e "${YELLOW}🔄 Recargando Nginx...${NC}"
sudo systemctl reload nginx

# Detener instancia anterior si existe
echo -e "${YELLOW}🛑 Deteniendo instancia anterior...${NC}"
pm2 delete whatsapp-api 2>/dev/null || true

# Iniciar aplicación con PM2
echo -e "${YELLOW}🚀 Iniciando aplicación...${NC}"
pm2 start ecosystem.config.js

# Guardar configuración PM2
pm2 save

# Configurar PM2 para auto-inicio
pm2 startup

echo -e "${GREEN}✅ Despliegue completado${NC}"
echo ""
echo -e "${GREEN}🌐 Tu aplicación está disponible en: https://docker.website${NC}"
echo -e "${GREEN}🔑 API Key: whatsapp-api-key-2024${NC}"
echo -e "${GREEN}🔒 SSL: Activado${NC}"
echo ""
echo -e "${YELLOW}📊 Estado de la aplicación:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}📋 Para ver logs en tiempo real:${NC}"
echo "  pm2 logs whatsapp-api"
echo ""
echo -e "${YELLOW}🔧 Para reiniciar:${NC}"
echo "  pm2 restart whatsapp-api"