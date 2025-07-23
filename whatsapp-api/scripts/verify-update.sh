#!/bin/bash

echo "🔍 Verificando actualización..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SERVER_URL="https://docker.website"
API_KEY="whatsapp-api-key-2024"
ERRORS=0

echo -e "${BLUE}📋 Ejecutando verificaciones post-actualización...${NC}"

# Verificación 1: PM2 Status
echo -e "${YELLOW}1️⃣  Verificando estado de PM2...${NC}"
if command -v pm2 &> /dev/null; then
    pm2_status=$(pm2 jlist | jq -r '.[] | select(.name=="whatsapp-api") | .pm2_env.status' 2>/dev/null)
    if [ "$pm2_status" = "online" ]; then
        echo -e "${GREEN}✅ PM2: whatsapp-api está online${NC}"
    else
        echo -e "${RED}❌ PM2: whatsapp-api no está online (estado: $pm2_status)${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  PM2 no encontrado${NC}"
fi

# Verificación 2: Servidor responde
echo -e "${YELLOW}2️⃣  Verificando respuesta del servidor...${NC}"
http_status=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL" --max-time 10)
if [ "$http_status" = "200" ]; then
    echo -e "${GREEN}✅ Servidor responde correctamente (HTTP $http_status)${NC}"
else
    echo -e "${RED}❌ Servidor no responde correctamente (HTTP $http_status)${NC}"
    ((ERRORS++))
fi

# Verificación 3: API Health endpoint
echo -e "${YELLOW}3️⃣  Verificando endpoint de salud de la API...${NC}"
health_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$SERVER_URL/api/health" --max-time 10)
if echo "$health_response" | grep -q "ok"; then
    echo -e "${GREEN}✅ API Health: OK${NC}"
else
    echo -e "${RED}❌ API Health: Error o no responde${NC}"
    echo -e "${RED}   Respuesta: $health_response${NC}"
    ((ERRORS++))
fi

# Verificación 4: Endpoint de información del servidor
echo -e "${YELLOW}4️⃣  Verificando información del servidor...${NC}"
info_response=$(curl -s "$SERVER_URL/info" --max-time 10)
if echo "$info_response" | grep -q "version"; then
    echo -e "${GREEN}✅ Info endpoint funciona correctamente${NC}"
    version=$(echo "$info_response" | jq -r '.version' 2>/dev/null || echo "No disponible")
    echo -e "${BLUE}   Versión: $version${NC}"
else
    echo -e "${RED}❌ Info endpoint no responde correctamente${NC}"
    ((ERRORS++))
fi

# Verificación 5: Listar sesiones activas
echo -e "${YELLOW}5️⃣  Verificando sesiones activas...${NC}"
sessions_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$SERVER_URL/api/sessions" --max-time 10)
if [ $? -eq 0 ]; then
    session_count=$(echo "$sessions_response" | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ API de sesiones responde (${session_count} sesiones activas)${NC}"
    
    if [ "$session_count" -gt 0 ]; then
        echo -e "${BLUE}   Sesiones activas:${NC}"
        echo "$sessions_response" | jq -r '.[] | "   - \(.sessionId): \(.status)"' 2>/dev/null || echo "   - Error parseando sesiones"
    fi
else
    echo -e "${RED}❌ Error consultando sesiones${NC}"
    ((ERRORS++))
fi

# Verificación 6: Webhooks configurados
echo -e "${YELLOW}6️⃣  Verificando webhooks configurados...${NC}"
webhooks_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$SERVER_URL/api/webhooks" --max-time 10)
if [ $? -eq 0 ]; then
    webhook_count=$(echo "$webhooks_response" | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ API de webhooks responde (${webhook_count} webhooks configurados)${NC}"
    
    if [ "$webhook_count" -gt 0 ]; then
        echo -e "${BLUE}   Webhooks configurados:${NC}"
        echo "$webhooks_response" | jq -r '.[] | "   - \(.sessionId): \(.webhookUrl)"' 2>/dev/null || echo "   - Error parseando webhooks"
    fi
else
    echo -e "${RED}❌ Error consultando webhooks${NC}"
    ((ERRORS++))
fi

# Verificación 7: Directorios críticos
echo -e "${YELLOW}7️⃣  Verificando directorios críticos...${NC}"
CRITICAL_DIRS=("sessions" ".wwebjs_auth" ".wwebjs_cache" "public/uploads" "data")
for dir in "${CRITICAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ Directorio existe: $dir${NC}"
    else
        echo -e "${RED}❌ Directorio faltante: $dir${NC}"
        mkdir -p "$dir"
        echo -e "${YELLOW}   ↳ Directorio creado${NC}"
    fi
done

# Verificación 8: Archivos de configuración
echo -e "${YELLOW}8️⃣  Verificando archivos de configuración...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Archivo .env existe${NC}"
else
    echo -e "${RED}❌ Archivo .env faltante${NC}"
    ((ERRORS++))
fi

if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ Archivo package.json existe${NC}"
else
    echo -e "${RED}❌ Archivo package.json faltante${NC}"
    ((ERRORS++))
fi

# Verificación 9: Dependencias
echo -e "${YELLOW}9️⃣  Verificando dependencias...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${RED}❌ Dependencias no instaladas${NC}"
    ((ERRORS++))
fi

# Verificación 10: Logs recientes
echo -e "${YELLOW}🔟 Verificando logs recientes...${NC}"
if command -v pm2 &> /dev/null; then
    recent_errors=$(pm2 logs whatsapp-api --lines 50 --nostream 2>/dev/null | grep -i error | wc -l)
    if [ "$recent_errors" -lt 5 ]; then
        echo -e "${GREEN}✅ Logs: Pocos errores recientes ($recent_errors)${NC}"
    else
        echo -e "${YELLOW}⚠️  Logs: Varios errores recientes ($recent_errors)${NC}"
        echo -e "${BLUE}   💡 Revisa logs con: pm2 logs whatsapp-api${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No se pueden verificar logs (PM2 no disponible)${NC}"
fi

# Resumen final
echo ""
echo -e "${BLUE}📊 Resumen de verificación:${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Todas las verificaciones pasaron correctamente${NC}"
    echo -e "${GREEN}🎉 La actualización fue exitosa${NC}"
    echo ""
    echo -e "${BLUE}🌐 Accesos:${NC}"
    echo -e "${BLUE}   • Web: $SERVER_URL${NC}"
    echo -e "${BLUE}   • Admin: $SERVER_URL/admin${NC}"
    echo -e "${BLUE}   • API Key: $API_KEY${NC}"
    echo ""
    echo -e "${BLUE}📋 Comandos útiles:${NC}"
    echo -e "${BLUE}   • Ver estado: pm2 status${NC}"
    echo -e "${BLUE}   • Ver logs: pm2 logs whatsapp-api${NC}"
    echo -e "${BLUE}   • Reiniciar: pm2 restart whatsapp-api${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS verificaciones fallaron${NC}"
    echo -e "${YELLOW}💡 Revisa los errores y considera hacer rollback si es necesario${NC}"
    echo -e "${YELLOW}🔄 Para rollback: bash scripts/rollback.sh${NC}"
    exit 1
fi