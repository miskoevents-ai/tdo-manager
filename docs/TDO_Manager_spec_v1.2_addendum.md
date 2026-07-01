# TDO Manager — Addendum v1.2
### Segunda ronda de feedback (Sarmi): Equipo, logística de eventos y facturación flexible
*Se lee junto con el spec v1.0 y el addendum v1.1.*

---

## 1. Módulo "Equipo" (nuevo)
**Idea:** una pestaña de equipo; registrar a los empleados, su precio/hora, etc.
**Decisión:** tabla **`equipo`** con: nombre, rol, teléfono/email, **precio/hora**, activo. Los socios (Sarmi, Jero, Cris) y colaboradores (p.ej. Cristina, Blanca) viven aquí.
- Se enlaza con **Partes de horas** (el empleado deja de ser texto libre y pasa a ser una persona real del equipo).
- Ficha de cada persona: horas trabajadas, coste acumulado, eventos en los que ha participado.

## 2. Logística y desplazamientos por evento (estructurado)
**Idea:** registrar desplazamientos, gasolinas, etc. de cada evento de exterior; tiempo por hora de empleados, gastos…
**Decisión:** cada evento (oportunidad contratada) tiene una pestaña **"Costes del evento"** que agrupa:
- **Desplazamientos:** entrada por trayecto con **km**, **coste de gasolina** (auto a 0,30 €/km o importe manual), peajes, **parkings**. Genera automáticamente el gasto en Tesorería como `gasto_de_evento`.
- **Horas del equipo:** partes de horas de ese evento (empleado × horas × precio/hora) → coste de personal.
- **Compras/material del evento:** flores, moqueta, subcontratas…
- **Resultado del evento:** ingreso total − (material + personal + desplazamientos) = **margen real**. Esto es oro para saber qué eventos rentan y cuáles no.
> Nota: hoy no se cobran las horas propias de los socios, pero el sistema las registra igualmente para ver el margen "de verdad" si algún día se pagan.

## 3. Facturas: listado completo, filtros y marcar pagadas
**Idea:** que en facturas aparezcan todas las emitidas anteriormente, o poder filtrar, para marcarlas como pagadas.
**Decisión:** módulo **Facturas** con **listado de todas** las emitidas + filtros por: **estado** (emitida / cobrada / vencida / anulada), mes, cliente, serie. Acciones rápidas: **marcar cobrada**, reenviar por email, descargar PDF. Vista de "pendientes de cobro" con su total. La numeración sigue siendo correlativa y sin huecos.

## 4. Facturación flexible: "modo amigos" / sin factura fiscal
**Idea:** poder hacer operaciones sin IVA para amigos — p.ej. Blanca (empleada de Misko) se lleva material para su cumple, en plan amigos; poder registrarlo.
**Decisión:** tipo de operación **"Amigos / Préstamo"** en la oportunidad:
- **No genera factura fiscal** (no gasta número de serie ni rompe la correlación legal).
- **Sí reserva el material** (para el control de stock y disponibilidad).
- Registra el cobro si lo hay (importe libre, incluso 0 € si es prestado/regalado) como movimiento de Tesorería marcado como `amigos`.
- Puede emitir un **recibo interno simple** (no fiscal) si queréis dejar constancia.
- El cliente se etiqueta como **AMIGO** (ya existe ese origen en la base).

> ⚠️ **Aviso importante (no soy asesor fiscal):** emitir una *factura oficial* sin IVA a un particular normalmente **no es correcto** — el IVA es obligatorio en la operación. Para el "modo amigos" lo limpio es **no emitir factura fiscal** (préstamo/regalo o cobro informal) en vez de emitir una factura "sin IVA". **Consultadlo con la gestoría** para hacerlo bien. La app está diseñada para soportarlo **sin ensuciar la numeración fiscal**, que es lo que os protege.

---

## Impacto en el modelo de datos (resumen)
- **Nueva tabla `equipo`** (personas + precio/hora). `partes_horas.empleado` pasa a ser FK → `equipo`.
- **Nueva tabla `desplazamientos`** (evento_id, trayecto, km, gasolina, peaje, parking) que alimenta Tesorería.
- **`facturas`**: se refuerza el listado/estado (ya existía en el modelo).
- **Oportunidad**: campo `tipo_operacion` (`normal` / `amigos_prestamo`) que decide si se emite factura fiscal o no.
- **Tesorería**: la etiqueta de naturaleza suma el valor `amigos` a los ya existentes (`gasto_fijo`, `gasto_de_evento`, `inversion`, `otro`).

## Impacto en pantallas
- **Nueva pestaña Equipo** en el menú.
- **Oportunidad → pestaña "Costes del evento"** (desplazamientos + horas + compras + margen).
- **Facturas → listado con filtros + marcar cobrada**.
- **Al crear oportunidad:** selector "¿operación normal o de amigos?".

> Todo esto encaja en el roadmap: Equipo y facturas-listado en **Fase 1-2**; costes/desplazamientos por evento y margen real en **Fase 3** (junto al inventario y las horas).
