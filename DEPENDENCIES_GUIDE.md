# Guía de Dependencias para Vercel

## Problema

Cuando se despliega en Vercel, pueden aparecer errores como:

```
Cannot find module 'jsonfile'
Cannot find module 'graceful-fs'
Cannot find module 'universalify'
```

Esto sucede porque Vercel no incluye automáticamente todas las dependencias transitivas en el build.

## Solución

### 1. Dependencias Principales

Las siguientes dependencias deben estar explícitamente en `package.json`:

```json
{
  "dependencies": {
    "fs-extra": "^11.3.0",
    "graceful-fs": "^4.2.11",
    "jsonfile": "^6.1.0",
    "puppeteer": "^24.15.0",
    "puppeteer-extra": "^3.3.4",
    "puppeteer-extra-plugin": "^3.2.2",
    "puppeteer-extra-plugin-stealth": "^2.11.1",
    "puppeteer-extra-plugin-user-data-dir": "^2.4.1",
    "puppeteer-extra-plugin-user-preferences": "^2.4.1",
    "universalify": "^2.0.1"
  }
}
```

### 2. Configuración de Next.js

Todas las dependencias deben estar en `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-extra",
      "puppeteer-extra-plugin",
      "puppeteer-extra-plugin-stealth",
      "puppeteer-extra-plugin-user-preferences",
      "puppeteer-extra-plugin-user-data-dir",
      "fs-extra",
      "universalify",
      "graceful-fs",
      "jsonfile",
    ],
  },

  outputFileTracingIncludes: {
    "app/api/**": [
      "./node_modules/puppeteer/**",
      "./node_modules/puppeteer-extra/**",
      "./node_modules/puppeteer-extra-plugin/**",
      "./node_modules/puppeteer-extra-plugin-stealth/**",
      "./node_modules/puppeteer-extra-plugin-user-preferences/**",
      "./node_modules/puppeteer-extra-plugin-user-data-dir/**",
      "./node_modules/fs-extra/**",
      "./node_modules/universalify/**",
      "./node_modules/graceful-fs/**",
      "./node_modules/jsonfile/**",
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin",
        "puppeteer-extra-plugin-stealth",
        "puppeteer-extra-plugin-user-preferences",
        "puppeteer-extra-plugin-user-data-dir",
        "fs-extra",
        "universalify",
        "graceful-fs",
        "jsonfile",
      ];
    }
    return config;
  },
};
```

## Verificación

### Script de Verificación

Ejecuta el script para verificar que todas las dependencias estén correctamente configuradas:

```bash
npm run check-deps
```

### Comandos Útiles

```bash
# Verificar dependencias transitivas
npm ls jsonfile
npm ls graceful-fs
npm ls universalify

# Instalar dependencias
npm install

# Verificar build local
npm run build
```

## Dependencias Críticas

Las siguientes dependencias son **CRÍTICAS** y deben estar siempre en ambos archivos:

- ✅ `jsonfile` - Para operaciones JSON con fs-extra
- ✅ `graceful-fs` - Para operaciones de archivos robustas
- ✅ `universalify` - Para compatibilidad entre módulos
- ✅ `fs-extra` - Para operaciones de archivos extendidas
- ✅ `puppeteer-extra-plugin` - Base para plugins de puppeteer

## Prevención

1. **Antes de cada deploy**: Ejecuta `npm run check-deps`
2. **Al agregar nuevas dependencias**: Verifica si tienen dependencias transitivas
3. **Después de `npm install`**: Ejecuta el script de verificación

## Troubleshooting

### Error: "Cannot find module 'X'"

1. Verifica si `X` está en `package.json`
2. Verifica si `X` está en `next.config.ts`
3. Ejecuta `npm install`
4. Ejecuta `npm run check-deps`

### Dependencias Faltantes

Si el script detecta dependencias faltantes:

1. Agrega la dependencia a `package.json`
2. Agrega la dependencia a `next.config.ts`
3. Ejecuta `npm install`
4. Verifica con `npm run check-deps`

## Notas Importantes

- Las dependencias de desarrollo (como `@tailwindcss/node`) no necesitan estar en `next.config.ts`
- Solo las dependencias que se usan en el servidor necesitan configuración especial
- Siempre prueba el build local antes de hacer deploy: `npm run build`
