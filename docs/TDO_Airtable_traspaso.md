# TU DECORACIÓN ORIGINAL — Sistema de gestión en Airtable
### Documento de traspaso / contexto para Claude

> **Para qué es este documento:** explicar, a una instancia de Claude que no ha vivido el montaje, cómo está organizada la base de Airtable de **Tu Decoración Original (TDO / "TUDECO")**, qué significa cada tabla, las reglas de negocio que se acordaron y qué trabajo queda pendiente. Si tienes el MCP de Airtable conectado, con esto puedes operar la base con criterio. **Léelo entero antes de tocar nada.**

---

## 1. El negocio en 30 segundos

- **Tu Decoración Original** es una empresa de **decoración efímera y alquiler de mobiliario/atrezzo para eventos** (bodas, comuniones, corporativos, rodajes…) en Madrid. Fundada por **Cristina** en 2012.
- En **mayo de 2026 el negocio fue traspasado**: la antigua dueña, **Cristina**, lo vendió a tres socios nuevos. Cristina sigue colaborando puntualmente (fabrica arcos, vendió material, etc.).
- **Los tres socios actuales y su participación:**
  | Socio | % |
  |---|---|
  | **Sarmi (Álvaro Sarmiento)** | **40 %** |
  | **Jero (Jerónimo Alonso Marcos)** | **30 %** |
  | **Cris (novia de Jero)** | **30 %** |
- ⚠️ **No confundir nombres parecidos:**
  - **Cristina** = la **antigua dueña** (etapa anterior); hoy colaboradora externa.
  - **Cris** = **socia nueva** (novia de Jero, 30 %). Son personas distintas.
  - **Sarmi** = Álvaro, el socio mayoritario (40 %). En el Excel, "presentación de Sarmi" se refiere a presentarlo a Cristina.
- Esto crea una división temporal clave que está metida en TODA la base: **"Etapa Cristina"** (lo anterior) vs **"Nueva etapa"** (los tres socios). **Fecha de corte: 25-may-2026.**
- Facturan con NIF de Jero (51094870W) por ahora; el plan es montar una **SL** más adelante (hay notas que dependen de ello, p.ej. recuperar la fianza del local, y habrá que formalizar el reparto 40/30/30).
- **Aportaciones de capital ≠ % de propiedad (a revisar con la SL):** en la inversión inicial registrada constan Cris (10.000 € efectivo + 1.200 € agencia) y Jero (5.000 € banco + 2.400 € fianza), pero la propiedad es Sarmi 40 / Jero 30 / Cris 30. La aportación de Sarmi por su 40 % no aparece aún en el libro de Tesorería. Conviene cuadrar quién aporta qué cuando se constituya la sociedad.

---

## 2. La base

- **Nombre:** `TUDECORACIÓNORIGINAL 2.0`
- **Base ID:** `app6U3FLBiVgTtiD0`
- **Hay una base de respaldo:** `OLD___TUDECORACIÓNORIGINAL` — contiene el **histórico completo de facturas de Cristina (2022–2025)** que se borró de la base nueva. No trabajar ahí salvo para consultar histórico.
- Otras bases de la cuenta (Test Curso, Misko Events, CRM Leads plantilla, TheChefClub) **no** son de TDO.

---

## 3. Las 12 tablas

### FLUJO COMERCIAL (el corazón)

**1. Solicitudes** · `tblGeTgMcINMV3Fz1`
Bandeja de entrada de leads (cada mail/Instagram/llamada). Campos clave: Estado (Nueva → Contestada → En conversación → Presupuesto enviado → **Contratada** / Perdida / Descartada), Fecha de entrada, Canal/Origen, Tipo de evento, Contacto/Email/Teléfono, Fecha y Lugar del evento, Presupuesto estimado, **Fianza**, "Próxima acción" + "Fecha próxima acción" (lo que mantiene vivo el seguimiento), y enlaces a Presupuesto y Cliente.
- Fórmula **Etapa** (por fecha de entrada).

**2. Presupuestos** · `tbltv2oGEjuOlhU2f`  ← *tabla central, "presupuesto = evento"*
Cada fila es un presupuesto; cuando se acepta, se convierte en el evento confirmado. Campos: Nº, Serie (Evento / Alquiler-Encargo), Tipo evento, Fecha presupuesto, Fecha evento, Fecha montaje, Fecha recogida, Responsable, Nº invitados, **Base imponible / IVA % / IVA / Retención / Total**, Total estimado, Total para análisis, Estado (Pendiente → Aceptado → Confirmado → Realizado / Facturado), **Cobrado**, **Fianza** + "Fianza devuelta" (checkbox), Conceptos, Notas.
- Fórmula **Pendiente de cobro** = Total − Cobrado.
- Fórmula **Etapa** (por fecha presupuesto).
- Enlaces a: Cliente, Lugar, Solicitudes, Reservas de material, Tesorería, Proveedores, Partes de horas.

