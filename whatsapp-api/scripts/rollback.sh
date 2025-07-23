#!/bin/bash

echo "🔄 Ejecutando rollback de la aplicación..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para rollback de Git
git_rollback() {
    echo -e "${YELLOW}📚 Ejecutando rollback de Git...${NC}"
    
    # Obtener el commit anterior
    previous_commit=$(git log --oneline -2 | tail -1 | cut -d' ' -f1)
    
    if [ -z "$previous_commit" ]; then
        echo -e "${RED}❌ No se pudo encontrar commit anterior${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📍 Commit anterior: $previous_commit${NC}"
    
    # Confirmar rollback
    read -p "¿Hacer rollback a $previous_commit? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏸️  Rollback cancelado${NC}"
        return 1
    fi
    
    # Ejecutar rollback
    git reset --hard "$previous_commit"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Rollback de Git completado${NC}"
        return 0
    else
        echo -e "${RED}❌ Error en rollback de Git${NC}"
        return 1
    fi
}

# Función para restaurar desde backup
backup_rollback() {
    echo -e "${YELLOW}💾 Ejecutando rollback desde backup...${NC}"
    
    if [ ! -f ".last_backup" ]; then
        echo -e "${RED}❌ No se encontró referencia al último backup${NC}"
        echo -e "${BLUE}💡 Backups disponibles:${NC}"
        ls -la backups/*.tar.gz 2>/dev/null || echo "No hay backups disponibles"
        return 1
    fi
    
    backup_file=$(cat .last_backup)
    echo -e "${BLUE}📦 Usando backup: $backup_file${NC}"
    
    # Confirmar rollback
    read -p "¿Restaurar desde $backup_file? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏸️  Rollback cancelado${NC}"
        return 1
    fi
    
    # Ejecutar restauración
    bash scripts/restore-data.sh
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Rollback desde backup completado${NC}"
        return 0
    else
        echo -e "${RED}❌ Error en rollback desde backup${NC}"
        return 1
    fi
}

# Main script
echo -e "${BLUE}📋 Opciones de rollback disponibles:${NC}"
echo "1. Rollback de Git (volver al commit anterior)"
echo "2. Rollback desde backup (restaurar datos desde backup)"
echo "3. Rollback completo (Git + backup)"
echo "4. Cancelar"

read -p "Selecciona una opción (1-4): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo -e "${YELLOW}🔄 Iniciando rollback de Git...${NC}"
        git_rollback
        if [ $? -eq 0 ]; then
            echo -e "${YELLOW}📦 Reinstalando dependencias...${NC}"
            npm install
            
            echo -e "${YELLOW}🔄 Reiniciando aplicación...${NC}"
            if command -v pm2 &> /dev/null; then
                pm2 restart whatsapp-api
            fi
            
            echo -e "${GREEN}✅ Rollback de Git completado${NC}"
        fi
        ;;
    2)
        echo -e "${YELLOW}🔄 Iniciando rollback desde backup...${NC}"
        backup_rollback
        if [ $? -eq 0 ]; then
            echo -e "${YELLOW}🔄 Reiniciando aplicación...${NC}"
            if command -v pm2 &> /dev/null; then
                pm2 restart whatsapp-api
            fi
            
            echo -e "${GREEN}✅ Rollback desde backup completado${NC}"
        fi
        ;;
    3)
        echo -e "${YELLOW}🔄 Iniciando rollback completo...${NC}"
        
        # Primero Git rollback
        git_rollback
        git_success=$?
        
        # Luego backup rollback
        backup_rollback
        backup_success=$?
        
        if [ $git_success -eq 0 ] && [ $backup_success -eq 0 ]; then
            echo -e "${YELLOW}📦 Reinstalando dependencias...${NC}"
            npm install
            
            echo -e "${YELLOW}🔄 Reiniciando aplicación...${NC}"
            if command -v pm2 &> /dev/null; then
                pm2 restart whatsapp-api
            fi
            
            echo -e "${GREEN}✅ Rollback completo exitoso${NC}"
        else
            echo -e "${RED}❌ Rollback completo falló${NC}"
            exit 1
        fi
        ;;
    4)
        echo -e "${YELLOW}⏸️  Rollback cancelado${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

# Verificar estado después del rollback
echo -e "${YELLOW}🔍 Verificando estado después del rollback...${NC}"
sleep 3
bash scripts/verify-update.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 Rollback completado y verificado exitosamente${NC}"
else
    echo -e "${RED}⚠️  Rollback completado pero la verificación detectó problemas${NC}"
    echo -e "${BLUE}💡 Revisa los logs: pm2 logs whatsapp-api${NC}"
fi