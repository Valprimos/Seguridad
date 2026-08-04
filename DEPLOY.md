# Desplegar en la web (no en localhost)

Esta app tiene dos partes que se despliegan **por separado**:

- `server/` → API Node/Express + SQLite. Necesita un servicio que ejecute
  un proceso Node de forma continua (SQLite vía `better-sqlite3` es un
  módulo nativo, así que **no** sirve un hosting "serverless" tipo
  Vercel Functions). Recomendado: **Render** o **Railway** (tienen plan
  gratuito).
- `client/` → SPA estática generada con Vite. Cualquier hosting estático
  vale: **Vercel**, **Netlify**, **Cloudflare Pages**, GitHub Pages, etc.

## 1. Backend (ejemplo con Render)

1. En [render.com](https://render.com) → **New → Web Service** → conecta
   tu repo de GitHub.
2. Configúralo así:
   - **Root directory:** `server`
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
3. En **Environment**, añade la variable `CORS_ORIGIN` con la URL que
   tendrá tu frontend (la sabrás en el paso 2; puedes rellenarla después
   y volver a desplegar). Ejemplo:
   `CORS_ORIGIN=https://mi-surebets.vercel.app`
4. Despliega. Copia la URL pública que te da Render, algo como
   `https://mi-surebets-api.onrender.com`.

> ⚠️ **Persistencia de SQLite:** en el plan gratuito de Render el disco
> es efímero (se resetea en cada redeploy). Para conservar el historial
> entre despliegues, añade un **Render Disk** montado en `server/` (Render
> → tu servicio → *Disks*), o migra a PostgreSQL cuando lo necesites
> (la carpeta `server/src/db/` está aislada justo para facilitar ese
> cambio).

## 2. Frontend (ejemplo con Vercel)

1. En [vercel.com](https://vercel.com) → **Add New → Project** → conecta
   el mismo repo.
2. Configúralo así:
   - **Root directory:** `client`
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. En **Environment Variables**, añade:
   `VITE_API_URL=https://mi-surebets-api.onrender.com/api`
   (la URL del backend del paso 1, terminada en `/api`).
4. Despliega. Vercel te da una URL pública, ej. `https://mi-surebets.vercel.app`.
5. Vuelve a Render y actualiza `CORS_ORIGIN` con esa URL exacta, luego
   redespliega el backend para que el navegador no bloquee las peticiones.

## 3. Comprobación

Abre la URL del frontend. El Dashboard debería cargar surebets DEMO a
los pocos segundos. Si ves errores de red en la consola del navegador:

- Revisa que `VITE_API_URL` apunta a la URL correcta del backend (con `/api` al final).
- Revisa que `CORS_ORIGIN` en el backend coincide EXACTAMENTE con el dominio del frontend (incluyendo `https://`, sin `/` final).
- Comprueba `https://tu-backend.onrender.com/api/health` directamente en el navegador; debe responder `{"status":"ok","demo":true}`.

## Desarrollo local (sin cambios)

Sigue funcionando igual que antes:

```bash
npm run install:all
npm run dev
```
