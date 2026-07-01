# TDO Manager — Especificación maestra de producto
### Plataforma de gestión a medida para Tu Decoración Original
*Documento de construcción · v1.0 · Basado en el sistema Airtable ya validado en producción*

---

## 0. Cómo usar este documento

Este es el **spec maestro** para construir la plataforma propia de TDO que sustituirá a Airtable. Está pensado para dárselo a **Claude Code** (o a un desarrollador) como fuente única de verdad. Contiene el modelo de datos, las reglas de negocio, las pantallas y el plan por fases.

> **Regla de oro del proyecto:** Airtable sigue siendo la fuente de datos real hasta que cada fase esté probada. **No se apaga nada que funcione** hasta que su reemplazo esté validado con datos reales.

Al final (§12) está el **prompt de arranque** para pegar en Claude Code y empezar la Fase 1.

---

## 1. Qué es y para quién

**Producto:** una app web interna para que los 3 socios de Tu Decoración Original gestionen todo el negocio: leads, presupuestos, facturas, alquiler de material, tesorería y contabilidad.

**El negocio:** decoración efímera y alquiler de mobiliario/atrezzo para eventos (bodas, corporativos, rodajes) en Madrid. Traspasada en mayo 2026 de Cristina (antigua dueña) a 3 socios nuevos.

**Usuarios (3, con rol de administrador todos):**
| Usuario | Rol | % |
|---|---|---|
| Sarmi (Álvaro Sarmiento) | Socio / admin | 40 % |
| Jero (Jerónimo Alonso Marcos) | Socio / admin | 30 % |
| Cris (novia de Jero) | Socio / admin | 30 % |

> ⚠️ Cuidado con los nombres: **Cris** (socia) ≠ **Cristina** (antigua dueña, hoy colaboradora externa). En el sistema conviven ambas.

**Objetivo de negocio:** dejar Airtable (ya tocaron su límite de registros), tener facturas en PDF automáticas, control real de disponibilidad de material y una contabilidad clara — siendo dueños del código y los datos.

---

## 2. Principios de diseño

1. **Móvil primero.** Trabajan desde el coche, en montajes, en fincas. Todo tiene que funcionar bien en el teléfono.
2. **Rápido de rellenar.** Menos campos obligatorios, valores por defecto inteligentes, y que registrar un gasto sea cuestión de segundos.
3. **El dinero es sagrado.** Importes siempre positivos con un tipo Ingreso/Gasto que da el signo. Nada de números negativos sueltos. Trazabilidad total.
4. **Nada se borra, se archiva.** Solicitudes perdidas, presupuestos rechazados: se marcan, no se eliminan (para poder medir).
5. **Los cálculos los hace la base, no la persona.** Totales, IVA, disponibilidad de stock, contabilidad mensual → todo computado. La persona mete datos crudos.

---

## 3. Stack técnico recomendado

Elegido para ser **barato, mantenible y que la IA lo maneje con soltura**:

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** | Estándar, IA lo domina, un solo repo |
| UI | **Tailwind CSS + shadcn/ui** | Componentes listos y bonitos, rápido |
| Backend/DB | **Supabase** (Postgres + Auth + Storage) | Base relacional real, login y ficheros en uno |
| Auth | Supabase Auth (magic link por email) | 3 usuarios, sin contraseñas que gestionar |
| PDF facturas | **@react-pdf/renderer** o ruta server con plantilla HTML→PDF | Facturas idénticas a las 260xx actuales |
| Hosting | **Vercel** (front) + Supabase (datos) | Coste ~0 € al inicio, escala solo |
| Migración | Scripts Node que leen export CSV de Airtable | Una vez, para volcar lo existente |

**Coste estimado de arranque:** 0 €/mes (tiers gratuitos de Vercel + Supabase) hasta cierto volumen; luego ~25-50 €/mes. Muy por debajo de Airtable a escala.

---

## 4. Modelo de datos (esquema Postgres)

