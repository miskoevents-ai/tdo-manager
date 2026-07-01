# Consultoría de negocio — Tu Decoración Original (TDO)

_Análisis a partir de los datos reales cargados (mayo–junio 2026) y del estado actual de TDO Manager. Julio 2026._

## 1. Radiografía del negocio (lo que dicen los datos)

- **El alquiler es el core, no los eventos.** 10 de 12 oportunidades son `alquiler_encargo`; solo 2 son eventos completos (bodas). El ticket de alquiler va de 54 € a 2.178 €; las bodas suben a 2.250–2.850 €. → El volumen y la caja del día a día vienen del **alquiler de material**; las bodas son los picos de facturación.
- **Márgenes finos en la nueva etapa.** Junio 2026: ingresos 1.845 €, gastos fijos 1.533 €, **resultado +312 €**. Con 2.006 € previstos por cobrar. El negocio es viable pero **cada euro de coste variable y cada impago pesan mucho**.
- **Costes fijos altos para el tamaño:** ~1.805 €/mes (local 1.200, autónomos 268, luz 50…). El local es el gran fijo → cuanto más rote el material, mejor se diluye.
- **Clientes B2B potentes y recurrentes:** productoras de TV (Telecinco *¡De Viernes!*, Mediaset), agencias (Lobo, GYC, 2CH), wedding planners, Produktema. → El **alquiler B2B a producción audiovisual** es un vertical real y rentable (pagan bien, repiten, aunque con retención del 15 %).
- **Los daños existen y cuestan:** hay una oportunidad literal «Daños bañera – 2CH». Las fianzas son parte del modelo y su gestión (retención por daños, devolución a tiempo) es dinero real.
- **Cobros pendientes acumulados:** 6.878 € pendientes en 8 eventos, varios de meses ya pasados. → **El cuello de botella no es vender, es cobrar y hacer seguimiento.**

## 2. Qué cubre ya TDO Manager (muy completo)

Comercial (pipeline, clientes, calendario, facturas) · Dinero (tesorería, contabilidad §5.4, gastos fijos, comisiones, equipo) · Operativa (inventario + disponibilidad por fechas, reservas de material, escandallo de costes con personal/desplazamiento/material y margen, desplazamientos con cálculo de gasolina) · Fase 4 (asistente Claude, avisos accionables, próximos alquileres).

Es una base sólida. Las recomendaciones siguientes son para **ganar dinero y tiempo**, no para tapar agujeros.

## 3. Lo que falta y mejor complementaría (priorizado)

### 🥇 Tier 1 — alto retorno, se apoya en datos que ya existen

**A. Tarifario de alquiler + presupuesto desde catálogo.**
Hoy las líneas del presupuesto se escriben a mano. Si cada artículo del inventario tiene su **precio de alquiler y fianza**, presupuestar debería ser: *elegir artículo → precio automático → y de paso reservar el material y bloquear disponibilidad*. Acelera lo que más se hace (presupuestar alquileres), evita errores de precio y conecta inventario ↔ presupuesto ↔ reservas en un solo gesto.

**B. Presupuesto / contrato en PDF con la marca, para enviar al cliente.**
Ahora el presupuesto vive dentro de la app; no hay documento que dar al cliente. Un **PDF/enlace con logo TDO, líneas, IVA, fianza, condiciones y datos de pago** sube el nivel profesional y ayuda a cerrar. Para alquileres, además, un **albarán de entrega** (qué sale, fianza, fecha de devolución) reduce disputas por daños.

**C. Rentabilidad por artículo (ROI del inventario).**
En un negocio de alquiler, saber qué pieza «se paga sola» es oro: *bañera retro → alquilada N veces → ingresos X € → coste de compra Y € → amortizada, ROI Z %*. Dice **qué comprar más y qué es stock muerto**. Usa reservas + tesorería que ya se registran.

### 🥈 Tier 2 — quitan fricción del día a día

**D. Mensajes/recordatorios listos para enviar (WhatsApp/email).**
Los avisos ya detectan fianzas a devolver, cobros vencidos y presupuestos sin respuesta. Falta el último paso: un botón **«generar mensaje»** (el asistente redacta el texto) para reclamar cobro, recordar devolución o hacer seguimiento. Bajo esfuerzo, impacto directo en la caja.

**E. Registro de daños / incidencias ligado a la fianza.**
Anotar daño, coste de reparación y cuánto se retiene de la fianza. Con la bañera dañada en los datos, esto es una necesidad real, no teórica.

**F. Cuadro de mando analítico.**
Más allá de la home operativa: **tasa de conversión** del pipeline (nueva→confirmada), **ticket medio**, **ocupación del material (%)**, ingresos por **canal / cliente / mes**. Para que los 3 socios dirijan con datos.

### 🥉 Tier 3 — estratégico / infraestructura

**G. Login de los 3 socios (Supabase Auth) + permisos + rotar la secret key.** Hoy hay un único «Sarmi» fijo. Con 3 socios y comisiones por persona, conviene identidad real y trazabilidad. (Seguridad ya señalada: rotar `secret key`.)

**H. Portal del cliente:** ver presupuesto, confirmarlo y pagar una señal online.

**I. Galería de fotos (Supabase Storage):** fotos de inventario y portfolio para presupuestos y para Instagram (canal de captación #1).

## 4. Recomendación de ruta

1. **B (presupuesto/contrato PDF con marca)** — el documento que hace ganar clientes y evita líos de fianzas. Máxima visibilidad, se verifica al momento.
2. **A (tarifario + presupuesto desde catálogo)** — acelera el trabajo diario y conecta inventario↔presupuesto↔reservas.
3. **D (mensajes de seguimiento)** — ataca el problema real de cobrar, apoyándose en el asistente y los avisos ya construidos.

El resto (ROI de inventario, cuadro de mando, daños, login multi-socio, portal, galería) encaja bien después, en este orden según lo que más aprieta cada mes.
