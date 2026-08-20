# Surebets App (DEMO)

Plataforma profesional para detectar oportunidades de arbitraje deportivo (surebets)
entre casas de apuestas.

> ⚠️ Todos los datos de cuotas incluidos en este proyecto son **DEMO** (simulados).
> No provienen de ninguna casa de apuestas real. Antes de usar en producción,
> implementa un proveedor real dentro de `server/src/providers/` (API oficial o
> scraper propio, respetando siempre los términos de servicio de cada operador).

## Estructura

```
surebets-app/
├─ server/     # API REST (Node + Express + TypeScript + SQLite)
│  └─ src/
│     ├─ db/         # conexión y esquema SQLite
│     ├─ math/        # fórmulas de arbitraje (2 y N resultados)
│     ├─ providers/   # fuentes de cuotas (DEMO incluido, listo para ampliar)
│     ├─ services/    # lógica de negocio (detector de surebets)
│     ├─ routes/      # endpoints Express
│     └─ types/       # tipos compartidos del backend
└─ client/     # SPA (React + Vite + TypeScript)
   └─ src/
      ├─ pages/        # Dashboard, Cuotas de valor, Calculadora, Historial, Estadísticas, Configuración
      ├─ components/   # Sidebar, tablas, tarjetas, filtros, alertas
      ├─ hooks/        # useSurebets, useAutoRefresh, useSettings
      ├─ services/     # cliente API (fetch)
      ├─ math/         # misma lógica de arbitraje, reutilizable en la Calculadora
      ├─ utils/        # formateo de números/moneda
      └─ types/        # tipos compartidos del frontend
```

## Puesta en marcha (desarrollo local)

```bash
# 1. Instalar dependencias (backend + frontend)
npm run install:all

# 2. Arrancar todo en modo desarrollo (API en :4000, web en :5173)
npm run dev
```

La API expone `http://localhost:4000/api`, y Vite hace proxy de `/api` hacia el
backend automáticamente (ver `client/vite.config.ts`).

## Desplegar en la web

Para usar la app en un dominio público (no solo en tu ordenador), sigue la
guía paso a paso en [DEPLOY.md](./DEPLOY.md) — despliega el backend en
Render/Railway y el frontend en Vercel/Netlify.

## Añadir una casa de apuestas / fuente de cuotas real

1. Crea un archivo nuevo en `server/src/providers/`, por ejemplo `betfairProvider.ts`.
2. Implementa la interfaz `OddsProvider` (ver `providers/types.ts`).
3. Regístralo en `providers/index.ts` dentro del array `providers`.

El resto de la aplicación (detector, rutas, dashboard) no necesita cambios: consume
siempre la lista combinada de proveedores.

## Matemáticas de arbitraje

Ver `server/src/math/arbitrage.ts` (y su espejo en `client/src/math/arbitrage.ts`).
Fórmulas generalizadas a N resultados (funcionan para 2 y 3):

- Margen del mercado: `M = Σ (1 / cuota_i)`
- Existe arbitraje si `M < 1`
- Stake por resultado: `stake_i = bankroll × (1 / cuota_i) / M`
- Beneficio garantizado: `bankroll × (1 / M − 1)`
- ROI %: `(1 / M − 1) × 100`
- Comisión de intercambio (opcional): se aplica a la cuota efectiva antes de calcular:
  `cuota_efectiva = 1 + (cuota − 1) × (1 − comisión)`

## Cuotas de alto valor (value betting)

Además de las surebets (arbitraje garantizado combinando varias casas), la app
detecta "cuotas de alto valor": apuestas individuales cuyo precio supera la
probabilidad de consenso del mercado. Ver `server/src/math/valuebet.ts`.

1. Cada casa que cubre un evento tiene su propio margen (overround). Se
   "des-margena" (de-vig) la cuota de cada casa dividiendo su probabilidad
   implícita (`1/cuota`) entre la suma de probabilidades de todos sus
   resultados.
2. Se promedian esas probabilidades des-margenadas entre todas las casas que
   cubren el evento -> probabilidad de consenso ("cuota justa").
3. Cualquier cuota individual que pague más que `1 / probabilidad_consenso`
   tiene valor esperado (EV) positivo: `EV% = (cuota × prob_consenso − 1) × 100`.
4. El stake sugerido usa el criterio de Kelly fraccionado (configurable en
   Configuración, por defecto ¼ Kelly) para limitar la varianza.

Se necesitan al menos 3 casas cubriendo el mismo evento para que la
estimación de consenso sea mínimamente fiable (`MIN_BOOKS_FOR_FAIR_ODDS`).

## Vetar casas de apuestas

En Configuración → "Vetar casas de apuestas" puedes desmarcar cualquier casa
(por ejemplo, si esa cuenta ya está limitada). Las casas vetadas se excluyen
por completo del cálculo tanto de surebets como de cuotas de valor — no solo
se ocultan en la UI — mediante `server/src/utils/bookmakers.ts`.

## Alertas por webhook (aviso al móvil)

El sonido y las notificaciones del navegador solo funcionan con la pestaña
abierta. En Configuración → "Alertas por webhook / móvil" puedes indicar una
URL de webhook (funciona con [ntfy.sh](https://ntfy.sh) sin necesidad de
cuenta, y también con webhooks de Discord o Slack) para recibir un aviso
push cuando aparezca una surebet o cuota de valor nueva, aunque tengas la
app cerrada. Ver `server/src/services/webhookNotifier.ts`.
