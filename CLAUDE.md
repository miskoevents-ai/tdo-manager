# TDO Manager — notas para Claude

## Personas (¡NO confundir!)
- **Cris** = SOCIA (novia de Jero). No tiene sueldo de empleada.
- **CRISTINA** = EMPLEADA. Contrato 25 h/semana; sueldo 1.000 €/mes (jul-ago) y 2.150 €/mes (sep-feb). Es quien hace presupuestos con la Calculadora y registra partes de horas.
- **Jero** = socio (Jerónimo Alonso Marcos, emisor fiscal).
- **Álvaro** = dueño/socio, con quien hablas en las sesiones.

## Modelo de costes (estado)
- Encargos/alquileres: 15% de costes directos como "estructura de taller" (sin cuota de evento). Alquileres puros: markup con mínimos 450 € montaje desplazado / 75 € entrega.
- Propuesta pendiente de validar con Jero: tarifa cargada por horas (sueldo Cristina ÷ horas de evento, media móvil; arranque de referencia 6 eventos/mes y ~50% de sus horas) + cuota viva de fijos. Si Cristina dedica más horas a eventos, el recargo de estructura desciende automáticamente.

## Convenciones del repo
- Migraciones SQL en `supabase/migrations/` — el usuario las ejecuta a mano en Supabase (avisarle siempre). Última: 055.
- Columnas nuevas en server actions: patrón de fallback tolerante (OPCIONALES + reintento sin columnas).
- Antes de desplegar nada que toque middleware/infra: `npm run build` completo obligatorio (un matcher mal compilado tumbó toda la app una vez). Cambios en `public/` son seguros.
- Flujo de deploy: typecheck → build → commit → PR → merge squash → rebase de la rama de trabajo sobre main.
- Propuestas para fincas: páginas estáticas públicas en `public/fincas/<finca>.html` con og:image para preview de WhatsApp (`/fincas/*` es público vía early-return en middleware.ts).
