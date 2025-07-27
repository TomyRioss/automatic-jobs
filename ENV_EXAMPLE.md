# Variables de Entorno - GetaJob Backend

Este archivo describe las variables de entorno necesarias para configurar el proyecto GetaJob Backend.

## Configuración del Archivo .env

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Para producción, especifica la ruta al ejecutable de Chromium.
# En desarrollo, Puppeteer usará su propia versión, por lo que esta línea puede ser omitida.
# PUPPETEER_EXECUTABLE_PATH=/path/to/your/chrome
```

## Variables Disponibles

### PUPPETEER_EXECUTABLE_PATH

**Descripción**: Ruta al ejecutable de Chromium/Chrome que Puppeteer utilizará para la automatización del navegador.

**Cuándo usarla**:

- **Desarrollo local**: No es necesaria. Puppeteer descargará automáticamente una versión compatible de Chromium.
- **Producción**: Es recomendable especificar la ruta a una instalación de Chrome/Chromium para evitar problemas de compatibilidad.

**Ejemplos de valores**:

```env
# Linux
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# macOS
PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Windows
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# Docker (si usas una imagen con Chrome)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Nota**: Si no especificas esta variable, Puppeteer utilizará su versión integrada de Chromium, que funciona bien en la mayoría de los casos de desarrollo.

## Instalación de Chrome/Chromium

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install google-chrome-stable
```

### macOS

```bash
# Usando Homebrew
brew install --cask google-chrome

# O descarga desde https://www.google.com/chrome/
```

### Windows

Descarga e instala Chrome desde https://www.google.com/chrome/

### Docker

Si estás ejecutando en un contenedor Docker, puedes usar una imagen base que incluya Chrome:

```dockerfile
FROM node:18

# Instalar Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Configurar la variable de entorno
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

## Verificación

Para verificar que la configuración es correcta, puedes ejecutar:

```bash
npm run dev
```

Y luego hacer una petición a la API. Si todo está configurado correctamente, deberías ver que se abre una ventana de Chrome y el proceso de automatización funciona sin errores.