Reutiliza las 12 tablas de Airtable, pero **mejoradas** con relaciones reales, numeración automática de facturas y líneas de presupuesto. Notación: `PK` clave primaria, `FK` clave foránea, `→` referencia.

### 4.1 `socios`
```
id PK · nombre · email (unique) · rol · porcentaje numeric · activo bool
```

### 4.2 `clientes`
```
id PK · nombre · tipo enum(particular, empresa, finca_venue, wedding_planner, sin_clasificar)
· email · telefono · nif_cif · direccion · localidad
· origen enum(cliente_previo, cliente_nuevo, amigo_jero, por_confirmar)
· notas · created_at
```
*Calculado (vistas):* nº presupuestos, facturación total (base imponible), ticket medio, última fecha. `etapa` calculada por origen: `cliente_previo → 'Etapa Cristina'`, resto → `'Nueva etapa'`.

### 4.3 `lugares`
```
id PK · nombre · localidad · notas
```

### 4.4 `proveedores`
```
id PK · nombre · tipo_servicio enum(floristeria, imprenta, transporte, alquiler_subcontrata, catering, mobiliario, iluminacion_av, otros)
· contacto · email · telefono · localidad · notas
```

### 4.5 `catalogo_tarifas`
```
id PK · producto · dossier · seccion · ref · precio_tarifa numeric · unidad · notas · anio_tarifa
```

### 4.6 `inventario`
```
id PK · articulo · categoria enum(...) · cantidad_total int
· coste_unitario numeric · precio_alquiler numeric · ubicacion
· estado enum(disponible, en_uso, mantenimiento, baja) · foto_url
· catalogo_id FK → catalogo_tarifas · notas
```
*Calculado:* `disponible(fecha)` = `cantidad_total` − suma de reservas activas que solapan esa fecha. Semáforo de stock si comprometido > total.

### 4.7 `solicitudes`  *(leads)*
```
id PK · titulo · estado enum(nueva, contestada, en_conversacion, presupuesto_enviado, contratada, perdida, descartada)
· fecha_entrada · canal enum(email, instagram, web, bodas_net, recomendacion, telefono, whatsapp, otro)
· tipo_evento enum(boda, comunion, corporativo, cumpleanos, bautizo, navidad, alquiler_encargo, otro)
· contacto · email · telefono · fecha_evento · lugar_texto · n_invitados
· presupuesto_estimado numeric · fianza numeric · que_pide text
· proxima_accion · fecha_proxima_accion · notas
· cliente_id FK → clientes · created_at
```
*Calculado:* `etapa` por `fecha_entrada` (< 2026-05-25 = Cristina, ≥ = Nueva etapa).

### 4.8 `presupuestos`  *(presupuesto = evento; tabla central)*
```
id PK · numero (texto, p.ej. "26014" o "26101/2026")
· serie enum(evento, alquiler_encargo) · tipo_evento enum(...)
· fecha_presupuesto · fecha_evento · fecha_montaje · fecha_recogida · responsable
· n_invitados · iva_pct numeric default 21 · retencion_pct numeric (0 o 15)
· estado enum(pendiente, aceptado, confirmado, realizado, facturado, rechazado)
· n_revisiones int · fianza numeric · fianza_devuelta bool
· cliente_id FK · lugar_id FK · solicitud_id FK · notas · created_at
```
*Calculado desde `presupuesto_lineas`:* base imponible, IVA, retención, **total**. *Calculado desde `tesoreria`:* **cobrado**, **pendiente de cobro** = total − cobrado. `etapa` por fecha_presupuesto.

### 4.9 `presupuesto_lineas`  *(NUEVO respecto a Airtable — habilita facturas de verdad)*
```
id PK · presupuesto_id FK · concepto · cantidad numeric · precio_unitario numeric
· subtotal (generated = cantidad × precio_unitario) · orden int
```

