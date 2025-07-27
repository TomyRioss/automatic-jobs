# GetaJob Backend

Este proyecto es el backend de la aplicación GetaJob, una herramienta para automatizar la búsqueda y postulación a ofertas de trabajo en diferentes plataformas como LinkedIn, Bumeran y Zonajobs.

## Funcionalidades Principales

- **Automatización de Postulaciones**: Inicia sesión y postula automáticamente a ofertas de trabajo que coincidan con las palabras clave proporcionadas.
- **Soporte Multiplataforma**: Actualmente compatible con LinkedIn, Bumeran y Zonajobs.
- **Manejo de Sesiones**: Detecta si ya existe una sesión activa para evitar inicios de sesión innecesarios.
- **Inicio de Sesión Manual Asistido**: Para plataformas como LinkedIn que pueden requerir autenticación adicional (MFA), el sistema esperará a que el usuario inicie sesión manualmente en la ventana del navegador que se abre.
- **Reporte de Resultados**: Al finalizar, la API devuelve un resumen de las postulaciones exitosas y aquellas que requieren una revisión manual.

## Instalación

Primero, instala las dependencias del proyecto:

```bash
npm install
```

## Configuración

### Variables de Entorno

El proyecto utiliza variables de entorno para configurar la ruta del ejecutable de Puppeteer en producción. Consulta el archivo `ENV_EXAMPLE.md` para más detalles sobre las variables disponibles.

Crea un archivo `.env` en la raíz del proyecto basándote en el ejemplo proporcionado.

### Inicio de Sesión en LinkedIn

Debido a las medidas de seguridad de LinkedIn, el primer inicio de sesión o los inicios de sesión posteriores pueden requerir que resuelvas un captcha o introduzcas un código de autenticación de dos factores (2FA).

La aplicación está preparada para esto. Abrirá una ventana de navegador y esperará a que completes el inicio de sesión manualmente. Una vez que hayas iniciado sesión, el proceso de postulación automática continuará.

## Ejecución

Para ejecutar el servidor de desarrollo:

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
# o
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

## Uso de la API

Para iniciar el proceso de postulación, debes enviar una petición `POST` al endpoint `/api/apply`.

**Endpoint**: `POST /api/apply`

**Body (JSON)**:

```json
{
  "platform": "linkedin",
  "email": "tu-email@example.com",
  "password": "tu-contraseña",
  "keywords": "developer, frontend, react"
}
```

**Parámetros**:

- `platform`: La plataforma en la que buscar (valores posibles: `linkedin`, `bumeran`, `zonajobs`).
- `email`: Tu email de usuario para la plataforma.
- `password`: Tu contraseña para la plataforma.
- `keywords`: Una lista de palabras clave separadas por comas para buscar ofertas.

**Respuesta**:

```json
{
  "message": "Proceso finalizado para linkedin. Postulaciones exitosas: 5. Para revisar: 2.",
  "appliedJobs": [...],
  "reviewJobs": [...]
}
```

## Tecnologías Utilizadas

- [Next.js](https://nextjs.org/) - Framework de React para aplicaciones web
- [Puppeteer](https://pptr.dev/) - Biblioteca para automatización de navegador
- [TypeScript](https://www.typescriptlang.org/) - Superset de JavaScript con tipado estático
