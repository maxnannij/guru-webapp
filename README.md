# Gurú Box — Turnos & WOD

PWA para reserva de turnos, cupos, tokens y WOD del día (Gurú Box Cross Training, Roma 2607, Caseros).

Stack: Vite + React + TypeScript + Firebase + vite-plugin-pwa.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar GEMINI_API_KEY si lo usás
npm run dev
```

Abre http://localhost:3000

## Build

```bash
npm run build
# salida en dist/
```

## Deploy en Netlify

El repo ya incluye `netlify.toml` y `public/_redirects`.

1. En Netlify: **Add new site → Import an existing project** → conectar este repo.
2. Build command: `npm run build` · Publish directory: `dist` (ya vienen en `netlify.toml`).
3. Variables de entorno (si las necesitás):
   - `GEMINI_API_KEY` — solo si usás Gemini en producción
   - `APP_URL` — URL final del sitio (opcional)
4. En Firebase Console → Authentication → Settings → **Authorized domains**: agregá tu dominio `*.netlify.app` (y el custom si tenés).
5. Deploy.

Firebase config está en `firebase-applet-config.json` (cliente). Las reglas de Firestore están en `firestore.rules` — desplegalas en el proyecto Firebase si aún no están aplicadas.
