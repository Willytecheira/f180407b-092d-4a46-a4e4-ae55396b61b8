#!/bin/bash

echo "🚀 Iniciando WhatsApp Multi-Session API"
echo "====================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Ejecuta primero: sudo bash install.sh"
    exit 1
fi

# Crear directorios necesarios
echo "📁 Verificando directorios..."
mkdir -p sessions .wwebjs_auth .wwebjs_cache

# Configurar permisos
chmod 755 sessions .wwebjs_auth .wwebjs_cache

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env desde .env.example..."
    cp .env.example .env
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de Node.js..."
    npm install
fi

# Verificar package.json
if [ ! -f "package.json" ]; then
    echo "❌ No se encontró package.json en el directorio actual"
    exit 1
fi

echo ""
echo "✅ Todo listo. Iniciando servidor..."
echo "🌐 La aplicación estará disponible en: http://localhost:3000"
echo "🔑 API Key: whatsapp-api-key-2024"
echo ""
echo "💡 Para detener: Ctrl+C"
echo "📊 Para producción usa: pm2 start server.js --name whatsapp-api"
echo ""

# Iniciar servidor
node server.js