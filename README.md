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

## ▶️ Cómo arrancar (Fase 1)

Ver el prompt de arranque al final de `docs/TDO_Manager_spec_maestro.md` (§12) y añadir: *"sigue el diseño del mockup v2 y aplica los tokens de `docs/design-tokens/`"*. Objetivo de la primera sesión: proyecto arrancando + Supabase conectado + pantalla de Clientes funcionando, ya con la marca de TDO.
