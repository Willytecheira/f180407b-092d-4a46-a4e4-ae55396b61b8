# Imagen base de Node.js
FROM node:18-slim

# Instalar dependencias del sistema para Puppeteer
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --only=production

# Copiar código fuente
COPY . .

# Crear directorio para sesiones
RUN mkdir -p sessions

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
ENV API_KEY=whatsapp-api-key-2024

# Usuario no root para seguridad
RUN groupadd -r whatsapp && useradd -r -g whatsapp -s /bin/false whatsapp
RUN chown -R whatsapp:whatsapp /usr/src/app
USER whatsapp

# Comando de inicio
CMD ["node", "server.js"]