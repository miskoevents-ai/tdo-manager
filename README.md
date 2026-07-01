# TDO Manager

Plataforma de gestión a medida para **Tu Decoración Original** (TDO) — decoración efímera y alquiler de mobiliario para eventos en Madrid. Sustituirá al sistema actual en Airtable.

> **Si eres Claude Code / un desarrollador leyendo esto:** empieza por `docs/TDO_Manager_spec_maestro.md` (la fuente de verdad), luego los addenda (mejoras acordadas), mira `docs/TDO_Manager_mockup_v2.html` para el aspecto visual y aplica el diseño de `docs/design-tokens/`.

---

## 📚 Documentación (carpeta `docs/`)

| Archivo | Qué es |
|---|---|
| **TDO_Manager_spec_maestro.md** | Especificación completa: modelo de datos, reglas de negocio, pantallas, facturación, plan por fases. **Léelo primero.** |
| **TDO_Manager_spec_v1.1_addendum.md** | Mejoras 1ª ronda: oportunidades unificadas, calendario, asistente Claude, packs/logística de inventario, filtros. |
| **TDO_Manager_spec_v1.2_addendum.md** | Mejoras 2ª ronda: módulo Equipo, costes/desplazamientos por evento, facturas con filtros, "modo amigos". |
| **TDO_Manager_mockup_v2.html** | Diseño visual objetivo, ya con la marca de TDO (ábrelo en el navegador). La app debe parecerse a esto. |
| **TDO_Airtable_traspaso.md** | Cómo funciona el sistema actual en Airtable (operativa real, reglas, datos). Contexto de dónde venimos. |
| **TDO_Manager_briefing_y_presupuesto.md** | (Solo si se contrata a alguien.) Briefing comercial + guía de precios. No necesario para construir. |

### 🎨 Design system — `docs/design-tokens/`

| Archivo | Qué es |
|---|---|
| **DESIGN_TOKENS.md** | Sistema de diseño completo de la marca: paleta, tipografía, componentes, tono. |
| **tokens.css** | Variables CSS listas para importar en `globals.css`. |
| **tailwind.config.js** | Config de Tailwind con los tokens de marca (colores, fuentes, radios, sombras). |
| **logo/** | Logotipos en PNG (principal, horizontal, versiones crema para fondo oscuro). |

**Marca en 1 línea:** verde salvia `#3F4A36` (primario) + terracota `#BE6E4C` (secundario) sobre beige cálido `#F4EDE1`; tipografías **Marcellus** (títulos) + **Montserrat** (UI). Tono cálido, artesanal y elegante.

---

## 🎯 Stack

- **Next.js 15 (App Router) + TypeScript**
- **Tailwind CSS + shadcn/ui** (aplicando `docs/design-tokens/`)
- **Supabase** (Postgres + Auth + Storage)
- Deploy en **Vercel**
- Interfaz en **español**, **móvil primero**

## 🗺️ Roadmap por fases

1. **Fase 1 — Comercial:** clientes, oportunidades (leads→presupuestos unificados), presupuestos con líneas y cálculo de IVA/retención, facturas PDF, equipo.
2. **Fase 2 — Dinero:** tesorería con naturaleza de gasto + filtros, contabilidad mensual, dashboards, 1er nivel del asistente Claude.
3. **Fase 3 — Operativa:** inventario con disponibilidad por fechas, reservas, packs/descuentos, costes y margen real por evento, skill de presupuestos con Claude.
4. **Fase 4 — Extras:** portal cliente, avisos automáticos.

## 🚦 Regla de oro

Airtable sigue siendo la fuente de datos real hasta que cada fase esté probada. **No se apaga nada que funcione** hasta que su reemplazo esté validado.

---

## ▶️ Puesta en marcha (desarrollo)

La app ya está construida (Fase 1). Para levantarla en local:

```bash
npm install
cp .env.local.example .env.local   # y rellena las 3 variables de Supabase
```

Variables de entorno (`.env.local`, y en Vercel → Settings → Environment Variables):

| Variable | Dónde se usa | De dónde sale |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador | Supabase → API keys → publishable (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | solo servidor / seed | Supabase → API keys → secret (`sb_secret_…`) — **nunca** al navegador |

Crear el esquema y cargar los datos reales:

1. **Esquema:** abre `supabase/schema.sql`, pégalo en Supabase → SQL Editor → *Run*. Es idempotente.
2. **Seed** (dos vías):
   - **Local/CLI:** `npm run seed` (lee `docs/seed-data.json` y rellena las tablas resolviendo los FKs por nombre).
   - **En producción (Vercel):** `POST /api/seed?token=$SEED_TOKEN` con cabecera `Authorization: Bearer <SUPABASE_SECRET_KEY>`. La ruta usa el SDK oficial **`@supabase/server`** (`withSupabase({ auth: "secret" })` → `ctx.supabaseAdmin`). Útil cuando el entorno de desarrollo no tiene salida de red a Supabase.
3. **Arrancar:** `npm run dev` → http://localhost:3000

**Modo demo (sin Supabase):** `TDO_MOCK=1 npm run dev` renderiza las pantallas con `docs/seed-data.json` sin conectar a la base — útil para ver la UI offline.

> **`@supabase/server`** está configurado (variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`). Da un cliente con RLS del usuario (`ctx.supabase`) y uno admin (`ctx.supabaseAdmin`), y verificación de JWT vía JWKS — la base para el login de los 3 socios (Fase 0).

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run seed    # cargar datos reales en Supabase
```

### Arquitectura (Fase 1)

- **`app/`** — App Router. Cada sección es una ruta (`/clientes`, `/oportunidades`, `/oportunidades/[id]`, `/facturas`, …). Los datos se leen en Server Components; las mutaciones son **Server Actions** (`app/actions.ts`) con la *secret key* (los datos no se exponen por la *publishable key*).
- **`components/ui/`** — primitivos de UI (estilo shadcn) con los tokens de marca.
- **`components/layout/Shell.tsx`** — barra lateral salvia + topbar, responsive (menú móvil).
- **`lib/`** — `calc.ts` (IVA/retención), `format.ts` (formato ES), `data.ts` (acceso a datos), `estados.ts` (enums/etiquetas), `supabase/admin.ts`.
- **`supabase/schema.sql`** — esquema Postgres (Fase 1) con enums, FKs, columnas generadas y RLS.
- **`scripts/seed.mjs`** — carga de datos reales.

> **Pendiente inmediato (Fase 0):** login con Supabase Auth (magic link) restringido a los 3 socios + RLS por usuario. Hoy la app accede vía *secret key* en servidor; conviene añadir la puerta de entrada antes de uso diario.

Referencia de arranque original: §12 de `docs/TDO_Manager_spec_maestro.md`.
