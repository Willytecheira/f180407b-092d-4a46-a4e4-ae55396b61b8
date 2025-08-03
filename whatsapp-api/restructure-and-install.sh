#!/bin/bash

echo "🔧 REESTRUCTURACIÓN Y INSTALACIÓN CORRECTA"
echo "=========================================="

# Cambiar al directorio padre primero
cd ..

# Verificar que estamos en el directorio correcto
if [ ! -f "whatsapp-api/server.js" ]; then
    echo "❌ Error: Estructura incorrecta. server.js no encontrado en whatsapp-api/"
    exit 1
fi

echo "📁 Verificando estructura actual..."
echo "Directorio actual: $(pwd)"
echo "Contenido de whatsapp-api/:"
ls -la whatsapp-api/

echo ""
echo "🔄 Moviendo archivos del servidor al directorio raíz..."

# Crear backup de seguridad antes de mover
echo "📦 Creando backup de seguridad..."
BACKUP_DIR="/tmp/whatsapp-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r whatsapp-api/* "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup creado en: $BACKUP_DIR"

# Mover todos los archivos del subdirectorio al directorio raíz
echo "📁 Moviendo archivos..."
mv whatsapp-api/* . 2>/dev/null || true
mv whatsapp-api/.* . 2>/dev/null || true

# Eliminar el directorio vacío
rmdir whatsapp-api 2>/dev/null || true

echo "✅ Archivos reestructurados correctamente"

# Verificar que los archivos críticos están presentes
echo ""
echo "🔍 Verificando archivos críticos..."
REQUIRED_FILES=("server.js" "package.json" "install-complete-dashboard.sh")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - Presente"
    else
        echo "❌ $file - Faltante"
        exit 1
    fi
done

echo ""
echo "🚀 Ejecutando instalación completa..."
echo "====================================="

# Hacer ejecutable el script de instalación
chmod +x install-complete-dashboard.sh

# Ejecutar la instalación completa
./install-complete-dashboard.sh

echo ""
echo "🎉 ¡Reestructuración e instalación completada!"
echo "🌐 WhatsApp API disponible en: https://docker.website"
echo "🔑 API Key: whatsapp-api-key-2024"