### 4.10 `facturas`
```
id PK · numero (auto, serie anual 26xxx) · presupuesto_id FK · cliente_id FK
· fecha_emision · base_imponible · iva · retencion · total
· estado enum(emitida, cobrada, anulada) · pdf_url · notas
```
*El número se genera automáticamente al emitir (siguiente correlativo de la serie).*

### 4.11 `reservas_material`
```
id PK · presupuesto_id FK · articulo_id FK → inventario · cantidad int
· fecha_salida · fecha_devolucion · estado enum(reservado, entregado, devuelto, incidencia) · notas
```

### 4.12 `partes_horas`
```
id PK · presupuesto_id FK · empleado · fecha · tarea enum(...) · horas numeric
· precio_hora numeric · coste (generated = horas × precio_hora) · notas
```

### 4.13 `tesoreria`  *(todo el dinero)*
```
id PK · concepto · tipo enum(ingreso, gasto) · categoria enum(...)
· importe numeric (SIEMPRE positivo) · fecha · estado enum(previsto, cobrado, pagado, vencido)
· metodo enum(transferencia, efectivo, bizum, tarjeta, domiciliacion, otro)
· n_factura · notas · cliente_id FK · proveedor_id FK · presupuesto_id FK
· gasto_fijo_id FK · factura_id FK
· computa_contabilidad bool  ← controla si entra en la contabilidad mensual
· created_at
```
*Calculado:* `mes_contable` = `to_char(fecha,'YYYY-MM')`. `etapa` por fecha.

### 4.14 `gastos_fijos`  *(plantilla mensual)*
```
id PK · concepto · importe_mensual numeric · periodicidad enum(mensual, trimestral, anual)
· dia_cargo int · a_quien_se_paga · quien_lo_paga enum(tdo, sarmi, jero, cris, jero_cris, fotomaton_mas)
· activo bool · notas
```

### 4.15 `socios_aportaciones`  *(NUEVO — para la futura SL)*
```
id PK · socio_id FK · concepto · importe numeric · fecha · tipo enum(capital, prestamo, gasto_asumido) · notas
```
*Para cuadrar quién ha puesto qué (hoy: Cris 11.200 €, Jero 7.400 €, Sarmi pendiente) frente al reparto 40/30/30.*

---

## 5. Reglas de negocio (el cerebro)

Estas reglas son la lógica que Airtable tenía repartida en fórmulas. En la app viven en la base (vistas/funciones) o en la capa de servicios.

1. **Etapas.** Corte **25-may-2026**. Todo lo anterior = "Etapa Cristina"; desde esa fecha = "Nueva etapa". Es una simple comparación de fecha (no hace falta campo especial).
2. **IVA y retención.** IVA 21 % por defecto. A **clientes tipo `empresa` se aplica retención −15 %** (IRPF). Total = base + IVA − retención.
3. **Numeración de facturas.** Serie anual autoincremental `26xxx`. Al emitir factura, coger el siguiente número libre. (Ojo: histórico usó 26004…26013 y 26101 para un caso especial.)
4. **Contabilidad mensual (regla clave, decisión de los socios).** La contabilidad **arranca en junio 2026** y **solo cuenta**: (a) ingresos de facturas propias de la nueva etapa y (b) gastos fijos. Los **gastos variables** (gasolina, dietas, portes, material de evento) y **la inversión inicial** quedan registrados en Tesorería pero con `computa_contabilidad = false`. El dashboard suma solo lo que computa.
   - *Ingresos cobrados del mes* = Σ tesorería (tipo=ingreso, estado=cobrado, computa=true) del mes.
   - *Gastos del mes* = Σ tesorería (tipo=gasto, computa=true) del mes.
   - *Resultado* = ingresos − gastos. *Previsto por cobrar* = ingresos previstos del mes.
