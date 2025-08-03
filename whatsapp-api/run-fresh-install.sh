#!/bin/bash

echo "🚀 EJECUTANDO REINSTALACIÓN COMPLETA DESDE CERO"
echo "==============================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js no encontrado. Navega al directorio correcto."
    echo "💡 Uso: cd /root/whatsapp-api && bash run-fresh-install.sh"
    exit 1
fi

# Hacer ejecutables todos los scripts
chmod +x *.sh

echo ""
echo "🔥 Ejecutando instalación COMPLETA DESDE CERO en 3 segundos..."
echo "⚠️  Presiona Ctrl+C para cancelar"
sleep 3

# Ejecutar instalación completa desde cero
bash complete-fresh-install.sh

echo ""
echo "🎉 ¡Proceso completo terminado!"
echo "🌐 Tu WhatsApp API está disponible en: https://docker.website"