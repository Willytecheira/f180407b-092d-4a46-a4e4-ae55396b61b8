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

# Instalar dependencias del sistema para Puppeteer/Chromium
echo "🔧 Instalando dependencias del sistema para Puppeteer..."
apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxinerama1 \
    libxtst6 \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xvfb \
    libgbm-dev \
    libxshmfence1 \
    chromium-browser

# Instalar PM2 para gestión de procesos (opcional)
echo "🔄 Instalando PM2 para gestión de procesos..."
npm install -g pm2

# Crear usuario para ejecutar la aplicación (opcional, por seguridad)
if ! id "whatsapp" &>/dev/null; then
    echo "👤 Creando usuario 'whatsapp' para ejecutar la aplicación..."
    useradd -r -s /bin/false whatsapp
fi

# Crear directorio de la aplicación
APP_DIR="/opt/whatsapp-api"
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creando directorio de la aplicación en $APP_DIR"
    mkdir -p $APP_DIR
    chown whatsapp:whatsapp $APP_DIR
fi

echo ""
echo "✅ Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Copia los archivos de la aplicación al directorio deseado"
echo "2. Ejecuta: npm install"
echo "3. Opcional: cp .env.example .env (y configura las variables)"
echo "4. Ejecuta: node server.js"
echo ""
echo "💡 Para producción, se recomienda usar PM2:"
echo "   pm2 start server.js --name whatsapp-api"
echo "   pm2 startup"
echo "   pm2 save"
echo ""