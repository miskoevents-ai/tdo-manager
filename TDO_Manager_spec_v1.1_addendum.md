# TDO Manager — Addendum v1.1
### Feedback de producto (Sarmi) incorporado al diseño
*Se lee junto con el spec maestro v1.0. Aquí se registran las decisiones nuevas y cómo cambian el modelo de datos y las pantallas.*

---

## 1. Solicitudes y Presupuestos = UN SOLO FLUJO ("Oportunidades")
**Idea de Sarmi:** el presupuesto puede ir *dentro* de la solicitud; que la info de lo que se manda esté dentro, con un check de "presupuesto enviado sí/no".

**Decisión (recomendada):** unificamos. Una **"Oportunidad"** es la ficha que nace como lead y **evoluciona** hasta convertirse en evento, sin saltar de tabla. Desde el punto de vista del usuario es **una sola cosa que avanza**.
- Estados: Nueva → Contestada → En conversación → **Presupuesto enviado** → Contratada → (Perdida/Descartada).
- Campo **check "Presupuesto enviado"** + fecha de envío.
- **Se adjunta el presupuesto que se manda** (PDF) y **se guardan sus datos** (líneas, importes) dentro de la propia ficha.
- Cuando pasa a *Contratada*, la misma ficha ya es el **evento** (con montaje, recogida, material, cobros).
- *Técnicamente:* internamente siguen siendo dos tablas enlazadas (`oportunidad` + `presupuesto_lineas`/`facturas`), pero la interfaz las muestra como una sola pantalla con pestañas: **Datos · Presupuesto · Material · Cobros**.

## 2. Cliente automático al crear una oportunidad
**Idea:** que al crear una solicitud se cree el cliente, para tenerlos siempre registrados.
**Decisión:** sí. Al crear la oportunidad se crea/enlaza el cliente automáticamente (buscando por email/teléfono para no duplicar). El cliente nace con estado **"Lead"** y pasa a **"Cliente"** cuando hay primera contratación — así la lista de Clientes no se ensucia pero no se pierde nadie.

## 3. Calendario global (módulo nuevo)
**Idea:** un calendario donde se vea todo.
**Decisión:** módulo **Calendario** con vista mes/semana que pinta, con colores por tipo:
- Eventos (fecha del evento), **montajes** y **recogidas**.
- **Salidas y devoluciones de material** (de las reservas).
- Próximas acciones comerciales con fecha.
- Vencimientos de cobro y fianzas por devolver.
Filtrable por tipo. Es la vista que evita solapamientos (clave con el material que va justo, como las alpacas).

## 4. Asistente Claude integrado (lo que lo hace distinto)
**Idea:** que el sistema esté integrado con Claude; pedirle algo y que lo actualice. Y un "skill" para crear presupuestos.
**Decisión:** sí, y es muy factible. Dos niveles:
- **(a) Asistente conversacional:** una barra donde escribes en lenguaje natural —*"marca la fianza de Leira como devuelta"*, *"¿cuánto llevo cobrado en junio?"*, *"crea un gasto de 24 € de gasolina del evento de Atocha"*— y Claude lo hace o lo responde. *Cómo:* la app expone sus datos y acciones como herramientas (un pequeño servidor MCP / API interna) y Claude las usa. Con permisos: las acciones sensibles (borrar, emitir factura) piden confirmación.
- **(b) Skill "Crear presupuesto":** describes el evento en lenguaje natural (*"boda 120 invitados en finca, arco + centros + photocall"*) y Claude **redacta las líneas y precios** usando el Catálogo/Tarifas y el Inventario como referencia. Tú revisas y ajustas.
- *Nota realista:* consume API de Claude (coste por uso) y conviene meterlo en Fase 2-3, pero **el modelo de datos se diseña "API-first" desde el día 1** para que esté listo. Este es justo el terreno donde TDO tiene ventaja por venir ya trabajando con Claude.

## 5. Tesorería: distinguir tipos de gasto + filtros
**Idea:** diferenciar gastos fijos vs gastos de evento (cada evento lleva sus gastos). Poder filtrar.
**Decisión:** añadimos dimensión **"Naturaleza"** al movimiento: `gasto_fijo` · `gasto_de_evento` · `inversión` · `otro`. Los `gasto_de_evento` van enlazados a su evento → se ve el **margen real** de cada boda. **Filtros** en la lista por: mes, tipo (ingreso/gasto), naturaleza, categoría, estado, etapa, evento. (Recordatorio: solo `gasto_fijo` + ingresos de facturas propias entran en la contabilidad mensual.)

## 6. Facturas por email
**Idea:** que la factura pueda mandarse por mail.
**Decisión:** botón **"Enviar por email"** en la factura: adjunta el PDF y manda al email del cliente con una plantilla. Registra fecha de envío. (Integración con Gmail/SMTP de la cuenta de TDO.)

## 7. Contabilidad: dashboards ajustables
**Idea:** dashboards ajustables según datos.
**Decisión:** panel con **widgets configurables**: elegir rango de fechas, comparar meses, ver por naturaleza/categoría, por etapa, por socio (para el reparto), export a la gestoría. Gráficas que responden a los filtros.

## 8. Inventario avanzado (packs, disponibilidad y logística)
**Idea:** precios de referencia, disponibilidad por fechas, descuentos por pack, y qué implica llevarlos (horas de desplazamiento / recogida en local).
**Decisiones:**
- **Precio de referencia** por artículo (ya existe) visible al presupuestar.
- **Disponibilidad por fechas:** al reservar, comprobar solape con otras reservas y avisar. Vista de calendario del artículo.
- **Packs con descuento:** poder agrupar varios artículos en un "pack" con precio o % de descuento propio (nueva entidad `packs` + `pack_items`).
- **Logística por línea de presupuesto:** campo **modo de entrega** (`recogida_en_local` / `entrega`) y, si es entrega, **km / horas de desplazamiento** que suman coste. Así el presupuesto refleja el transporte real y el evento su coste logístico.
- **Fianza sugerida** por artículo (p.ej. sofá 90 €) que se propone sola al alquilarlo.

## 9. Design system TUDECO
**Idea:** todo integrado con el design system de TUDECO.
**Decisión:** definir **tokens de marca** (paleta crema/terracota, tipografía —serif tipo Playfair para la marca, sans para la UI—, logo, estilo de las facturas) en un único sitio, de modo que app, PDF y emails compartan identidad. La factura y la web se ven "de la misma familia".

## 10. Home (confirmado, se mantiene y refuerza)
- Le gusta la portada → se mantiene como pantalla principal.
- **Fianzas al 100 %:** bloque dedicado con todas las fianzas cobradas sin devolver (deuda viva con clientes) y las que TDO tiene pendientes.
- **Cobros pendientes** siempre visibles con su total.

---

## Impacto en el roadmap
Ninguna de estas ideas rompe el plan por fases; lo enriquece:
- **Fase 1** absorbe: Oportunidades unificadas, cliente automático, adjuntar presupuesto, design system, facturas por email.
- **Fase 2** absorbe: naturaleza de gastos + filtros, dashboards configurables, **primer nivel del asistente Claude**.
- **Fase 3** absorbe: calendario global, packs y descuentos, logística de inventario, disponibilidad por fechas, **skill de presupuestos con Claude**.

> Todas estas son **propuestas de diseño**: cualquiera se puede recortar o cambiar. La gracia de decidirlo ahora, sobre papel, es que construir ya no tenga sorpresas.
