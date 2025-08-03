#!/bin/bash

echo "🚀 EJECUTANDO REINSTALACIÓN COMPLETA"
echo "===================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js no encontrado. Navega al directorio correcto."
    echo "💡 Uso: cd /root/whatsapp-api && bash run-complete-reinstall.sh"
    exit 1
fi

# Hacer ejecutables todos los scripts
chmod +x scripts/*.sh
chmod +x *.sh

echo ""
echo "🔄 Ejecutando reinstalación completa en 3 segundos..."
echo "⚠️  Presiona Ctrl+C para cancelar"
sleep 3

# Ejecutar reinstalación completa
bash scripts/complete-reinstall.sh

echo ""
echo "🔍 Ejecutando verificación post-instalación..."
bash scripts/post-install-verify.sh

echo ""
echo "🎉 ¡Proceso completo terminado!"
echo "🌐 Tu WhatsApp API está disponible en: http://localhost:3000"