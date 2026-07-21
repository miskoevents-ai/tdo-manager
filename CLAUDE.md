# TDO Manager — notas para Claude

## Personas (¡NO confundir!)
- **Cris** = SOCIA (novia de Jero). No tiene sueldo de empleada.
- **CRISTINA** = EMPLEADA. Contrato 25 h/semana; sueldo 1.000 €/mes (jul-ago) y 2.150 €/mes (sep-feb). Es quien hace presupuestos con la Calculadora y registra partes de horas.
- **Jero** = socio (Jerónimo Alonso Marcos, emisor fiscal).
- **Álvaro** = dueño/socio, con quien hablas en las sesiones.

## Modelo de costes (DECIDIDO jul 2026, implementado en lib/calculadora-precio.ts)
- Estructura por consumo: sueldo de Cristina por horas con tarifa cargada (€/h real ÷ % horas a eventos; 20÷50% = 40 €/h, recargo 20 €/h) + cuota de fijos SIN sueldo ÷ 6 eventos de referencia FIJOS (decisión: mejor pasarse que ser baratos).
- Tarifa anual alisada (el verano no se encarece). Si Cristina dedica más horas a eventos → subir "% horas a eventos" en Parámetros → recargo baja solo.
- Encargos/alquileres: 20% de costes directos (antes 15). Su recaudación NO descuenta de la cuota (conservador); revisar con el Cuadro de mando en 2-3 meses. Alquileres puros: markup con mínimos 450/75.
- Detalle completo en docs/modelo-costes.md §8.
- **Horas de Cristina SIN precarga** (jul 2026, "habrá bodas y bodas"): la Calculadora arranca en 0 horas; Cristina mete las reales de cada evento. `horasPorTipo` en CALCULADORA_DEFAULTS está a 0 y el componente no recarga por tipo.
- **Evento propio vs encargo** (¡lo confundo mucho, OJO!): por defecto todo evento de TDO = `serie='evento'` (PROPIO → cuota de fijos + recargo estructura, margen 30%). Solo va a `serie='alquiler_encargo'` (+20% estructura, sin cuota) cuando es un alquiler puro de mobiliario o una fabricación a medida.

## Modalidades en presupuesto (mig 066)
- Una oportunidad puede ofrecer varias **modalidades excluyentes** (el cliente elige una): `presupuesto_lineas.modalidad`. Línea sin modalidad = **común** (va en todas). Total de cada opción = común + sus líneas; NO se suman entre sí.
- Helper `resumenModalidades()` en lib/calc.ts. En el Kanban la tarjeta muestra "desde X €" (la más barata) para no inflar el pipeline. Vista y PDF pintan "Opción · …" con su total.

## Costes por subproyecto (mig 067)
- Un evento puede tener varios **subproyectos/elementos** (Carpa Beduina, Green Patio…). Se guardan en `oportunidades.subproyectos jsonb` = `[{nombre,color}]`; las líneas de coste pertenecen a uno por su `zona` (= nombre). No hay tabla nueva.
- En el tab Costes hay toggle **"por subproyecto"** (recuadros con color elegible, sub-módulos dentro, add-line que fija la zona) **/ "por módulo"** (la vista clásica). Componente: `ModulosPrevisto` acepta `zonaFiltro/zonaNueva/ocultarResumenes/soloConLineas`.

## Convenciones del repo
- Migraciones SQL en `supabase/migrations/` — el usuario las ejecuta a mano en Supabase (avisarle siempre). Última: 068.
- **Alquiler vs Encargo** (mig 068): dentro de `serie='alquiler_encargo'`, el flag `oportunidades.es_encargo` distingue alquiler (devolución + fianza) de encargo/producción a medida (se lo queda el cliente). Cambia las condiciones del presupuesto (`condicionesPara(serie, esEncargo)` en lib/empresa.ts: CONDICIONES_ALQUILER vs CONDICIONES_ENCARGO). Selector en OportunidadDialog.
- Columnas nuevas en server actions: patrón de fallback tolerante (OPCIONALES + reintento sin columnas).
- Antes de desplegar nada que toque middleware/infra: `npm run build` completo obligatorio (un matcher mal compilado tumbó toda la app una vez). Cambios en `public/` son seguros.
- Flujo de deploy: typecheck → build → commit → PR → merge squash → rebase de la rama de trabajo sobre main.
- Propuestas para fincas: páginas estáticas públicas en `public/fincas/<finca>.html` con og:image para preview de WhatsApp (`/fincas/*` es público vía early-return en middleware.ts).
