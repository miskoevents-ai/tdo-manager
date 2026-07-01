# TDO Manager — Briefing para desarrollador + guía de contratación
*Documento en dos partes: la PARTE 1 se la envías al candidato; la PARTE 2 es para vosotros (no la compartas).*

---

# PARTE 1 — BRIEFING (para enviar al programador/agencia)

## Quiénes somos
Tu Decoración Original, empresa de decoración efímera y alquiler de mobiliario para eventos en Madrid. Somos 3 socios y queremos una **app web interna** para gestionar todo el negocio.

## Qué necesitamos
Una plataforma de gestión (uso interno, 3 usuarios) que sustituya nuestro Airtable actual. **Ya tenemos hecha la especificación técnica completa** (modelo de datos, reglas de negocio, pantallas, facturación) — te la pasamos. Eso significa que **el análisis y el diseño funcional ya están hechos**; buscamos ejecución, no descubrimiento.

## Alcance (por fases)
1. **Fase 1 – Comercial:** clientes, solicitudes (leads con seguimiento), presupuestos con líneas y cálculo automático de IVA/retención, y **emisión de facturas en PDF** con numeración correlativa.
2. **Fase 2 – Dinero:** tesorería (ingresos/gastos) y contabilidad mensual automática.
3. **Fase 3 – Operativa:** inventario con control de disponibilidad por fechas y reservas de material.
4. **Fase 4 – Extras (opcional):** portal de cliente, avisos automáticos.

Queremos empezar por la **Fase 1** y decidir el resto según resultado.

## Stack requerido
**Next.js + TypeScript + Supabase (Postgres/Auth/Storage) + Vercel.** Móvil primero. Interfaz en español. (Si propones alternativa, justifícala.)

## Condiciones innegociables
- **El código y todos los datos son de la empresa** desde el día 1: repositorio en **nuestro** GitHub, y las cuentas de Supabase/Vercel/dominio **a nombre de la empresa**, no tuyas.
- Entrega **documentada** (README) para que podamos continuar con otro desarrollador o con IA si hiciera falta.
- Presupuesto **cerrado por fase** (tenemos el spec, así que el alcance está claro), con hitos de pago.

## Qué te pedimos para valorarte
- Ejemplos de apps internas / paneles similares que hayas hecho (idealmente Next.js + Supabase).
- Presupuesto desglosado por fase y plazo estimado de la Fase 1.
- Coste de mantenimiento mensual posterior.

---

# PARTE 2 — GUÍA PARA VOSOTROS (no compartir)

## Cuánto debería costar (orientativo, mercado España 2026)

> Rangos realistas. La **Fase 1 es el MVP** y es por donde hay que empezar. Como el spec ya está hecho, **nadie debería cobraros la fase de análisis/diseño** — eso baja el precio y el plazo respecto a un proyecto "desde cero".

| | Freelance (mid/senior) | Agencia pequeña |
|---|---|---|
| **Fase 1** (comercial + facturas PDF) | **2.500 – 5.000 €** | 6.000 – 12.000 € |
| **Fase 2** (tesorería + contabilidad) | 2.000 – 4.000 € | 5.000 – 9.000 € |
| **Fase 3** (inventario + reservas) | 2.000 – 4.000 € | 5.000 – 9.000 € |
| **Proyecto completo (1–3)** | **~7.000 – 13.000 €** | ~18.000 – 30.000 € |
| **Mantenimiento** (después) | 100 – 300 €/mes o bolsa de horas | 300 – 600 €/mes |
| **Hosting/infra** | 0 – 50 €/mes (Vercel + Supabase) | igual |

**Plazo Fase 1:** entre **2 y 5 semanas** con un freelance dedicado a media jornada. Si alguien te dice "3 meses solo para la Fase 1", o está saturado o va a inflar horas.

**Tarifas de referencia por hora** (por si te lo cobran así): freelance mid 35–55 €/h, senior 55–90 €/h. Agencia 60–120 €/h. **Prefiere precio cerrado por fase**, no por horas: el spec está claro, así que el riesgo de alcance es bajo y no tienes por qué asumir tú las horas de más.

## Cómo pagar (estructura sana)
- **Nada de 100% por adelantado.** Lo normal: **30–40% al empezar** cada fase y el resto **contra entrega funcionando**.
- Pago **por fase**, no todo el proyecto de golpe: así puedes parar si la Fase 1 no te convence, sin haber soltado 10.000 €.
- Que cada pago vaya ligado a un **entregable que puedas ver y usar**.

## Señales de alarma (que no te la cuelen)
- 🚩 **"Yo lo alojo y me pagas una cuota".** No. El código y las cuentas son vuestros. Si desaparece, os quedáis sin nada — el mismo problema que tenéis con la web de Cristina.
- 🚩 Quiere **rehacer todo el análisis** y cobrarlo. Ya está hecho: dadle el spec y que presupueste ejecución.
- 🚩 Propone una herramienta **no-code cerrada** (Bubble, Glide) donde no sois dueños del código y quedáis atados a él.
- 🚩 Presupuesto **vago** ("depende, ya veremos") sin desglose por fase.
- 🚩 Pide el **grueso del dinero por adelantado**.
- 🚩 No enseña **trabajos anteriores** ni referencias.
- 🚩 No quiere **contrato** que diga claramente que el código es vuestro.

## Qué tiene que poner el contrato (mínimos)
1. **Propiedad del código y los datos = de la empresa** (cesión total, sin licencias raras).
2. Cuentas (GitHub, Supabase, Vercel, dominio) **a nombre de la empresa**.
3. Alcance por fases + precio cerrado + hitos de pago.
4. Entrega documentada y **traspaso de accesos** al terminar.
5. Condiciones de mantenimiento (precio, tiempo de respuesta).
6. Qué pasa si lo deja a medias (código entregado hasta la fecha, sin rehenes).

## Dónde buscar
- Freelances: **Malt**, **LinkedIn**, referidos de conocidos del sector tech.
- Pide siempre 2–3 presupuestos para comparar. Con el spec en la mano, las ofertas serán mucho más parecidas y fáciles de comparar que "un CRM a medida" en abstracto.

## Truco final
Cuando te pasen presupuesto, **enséñame la propuesta y el desglose**: te digo si el precio, el plazo y las condiciones tienen sentido o si hay banderas rojas. Con el spec ya hecho, tenéis toda la fuerza de negociación de vuestro lado.

---

*Adjuntar a este briefing el documento `TDO_Manager_spec_maestro.md` solo cuando el candidato os interese y haya firmado un acuerdo de confidencialidad básico, ya que contiene detalle operativo del negocio.*
