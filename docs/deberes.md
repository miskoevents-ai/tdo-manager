# ✅ Deberes de configuración (guía paso a paso)

Esta guía es para dejar la app 100% lista. **Ninguna tarea es de programación**:
son ajustes que solo puedes hacer tú desde tus cuentas. Están ordenadas de más
importante a menos. Hazlas con calma, una a una.

> Los **valores secretos** (CRON_SECRET, LEADS_TOKEN, claves) NO se guardan en
> este archivo por seguridad. Pídeselos a Claude en el chat o genéralos tú
> (más abajo te digo cómo).

---

## 🟢 Lo mínimo imprescindible (tareas 1, 2 y 3)

Con esto la app funciona entera. El resto son extras.

### Tarea 1 y 2 · Actualizar la base de datos (Supabase)

**Qué es:** añadir dos columnas nuevas que la app ya espera. Es como añadir dos
casillas nuevas a una hoja de Excel. No borra nada.

**Por qué:** sin ellas, la pre-reserva de material desde presupuesto y el
"tiempo de cierre" del cuadro de mando no funcionan.

**Pasos:**

1. Entra en 👉 https://supabase.com y abre tu proyecto de TDO.
2. En el menú de la izquierda, pulsa **SQL Editor** (icono `</>`).
3. Pulsa **+ New query**.
4. Copia y pega **este bloque entero** (hace las dos cosas de golpe):

   ```sql
   -- Tarea 1: enlazar líneas de presupuesto con el catálogo
   alter table presupuesto_lineas
     add column if not exists articulo_id uuid references inventario(id) on delete set null;
   create index if not exists idx_lineas_articulo on presupuesto_lineas(articulo_id);

   -- Tarea 2: fecha de confirmación (tiempo hasta el cierre)
   alter table oportunidades
     add column if not exists fecha_confirmacion date;
   ```

5. Pulsa el botón verde **Run** (o `Ctrl/Cmd + Enter`).
6. Si abajo pone **"Success. No rows returned"** → ¡perfecto, hecho! ✅

> Es seguro repetirlo: lleva `if not exists`, así que si lo ejecutas dos veces
> no pasa nada.

#### Migraciones posteriores (008 y 009)

A medida que añadimos funciones, aparecen columnas nuevas. Pega también estas
en el SQL Editor (son seguras de repetir):

```sql
-- 008 · "Pagado por" en los movimientos de tesorería
alter table tesoreria
  add column if not exists quien_lo_paga text;

-- 009 · Fidelización (reseñas y recomendaciones)
alter table oportunidades
  add column if not exists resena_pedida boolean not null default false,
  add column if not exists resena_conseguida boolean not null default false;
alter table clientes
  add column if not exists recomendacion_pedida boolean not null default false,
  add column if not exists nos_ha_recomendado boolean not null default false;
```

Sin la 008 no se pueden guardar gastos (da error); sin la 009 no funciona la
pestaña **Fidelización**.

---

### Tarea 3 · Quitar "Socio mayoritario" de la ficha de Sarmi

**Qué es:** un texto en la ficha de equipo que pediste cambiar.

**Por qué:** lo quisiste tú; el código ya no lo trae, pero tu base de datos aún
tiene el texto viejo.

**Pasos:**

1. Abre la app de TDO Manager.
2. Menú izquierdo → **Equipo**.
3. Busca a **Sarmi** y pulsa **Editar** (el lápiz ✏️).
4. En el campo de **notas**, borra "Socio mayoritario. " (deja solo
   "Hoy no se cobran las horas propias." o lo que prefieras).
5. Pulsa **Guardar**. ✅

---

## 🟡 Extras (automatizaciones y correos)

Estas hacen que la app te **mande emails solos** (informe semanal, avisos) y que
las tareas automáticas estén protegidas. Si aún no quieres emails, puedes
saltártelas y ponerlas otro día.

Todas se configuran en el **mismo sitio**:

> **Vercel** → tu proyecto → pestaña **Settings** → **Environment Variables** →
> por cada una: escribes el **nombre** (Key) y el **valor** (Value), marcas los
> 3 entornos (Production, Preview, Development) y pulsas **Save**.
> Al terminar todas, ve a **Deployments** y pulsa **Redeploy** en el último,
> para que cojan efecto.

### Las variables, una a una

| Nombre (Key) | Qué hace | De dónde sacas el valor |
|---|---|---|
| `RESEND_API_KEY` | Enviar los correos (informes/avisos) | Te registras gratis en https://resend.com → API Keys → Create → copias la clave (empieza por `re_...`) |
| `DIGEST_EMAILS` | A quién llega el informe | Tu email. Varios separados por comas: `alvaro@...,cris@...` |
| `EMAIL_FROM` | Desde qué dirección se envían | Algo como `TDO Manager <hola@tudecoracionoriginal.com>` (el dominio debe estar verificado en Resend) |
| `CRON_SECRET` | Contraseña que protege las tareas automáticas | Un texto largo al azar. **Pídeselo a Claude** o genera uno (abajo) |
| `LEADS_TOKEN` | Protege la entrada automática de leads | Igual: texto largo al azar |
| `ANTHROPIC_API_KEY` | El **asistente con IA** ✨ (el botón de la estrella) | https://console.anthropic.com → API Keys → Create Key (empieza por `sk-ant-...`) |
| `APP_URL` | La dirección de tu web | La URL de Vercel, p.ej. `https://tdo-manager.vercel.app` |
| `NEXT_PUBLIC_RESENA_URL` | El enlace de reseñas que sale en el mensaje de Fidelización | Tu ficha de Google o Bodas.net, p.ej. `https://g.page/r/...` (opcional) |

**¿Cómo genero un secreto al azar (CRON_SECRET / LEADS_TOKEN)?**
Cualquier texto largo vale. Si tienes una terminal a mano:

```bash
openssl rand -hex 24
```

…y usas lo que salga. O simplemente pídeselo a Claude en el chat.

---

## 🔒 Seguridad · Rotar la clave de Supabase

**Qué es:** durante el desarrollo se compartió por chat la clave secreta de la
base de datos. Conviene **cambiarla** (rotarla) para que la antigua deje de valer.

**Pasos:**

1. Supabase → tu proyecto → **Project Settings** (rueda dentada) → **API Keys**.
2. En la **secret key** (`sb_secret_...`), pulsa **Roll / Regenerate**.
3. Copia la clave nueva.
4. Ve a **Vercel** → Settings → Environment Variables y actualiza el valor de
   `SUPABASE_SECRET_KEY` con la nueva.
5. **Redeploy** en Vercel para que la web use la clave nueva. ✅

---

## Resumen rápido

- [ ] **1 y 2** — pegar el SQL en Supabase → Run
- [ ] **3** — editar nota de Sarmi en Equipo → Guardar
- [ ] **Extras** — variables en Vercel (solo si quieres emails/IA) → Redeploy
- [ ] **Seguridad** — rotar la clave de Supabase → Redeploy

Cuando termines 1, 2 y 3 ya tienes la app **completa y funcionando**. 🎉
