#!/bin/bash

echo "🚀 Instalando WhatsApp Multi-Session API para Ubuntu"
echo "=================================================="

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Este script debe ejecutarse como root (sudo)"
    exit 1
fi

# Actualizar sistema
echo "📦 Actualizando paquetes del sistema..."
apt update -y

# Instalar Node.js y npm si no están instalados
if ! command -v node &> /dev/null; then
    echo "🟢 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js ya está instalado: $(node --version)"
fi

# Instalar dependencias básicas
echo "🔧 Instalando dependencias básicas..."
apt-get install -y \
    wget \
    curl \
    unzip \
    software-properties-common

# Instalar dependencias mínimas para Puppeteer
echo "🎭 Instalando dependencias mínimas para Puppeteer..."
apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils

# NO instalar Chromium del sistema, dejar que Puppeteer use su propia versión
echo "ℹ️  Configurando para usar Chromium integrado de Puppeteer..."

# Instalar PM2 para gestión de procesos
echo "🔄 Instalando PM2..."
npm install -g pm2

# Verificar instalaciones
echo "🔍 Verificando instalaciones..."
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version)"

# Configurar límites del sistema para evitar problemas
echo "⚙️  Configurando límites del sistema..."
cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536  
* hard nproc 65536
EOF

echo ""
echo "✅ Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ir al directorio de tu aplicación WhatsApp"
echo "2. Ejecutar: npm install"
echo "3. Opcional: cp .env.example .env"
echo "4. Ejecutar: node server.js"
echo ""
echo "⚠️  IMPORTANTE:"
echo "- NO se instaló Chromium del sistema"
echo "- Puppeteer descargará su propia versión de Chromium"
echo "- Esto evita conflictos de dependencias"
echo ""
echo "🚀 Comando rápido:"
echo "   npm install && node server.js"