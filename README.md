# Yakedo

Yakedo es un punto de venta web gratuito para comercios de México. Cobra con CoDi, sin comisión por transacción, a través de la API de Pey, y también en efectivo.

Es una aplicación web (React, Vite y TypeScript, con Firebase), pensada primero para escritorio y tablet horizontal. Este repositorio es público: no debe contener secretos ni variables de entorno con valores reales.

La spec aprobada del núcleo está en [`openspec/changes/nucleo-yakedo`](openspec/changes/nucleo-yakedo). Rodrigo la aprobó el 21 de noviembre de 2026 a las 23:13 (America/Mexico_City).

## Requisitos

- Node.js 22 o posterior
- npm
- Java 21 o posterior (lo usan los emuladores de Firestore y de Storage)

La CLI de Firebase queda instalada como dependencia de desarrollo. El proyecto por defecto es `yakedo-pos` (`.firebaserc`).

## Instalar

```bash
npm install
npm install --prefix functions
```

## Variables

Copia `.env.example` a `.env.local` y llena la configuración web de Firebase en tu máquina. Los seis valores `VITE_` salen de la consola de Firebase del proyecto `yakedo-pos`. Sin ese archivo la pantalla de prueba igual abre: el cliente solo inicia Firebase cuando los seis están presentes.

La llave de Pey (`PEY_API_KEY`) y el secreto del webhook (`PEY_WEBHOOK_SECRET`) se guardan en Firebase Secret Manager. En el repositorio solo aparecen los nombres.

## Desarrollo

```bash
npm run dev
```

Abre el acceso en `http://127.0.0.1:5173`: bienvenida, teléfono, código SMS, Google y Ajustes. La paleta y Plus Jakarta Sans siguen en `src/estilos.css`.

Con `.env.local` completo, `npm run dev` conecta Auth, Firestore, Functions y Storage a los emuladores de `127.0.0.1`.

## Emuladores

Compila primero, porque Hosting sirve la carpeta `dist`:

```bash
npm run build
npm run emuladores
```

| Servicio   | Dirección              |
| ---------- | ---------------------- |
| Interfaz   | http://127.0.0.1:4000  |
| Hosting    | http://127.0.0.1:5000  |
| Functions  | http://127.0.0.1:5001  |
| Firestore  | 127.0.0.1:8080         |
| Auth       | 127.0.0.1:9099         |
| Storage    | 127.0.0.1:9199         |

Hosting reescribe todas las rutas a `index.html` (SPA). Las reglas de Firestore y de Storage niegan todo acceso hasta la tarea 1.6.

## Compilar

```bash
npm run build
```

Compila la web (`tsc` y Vite) y las Cloud Functions (`functions/`, salida en `functions/lib`, ignorada por git).

## Pruebas

```bash
npm test
```

Vitest corre la paleta, el acceso y, si hace falta, levanta el emulador de Auth en `127.0.0.1:9099`. El número de prueba de los jueces no se guarda en el repositorio.
