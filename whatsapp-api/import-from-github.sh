#!/bin/bash

echo "🚀 SCRIPT MAESTRO DE IMPORTACIÓN DESDE GITHUB"
echo "=============================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Iniciando proceso de importación desde GitHub...${NC}"
echo "  🔗 Repositorio: https://github.com/Willytecheira/f180407b-092d-4a46-a4e4-ae55396b61b8"
echo "  🌐 Servidor: docker.website"
echo "  🔒 SSL: Habilitado"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ] && [ ! -d "whatsapp-api" ]; then
    echo -e "${YELLOW}📁 Navegando al directorio correcto...${NC}"
    cd /root 2>/dev/null || cd ~ 2>/dev/null || true
fi

# Hacer ejecutable el script de importación
chmod +x whatsapp-api/scripts/import-from-github.sh 2>/dev/null || true

echo -e "${YELLOW}🚀 Ejecutando importación desde GitHub...${NC}"
echo "⚠️  Este proceso:"
echo "  1. Creará backup de datos existentes"
echo "  2. Clonará el repositorio desde GitHub"
echo "  3. Configurará el sistema para docker.website"
echo "  4. Restaurará sesiones y datos críticos"
echo "  5. Iniciará el servicio con PM2"
echo ""
echo "🔄 Iniciando en 3 segundos..."
echo "⚠️  Presiona Ctrl+C para cancelar"
sleep 3

# Ejecutar el script de importación
if [ -f "whatsapp-api/scripts/import-from-github.sh" ]; then
    bash whatsapp-api/scripts/import-from-github.sh
else
    echo -e "${RED}❌ Script de importación no encontrado${NC}"
    echo "💡 Asegúrate de estar en el directorio correcto"
    exit 1
fi