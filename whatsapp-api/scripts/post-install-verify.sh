#!/bin/bash

echo "🔍 VERIFICACIÓN POST-INSTALACIÓN COMPLETA"
echo "========================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Función para verificar y reportar
check_item() {
    local description="$1"
    local command="$2"
    local expected="$3"
    
    echo -n -e "${YELLOW}🔍 Verificando $description... ${NC}"
    
    result=$(eval "$command" 2>/dev/null)
    status=$?
    
    if [ $status -eq 0 ] && [[ "$result" == *"$expected"* || -z "$expected" ]]; then
        echo -e "${GREEN}✅${NC}"
        return 0
    else
        echo -e "${RED}❌${NC}"
        echo -e "   ${RED}Resultado: $result${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Función para verificar archivos
check_file() {
    local description="$1"
    local filepath="$2"
    local should_exist="$3"
    
    echo -n -e "${YELLOW}🔍 Verificando $description... ${NC}"
    
    if [ "$should_exist" = "true" ]; then
        if [ -e "$filepath" ]; then
            echo -e "${GREEN}✅${NC}"
            return 0
        else
            echo -e "${RED}❌ No encontrado${NC}"
            ((ERRORS++))
            return 1
        fi
    else
        if [ ! -e "$filepath" ]; then
            echo -e "${GREEN}✅${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Existe cuando no debería${NC}"
            ((WARNINGS++))
            return 1
        fi
    fi
}

echo -e "${BLUE}🚀 Iniciando verificación completa...${NC}"
echo ""

# 1. VERIFICACIÓN DEL SISTEMA
echo -e "${BLUE}📦 1. VERIFICACIÓN DEL SISTEMA${NC}"
check_item "Node.js" "node --version" "v"
check_item "npm" "npm --version" ""
check_item "PM2" "pm2 --version" ""
check_item "Git" "git --version" "git version"

echo ""

# 2. VERIFICACIÓN DE ARCHIVOS CRÍTICOS
echo -e "${BLUE}📁 2. VERIFICACIÓN DE ARCHIVOS CRÍTICOS${NC}"
check_file "server.js" "server.js" "true"
check_file "package.json" "package.json" "true"
check_file ".env" ".env" "true"
check_file "ecosystem.config.js" "ecosystem.config.js" "true"

echo ""

# 3. VERIFICACIÓN DE DIRECTORIOS
echo -e "${BLUE}📂 3. VERIFICACIÓN DE DIRECTORIOS${NC}"
check_file "sessions" "sessions" "true"
check_file ".wwebjs_auth" ".wwebjs_auth" "true"
check_file ".wwebjs_cache" ".wwebjs_cache" "true"
check_file "public/uploads" "public/uploads" "true"
check_file "logs" "logs" "true"
check_file "backups" "backups" "true"

echo ""

# 4. VERIFICACIÓN DE PM2
echo -e "${BLUE}🔧 4. VERIFICACIÓN DE PM2${NC}"
check_item "PM2 whatsapp-api activo" "pm2 list | grep whatsapp-api | grep online" "online"

# Obtener PID si está corriendo
PM2_PID=$(pm2 list | grep whatsapp-api | awk '{print $4}' | head -1)
if [ ! -z "$PM2_PID" ] && [ "$PM2_PID" != "-" ]; then
    echo -e "${GREEN}✅ PM2 PID: $PM2_PID${NC}"
else
    echo -e "${RED}❌ PM2 no tiene PID válido${NC}"
    ((ERRORS++))
fi

echo ""

# 5. VERIFICACIÓN DEL SERVIDOR
echo -e "${BLUE}🌐 5. VERIFICACIÓN DEL SERVIDOR${NC}"

# Esperar un poco para que el servidor inicie
sleep 3

check_item "Servidor principal (puerto 3000)" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" "200"
check_item "Endpoint /info" "curl -s http://localhost:3000/info | grep -o 'success'" "success"

# Verificar endpoints de la API
API_BASE="http://localhost:3000/api"
API_KEY="whatsapp-api-key-2024"

check_item "API Health" "curl -s -H 'X-API-Key: $API_KEY' '$API_BASE/health' | grep -o 'ok'" "ok"
check_item "API Sessions" "curl -s -H 'X-API-Key: $API_KEY' '$API_BASE/sessions' | grep -o 'success'" "success"

echo ""

# 6. VERIFICACIÓN DE SESIONES WHATSAPP
echo -e "${BLUE}📱 6. VERIFICACIÓN DE SESIONES WHATSAPP${NC}"

if [ -d "sessions" ]; then
    SESSION_COUNT=$(find sessions -name "*.json" 2>/dev/null | wc -l)
    echo -e "${BLUE}📊 Sesiones encontradas: $SESSION_COUNT${NC}"
    
    if [ $SESSION_COUNT -gt 0 ]; then
        echo -e "${GREEN}✅ Sesiones WhatsApp presentes${NC}"
        
        # Listar sesiones
        echo -e "${YELLOW}📋 Lista de sesiones:${NC}"
        find sessions -name "*.json" 2>/dev/null | while read session; do
            session_name=$(basename "$session" .json)
            echo -e "   📱 $session_name"
        done
    else
        echo -e "${YELLOW}⚠️  No hay sesiones configuradas (normal en instalación limpia)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ Directorio de sesiones no encontrado${NC}"
    ((ERRORS++))
fi

echo ""

# 7. VERIFICACIÓN DE LOGS
echo -e "${BLUE}📋 7. VERIFICACIÓN DE LOGS${NC}"

if [ -d "logs" ]; then
    LOG_COUNT=$(find logs -name "*.log" 2>/dev/null | wc -l)
    echo -e "${BLUE}📊 Archivos de log: $LOG_COUNT${NC}"
    
    # Verificar logs recientes de PM2
    RECENT_LOGS=$(pm2 logs whatsapp-api --lines 10 --nostream 2>/dev/null | grep -c "error\|Error\|ERROR" || echo "0")
    echo -e "${BLUE}🔍 Errores recientes en logs: $RECENT_LOGS${NC}"
    
    if [ "$RECENT_LOGS" -eq 0 ]; then
        echo -e "${GREEN}✅ Sin errores recientes en logs${NC}"
    else
        echo -e "${YELLOW}⚠️  Se encontraron $RECENT_LOGS errores en logs recientes${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

# 8. VERIFICACIÓN DE CONFIGURACIÓN
echo -e "${BLUE}⚙️  8. VERIFICACIÓN DE CONFIGURACIÓN${NC}"

if [ -f ".env" ]; then
    # Verificar variables críticas en .env
    ENV_VARS=("PORT" "API_KEY" "SERVER_IP" "SESSIONS_DIR")
    for var in "${ENV_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            echo -e "${GREEN}✅ Variable $var configurada${NC}"
        else
            echo -e "${RED}❌ Variable $var no encontrada en .env${NC}"
            ((ERRORS++))
        fi
    done
fi

echo ""

# 9. VERIFICACIÓN DE PERMISOS
echo -e "${BLUE}🔐 9. VERIFICACIÓN DE PERMISOS${NC}"

PERM_DIRS=("sessions" ".wwebjs_auth" ".wwebjs_cache" "public/uploads" "logs")
for dir in "${PERM_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        PERMS=$(stat -f "%Lp" "$dir" 2>/dev/null || stat -c "%a" "$dir" 2>/dev/null)
        if [ "$PERMS" = "755" ] || [ "$PERMS" = "755" ]; then
            echo -e "${GREEN}✅ Permisos correctos para $dir ($PERMS)${NC}"
        else
            echo -e "${YELLOW}⚠️  Permisos de $dir: $PERMS (se esperaba 755)${NC}"
            ((WARNINGS++))
        fi
    fi
done

echo ""

# RESUMEN FINAL
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📊 RESUMEN DE VERIFICACIÓN${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 VERIFICACIÓN EXITOSA - Sistema 100% funcional${NC}"
    
    echo ""
    echo -e "${YELLOW}🌐 Accesos disponibles:${NC}"
    echo -e "   📱 Principal: http://localhost:3000"
    echo -e "   👨‍💼 Admin: http://localhost:3000/admin"
    echo -e "   📊 Dashboard: http://localhost:3000/dashboard"
    echo -e "   🔑 API Key: whatsapp-api-key-2024"
    
    echo ""
    echo -e "${YELLOW}📋 Comandos útiles:${NC}"
    echo -e "   pm2 status              # Ver estado"
    echo -e "   pm2 logs whatsapp-api   # Ver logs"
    echo -e "   pm2 restart whatsapp-api # Reiniciar"
    
    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Advertencias encontradas: $WARNINGS${NC}"
        echo -e "${YELLOW}   El sistema funciona pero revisa los warnings arriba${NC}"
    fi
    
    exit 0
else
    echo -e "${RED}❌ VERIFICACIÓN FALLIDA${NC}"
    echo -e "${RED}   Errores encontrados: $ERRORS${NC}"
    echo -e "${RED}   Advertencias: $WARNINGS${NC}"
    echo ""
    echo -e "${YELLOW}💡 Soluciones sugeridas:${NC}"
    echo -e "   1. Revisar logs: pm2 logs whatsapp-api"
    echo -e "   2. Reiniciar servicios: pm2 restart whatsapp-api"
    echo -e "   3. Verificar configuración en .env"
    echo -e "   4. Ejecutar: bash scripts/complete-reinstall.sh"
    
    exit 1
fi