#!/bin/bash

echo "⚡ Setup rápido de WhatsApp Multi-Session API"
echo "============================================"

# Verificar si se ejecuta como root para la instalación del sistema
if [ "$EUID" -eq 0 ]; then
    echo "🔧 Instalando dependencias del sistema..."
    bash install.sh
    echo ""
    echo "⚠️  Ahora ejecuta este script SIN sudo para continuar"
    echo "   bash quick-setup.sh"
    exit 0
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Ejecuta primero: sudo bash quick-setup.sh"
    exit 1
fi

echo "📦 Instalando dependencias de Node.js..."
npm install

echo "📝 Configurando entorno..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Archivo .env creado"
fi

echo "📁 Creando directorios..."
mkdir -p sessions .wwebjs_auth .wwebjs_cache
chmod 755 sessions .wwebjs_auth .wwebjs_cache

echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "🚀 Para iniciar la aplicación:"
echo "   node server.js"
echo ""
echo "🌐 Acceso web: http://localhost:3000"
echo "🔑 API Key: whatsapp-api-key-2024"
echo ""

read -p "¿Quieres iniciar la aplicación ahora? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Iniciando..."
    node server.js
fi