**3. Clientes** · `tbljxqSCc6D094boo`
Ficha por cliente: Nombre, Tipo (Particular/Empresa/Finca/Wedding planner), Email, Teléfono, Localidad, **NIF/CIF**, Nº presupuestos, Facturación total, Ticket medio, Última fecha, Notas, "Origen del cliente" (Cliente previo / Cliente nuevo / AMIGO JERO / Por confirmar).
- Fórmula **Etapa**: aquí se calcula por "Origen del cliente" (no por fecha): *Cliente previo* → 🔴 Etapa Cristina; *Cliente nuevo / AMIGO JERO* → 🟢 Nueva etapa.
- ⚠️ **Nº presupuestos / Facturación total / Ticket medio son valores numéricos FIJOS** (no rollups). Reflejan el histórico de Cristina como referencia. Si registras una venta nueva, actualízalos a mano. La convención usada es **facturación en base imponible (sin IVA)**.

### OPERATIVA

**4. Inventario** · `tblNMecpdlf9UQ5nA`
Material de alquiler/decoración: Artículo, Categoría, Cantidad total, Coste unitario, Precio alquiler, Ubicación, Estado, Foto, Notas.
- **Rollup "Comprometido"** + fórmula **"Disponible"** (= Cantidad total − comprometido en reservas activas) + fórmula **"⚠️ Estado stock"** (semáforo que avisa si se compromete más de lo que hay). **Estos rollups/fórmulas YA existen y funcionan.**
- Enlaza con Reservas de material y con Catálogo/Tarifas.

**5. Reservas de material** · `tblErThhPBy4jFZtZ`
Conecta inventario ↔ eventos: qué artículo sale, cuánto y en qué fechas (salida/devolución). Estado: Reservado → Entregado → Devuelto → (Incidencia). Enlaza con Artículo (Inventario) y Evento (Presupuesto). Fórmula Etapa (por fecha salida).

**6. Partes de horas** · `tblpJ6NCZ74m4OYnp`
Horas del equipo por evento. Empleado, Fecha, Tarea, Horas, Precio/hora.
- Fórmula **Coste** = Horas × Precio/hora. Enlaza con Evento. Sirve para el margen real de cada boda. *(Nota: a día de hoy NO se cobran las horas propias de Jero/Cris — varios movimientos lo dicen explícitamente.)*

### DINERO

**7. Tesorería** · `tbllZodn2v4oAOCxp`  ← *todo el dinero pasa por aquí*
Un movimiento por fila. Campos: Movimiento, **Tipo (Ingreso/Gasto)**, Categoría, **Importe**, Fecha, Estado (Previsto → Cobrado / Pagado / Vencido), Método, Nº factura, Notas, Año, y enlaces a Cliente, Proveedor, Evento (Presupuesto), **Gasto fijo (concepto)** y **Mes contable**.
- ⚠️ **CONVENCIÓN CRÍTICA: los importes van SIEMPRE en positivo.** El signo lo da el campo "Tipo" (Ingreso vs Gasto). No metas números negativos.
- Fórmula **Etapa** (por fecha).

**8. Gastos fijos** · `tblkzEskLDiQQ89Hp`
Plantilla de los gastos recurrentes (~1.825 €/mes prorrateado): Concepto, Importe mensual, Periodicidad (Mensual/Trimestral/Anual), Día de cargo, A quién se paga, **Quién lo paga** (TDO / Jero / Cris / Jero&Cris / Fotomatón y Más), Activo (checkbox), Notas. El **pago real de cada mes se registra en Tesorería** y se enlaza al concepto vía el campo "Gasto fijo (concepto)".

**9. Contabilidad mensual** · `tblMS5DyvvNhkLoAq`  ← *lee esto con atención, tiene reglas*
Una fila por mes (formato `AAAA-MM`). Cada movimiento de Tesorería que deba contar se enlaza a su mes con el campo **"Mes contable"**, y los totales salen por rollups.
- **REGLA DE NEGOCIO (decisión de los socios, 10/06/2026):** la contabilidad mensual **arranca en junio 2026** e incluye **solo (1) ingresos de facturas propias de la nueva etapa y (2) gastos fijos**. Los **gastos variables** (gasolina, dietas, portes, material de evento…) y **todo lo anterior a junio** se quedan en Tesorería **sin "Mes contable"**, así no computan aquí. *Esto es a propósito: no lo "arregles" enlazando todos los movimientos.*
- La **inversión inicial** (compra del negocio 15.000 € + agencia 1.200 € + fianza local 2.400 € = 18.600 €) está en Tesorería pero **excluida** (sin mes contable).
- **Rollups:** "Ingresos cobrados" YA está creado. **FALTAN por crear a mano** (la API de Airtable NO crea rollups con condiciones): **"Gastos"** (Tipo=Gasto), **"Resultado"** (fórmula `{Ingresos cobrados} − {Gastos}`) y opcional **"Previsto por cobrar"** (Tipo=Ingreso + Estado=Previsto). En el Airtable en español el tipo rollup se llama **"Compilación"**.

### REFERENCIA

**10. Lugares / Fincas** · `tblXHtGcGJ4KSPH9Z` — venues donde se trabaja (histórico orientativo + nuevos).
**11. Proveedores** · `tbliXiRMyabWY0xVo` — floristas, transporte, subcontratas, Maderas Villalba…
**12. Catálogo / Tarifas** · `tblojditXJVoptceu` — productos del dossier con su precio oficial, conectados al inventario.