5. **Fianzas.** No son ingreso: se guardan en su campo. Alerta activa mientras `fianza_devuelta = false` (dinero que hay que devolver al cliente).
6. **Disponibilidad de inventario.** Un artículo está disponible en una fecha si `cantidad_total` > Σ cantidades reservadas (estado reservado/entregado) cuyo rango salida–devolución solapa esa fecha. Bloquear/avisar al reservar de más.
7. **Cobrado de un evento.** Se calcula sumando los movimientos de tesorería (ingreso, cobrado) enlazados a ese presupuesto. "Pendiente" = total − cobrado.
8. **Estados que disparan cosas:** solicitud → `contratada` ofrece "crear presupuesto"; presupuesto → `facturado` ofrece "emitir factura PDF" y crea el ingreso previsto en tesorería.

---

## 6. Módulos y pantallas

### Fase 1 — Comercial (leads, presupuestos, facturas)
- **Dashboard (home):** próximas acciones que vencen hoy/atrasadas, presupuestos pendientes de cobro, fianzas por devolver, próximos eventos (montajes de la semana).
- **Solicitudes:** lista filtrable por estado + tablero tipo kanban (Nueva → … → Contratada). Ficha con "próxima acción" destacada. Botón "Convertir en presupuesto".
- **Presupuestos/Eventos:** lista + ficha con líneas editables (concepto, cantidad, precio) que calculan base/IVA/retención/total en vivo. Botón "Emitir factura" → genera PDF y crea el ingreso previsto.
- **Facturas:** listado con estado, descarga de PDF, marcar cobrada.
- **Clientes:** ficha con historial de presupuestos y stats, etiqueta de etapa.

### Fase 2 — Dinero (tesorería + contabilidad)
- **Tesorería:** registro ultrarrápido de ingreso/gasto (importe positivo + tipo), categoría, enlaces opcionales a cliente/evento/proveedor. Filtros por mes, tipo, categoría, etapa.
- **Contabilidad mensual:** panel por mes con Ingresos cobrados / Gastos / Resultado / Previsto por cobrar, respetando la regla del §5.4. Gráfica de evolución.
- **Gastos fijos:** plantilla con quién paga cada cosa; botón "generar los gastos de este mes" que crea los movimientos.

### Fase 3 — Operativa (inventario + reservas)
- **Inventario:** catálogo con foto, stock, disponible en vivo, semáforo. Búsqueda rápida.
- **Reservas:** al montar un evento, reservar material con fechas; **calendario/timeline de disponibilidad** para no vender dos veces la misma pieza.
- **Partes de horas:** registrar horas por evento → coste de personal → margen real del evento.

### Fase 4 — Extras (opcional)
- Portal del cliente (ver presupuesto/factura, aceptar online).
- Avisos automáticos (WhatsApp/email) de próximas acciones, cobros vencidos, fianzas.
- App de proveedores, informes trimestrales para la gestoría.

---

## 7. Generación de facturas PDF

- Plantilla idéntica a las facturas actuales **260xx**: cabecera con logo "Tu Decoración Original", datos fiscales (Jero, NIF 51094870W, C/ Marroquina 24, 28030 Madrid), bloque cliente (nombre, NIF/CIF, dirección), tabla de conceptos, base imponible, IVA 21 %, retención −15 % si aplica, total, y pie con datos bancarios (Santander ES49 0049 1349 3820 1001 3751) y web.
- Al emitir: se congela el número de factura, se genera el PDF, se guarda en Supabase Storage y se enlaza a la factura.
- Preparar para el futuro cambio a **SL** (los datos fiscales deben ser configurables, no hardcodeados).

---

## 8. Migración desde Airtable

1. Exportar cada tabla de Airtable a CSV (o vía API con los IDs que están en el doc de traspaso, base `app6U3FLBiVgTtiD0`).
2. Script Node que mapea columnas Airtable → Postgres, resolviendo los enlaces por nombre/ID.
3. Orden de carga respetando dependencias: catálogo → inventario → lugares → proveedores → clientes → solicitudes → presupuestos → líneas → reservas → tesorería → gastos fijos.
4. Validación: cuadrar totales de tesorería y contabilidad de junio 2026 contra Airtable antes de dar por buena la migración.
5. **No migrar** el histórico de Cristina (ya se decidió excluirlo; está en la base OLD como respaldo).

