# TOR Bazar - Local server for data persistence

This repository contains a static frontend (`index.html`) and a small Node.js server that persists sales data to `data.xlsx`.

## Requisitos
- Node.js (v14+ recommended)

## Instalar y ejecutar (PowerShell)

### 1. Configurar variables de entorno

Copia `.env.example` a `.env` y rellena tus valores:

```powershell
cp .env.example .env
# Edita .env con tus credenciales de Supabase
```

### 2. Instalar dependencias y ejecutar

```powershell
cd 'C:\Users\Ema\Torbazar'
npm install
npm start
```

El servidor se lanzará en `http://localhost:3000`. Abre esa URL en tu navegador (no uses directamente `file://`), así el frontend podrá cargar y guardar datos en `data.xlsx`.

## Endpoints principales
- `GET /api/ventas` - devuelve el contenido de `data.xlsx` como JSON
- `POST /api/save` - guarda un arreglo de ventas en `data.xlsx` (envía JSON con el array completo)
- `GET /api/config` - devuelve configuración de Supabase (URL y API Key) desde variables de entorno
- `GET /download` - descarga `data.xlsx`

## Seguridad

### Variables de entorno (local)
- Crear `.env` con `SUPABASE_URL` y `SUPABASE_KEY` (no se comitea a Git)
- `.env` está en `.gitignore` para evitar leaks de secretos
- El servidor carga desde `dotenv` al iniciar

### En Netlify (producción)
1. Ir a **Settings → Environment → Environment variables**
2. Añadir:
   - `SUPABASE_URL`: tu URL de Supabase
   - `SUPABASE_KEY`: tu anon key de Supabase
3. El frontend cargará automáticamente desde `/api/config` (si disponible) o desde variables globales inyectadas en build

### ¿Por qué esta arquitectura?
- **Local**: Las credentials se leen desde `.env` (archivo no rastreado en Git)
- **Netlify**: Las credentials se definen en el dashboard de Netlify (UI segura, no en código)
- **Build**: Opcionalmente, `build.js` puede inyectar variables en `script.js` antes de deployar
- **En cliente**: El frontend nunca hardcodea secrets, siempre los obtiene del servidor o variables de entorno

## Notas
- El frontend se actualizó para solicitar las ventas al iniciar y para guardar automáticamente cada vez que agregues o elimines ventas.
- En Netlify (hosting estático) se usa `Supabase` como base de datos remota para persistencia real.
- Comportamiento según entorno:
  - Local (ejecutando `server.js`): la app usa los endpoints `/api/ventas` y `/api/save` para leer/escribir `data.xlsx`.
  - Netlify (o sin API disponible): la app usa Supabase directamente desde el cliente (credentials seguras desde variables de entorno).