---

## 4. El flujo completo (cómo se usa)

```
Solicitud (lead)
   │  estado → Contratada
   ▼
Presupuesto / Evento  ──► Reservas de material (qué sale del inventario)
   │                  └─► Partes de horas (coste de personal)
   ▼
Tesorería  (ingreso al facturar: Previsto → Cobrado;
   │        gastos del evento enlazados al evento)
   ▼
Contabilidad mensual (solo facturas propias + gastos fijos, vía "Mes contable")
   │
   ▼
Clientes (se actualizan sus stats al facturar)
```

**Reglas de la casa:**
1. Todo movimiento de dinero pasa por **Tesorería** (importes en positivo, el Tipo da el signo).
2. Una solicitud **nunca se borra**: se marca Perdida/Descartada (para medir cuánto se pierde).
3. El material **no sale sin Reserva** (si no, el semáforo de stock no lo ve y se puede vender dos veces).
4. Las **fianzas no son ingresos**: van a su campo y hay que devolverlas (checkbox "Fianza devuelta" = deudas pendientes con clientes).
5. La contabilidad mensual **solo** cuenta facturas propias + gastos fijos, **desde junio 2026**.

---

## 5. Convenciones y datos que conviene recordar

- **Corte de etapa:** 25-may-2026. Las fórmulas "Etapa" están en Solicitudes, Presupuestos, Reservas, Tesorería y Partes de horas (por fecha) y en Clientes (por "Origen del cliente").
- **Numeración de facturas:** serie `260xx` (26004, 26005… 26013). El presupuesto de Producciones Mandarina/Telecinco usa `26101/2026`.
- **IVA 21%** estándar; a **empresas se aplica retención −15%** (IRPF) en la factura.
- **Histórico de Cristina:** borrado de Tesorería el 10/06/2026 (estaba inflando la contabilidad). Respaldo íntegro en la base `OLD___TUDECORACIÓNORIGINAL`. Las stats de Clientes/Lugares se conservaron como referencia.

---

## 6. Estado actual (a fecha ~18-jun-2026)

**Clientes nuevos creados:** Cristina Reguero, Valeria María López Sáez, 2CH Producción Técnica SL, GYC Técnicas Empresariales, Lobo Agencia Digital SL, Producciones Mandarina, Leira, Sara (colaboradora/wedding planner). Pilar Jimenez y Produktema ya existían (previos, reactivados).

**Eventos/facturas activos:** F-26004 (mesa rústica Pilar), 26005 (boda Cristina Reguero 05/09), 26006 (boda Valeria 19/09), 26007 (bañera 2CH), 26008 (puertas GYC), 26009 (decoración Produktema/Atocha), 26010 (alpacas Lobo, en 2 plazos), 26011 (daños bañera 2CH), 26013 (columpio Finca Gaivota), 26101 (alpacas Telecinco/Mandarina), + alquileres en efectivo de Sara (Casona del Torcón) y Leira (sofá).

**Pendientes abiertos (anotados en los registros):**
- Cobrar: Lobo 2º 50% (636 €), Produktema (1.170,24 €), daños 2CH (199,65 €), 75 % letras de Sara (93,75 €).
- Devolver fianza de 90 € a Leira.
- Crear cliente del **columpio (F-26013)** — el evento existe sin cliente identificado.
- Completar contacto de Leira y nombre completo de Sara.
- **Inventario "Alpacas / balas de paja":** falta poner "Cantidad total" (sin eso el semáforo no controla disponibilidad; hay eventos de paja solapados).
- Facturas de proveedor pendientes de recibir (moqueta, material de arco de Maderas Villalba).
- Duda contable: la F-26007 está fechada el cobro en mayo en el Excel pero registrada en junio — revisar el mes correcto.

---

## 7. Cosas que debe saber Claude al operar la base (gotchas técnicos)

- **El MCP de Airtable NO crea rollups, lookups ni campos con condiciones.** Eso se hace a mano en la interfaz. En español: rollup = **"Compilación"**, lookup = "Búsqueda", count = "Recuento".
- **`list_records_for_table` puede exceder el límite de tokens** en tablas grandes (Tesorería, Clientes con 245+). Pide solo los `fieldIds` necesarios y usa `filters`/`recordIds`.
- **Nunca sustituyas IDs por nombres** en las llamadas (baseId/tableId/fieldId/recordId).
- Los campos singleSelect devuelven objeto `{id,name,color}` al leer, pero al escribir se pasa el **nombre** como string.
- Para borrados/cambios masivos del histórico: hay papelera en Airtable un tiempo, y el respaldo está en la base OLD. Aun así, **confirma siempre con Jero/Cris antes de borrar nada**.
- La cuenta tuvo aviso de **"por encima del límite de registros"**; por eso se limpió el histórico. Si vuelve a saltar, revisar nº de registros.

---

*Documento generado para el traspaso del sistema TDO. Si algo no cuadra con lo que ves en la base, gana lo que diga la base — pregunta a Jero o Cris ante cualquier duda de negocio.*