---

## 9. Seguridad y mantenimiento (no negociable)

- **Auth** con Supabase, solo los 3 emails de socios. Row Level Security activado.
- **Backups automáticos** diarios de Postgres (Supabase los hace; verificar retención).
- **Registro de cambios** en movimientos de dinero (quién y cuándo).
- Datos fiscales y bancarios en variables de entorno / tabla de configuración, no en código.
- **Bus factor:** documentar el repo (README + este spec) para que cualquiera —o Claude— pueda retomarlo. Este es el punto que decide el éxito del proyecto a largo plazo.

---

## 10. Roadmap por fases

| Fase | Entregable | Se puede usar cuando… |
|---|---|---|
| **0** | Repo + Supabase + login + esquema de datos vacío | los 3 socios entran con su email |
| **1** | Comercial: clientes, solicitudes, presupuestos con líneas, facturas PDF | se puede presupuestar y facturar de verdad |
| **2** | Dinero: tesorería + contabilidad mensual + gastos fijos | sustituye la contabilidad de Airtable |
| **3** | Operativa: inventario + reservas con disponibilidad + partes de horas | se controla el material y el margen |
| **4** | Extras: portal cliente / avisos / informes | cuando el core esté sólido |

Entre Fase 2 y 3, ya se puede **apagar Airtable** para el día a día (queda como archivo histórico).

---

## 11. Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|---|---|
| Nadie mantiene la app | Este spec + código documentado; empezar lean para que sea abarcable |
| Feature creep (querer todo ya) | Disciplina de fases; Fase 1 primero, en producción, antes de seguir |
| Migración con errores de dinero | Validar totales contra Airtable; correr en paralelo unas semanas |
| Facturación con fallos legales | Numeración correlativa sin huecos, datos fiscales correctos, revisar con la gestoría |
| Dependencia de una sola persona | Repo en GitHub de la empresa, accesos a nombre de TDO, no personales |

---

## 12. Prompt de arranque para Claude Code (Fase 0 + 1)

> Copia esto en Claude Code, en un repo nuevo, junto con este documento como `SPEC.md`:

```
Vamos a construir "TDO Manager", una app de gestión para un negocio de
decoración de eventos. La especificación completa está en SPEC.md — léela entera
antes de empezar.

Stack: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase
(Postgres, Auth, Storage). Deploy en Vercel.

Empieza por la FASE 0 + FASE 1:
1. Inicializa el proyecto Next.js + Tailwind + shadcn/ui.
2. Define el esquema Postgres de Supabase con las tablas de la §4 (empieza por
   socios, clientes, lugares, solicitudes, presupuestos, presupuesto_lineas,
   facturas). Incluye los enums, las claves foráneas y los campos generados.
   Añade Row Level Security para que solo entren los 3 socios.
3. Login con Supabase Auth (magic link) restringido a 3 emails.
4. Módulo Clientes (CRUD + ficha con etapa calculada).
5. Módulo Solicitudes (lista + kanban por estado + ficha con próxima acción +
   botón "convertir en presupuesto").
6. Módulo Presupuestos con líneas editables que calculan base/IVA/retención/total
   en vivo, respetando las reglas del §5 (retención -15% solo si cliente=empresa).
7. Emisión de factura en PDF con la plantilla del §7 (datos fiscales
   configurables) y numeración correlativa de la serie 26xxx.

Móvil primero. Todo en español (dominio del negocio). Trabaja por pasos,
enséñame cada módulo funcionando antes de pasar al siguiente, y no toques la
Fase 2 hasta que la 1 esté probada.
```

---

*Documento generado a partir del sistema Airtable de TDO ya en producción. Cualquier detalle de operativa (reglas de etapas, IVA, contabilidad, fianzas) está validado con datos reales de mayo–junio 2026. Fuente del modelo: base Airtable `app6U3FLBiVgTtiD0` + documento de traspaso.*
