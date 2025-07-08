
# Imagen base de Node.js
FROM node:18-slim

# Instalar dependencias del sistema para Puppeteer y Chrome
RUN apt-get update && apt-get install -y \
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --only=production

# Instalar Chromium explícitamente para Puppeteer
RUN apt-get update && apt-get install -y chromium \
    && rm -rf /var/lib/apt/lists/*

# Copiar código fuente
COPY . .

# Usuario no root para seguridad
RUN groupadd -r whatsapp && useradd -r -g whatsapp -s /bin/false whatsapp

# Crear directorios para sesiones con permisos correctos
RUN mkdir -p sessions .wwebjs_auth .wwebjs_cache
RUN mkdir -p /usr/src/app/.wwebjs_auth && chmod -R 777 /usr/src/app/.wwebjs_auth
RUN mkdir -p /usr/src/app/.wwebjs_cache && chmod -R 777 /usr/src/app/.wwebjs_cache
RUN mkdir -p /usr/src/app/sessions && chmod -R 777 /usr/src/app/sessions
RUN chown -R whatsapp:whatsapp /usr/src/app
USER whatsapp

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
ENV API_KEY=whatsapp-api-key-2024
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Comando de inicio
CMD ["node", "server.js"]
