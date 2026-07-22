# Copias de seguridad — TDO Manager

Guía práctica para que el negocio esté siempre a salvo, sin depender de nadie
en concreto.

## Qué hay guardado y dónde (importante entenderlo)

| Cosa | Dónde vive | ¿Copia de seguridad? |
|------|-----------|----------------------|
| **Código** de la aplicación | GitHub (`miskoevents-ai/tdo-manager`) | ✅ Sí, GitHub es la copia |
| **Estructura** de la base de datos (tablas) | `supabase/migrations/*.sql` en GitHub | ✅ Sí |
| **DATOS del negocio** (clientes, oportunidades, presupuestos, tesorería, costes, inventario…) | **Supabase (Postgres)** | ⚠️ **Solo si haces backup** |

> **La clave:** GitHub guarda el *código*, no los *datos*. Los datos del día a
> día están en Supabase. Perder Supabase sin copia = perder el negocio.
> Por eso existe este documento.

## Nivel 1 — Backups automáticos de Supabase (revísalo)

Entra en Supabase → tu proyecto → **Settings → Database → Backups**.

- Plan **Pro**: hay backup diario automático + recuperación a un punto en el
  tiempo (PITR). Confirma que está activo.
- Plan **Free**: los backups automáticos son limitados. Plantéate subir a Pro
  (~25 $/mes) solo por la tranquilidad, y **haz además el Nivel 2**.

## Nivel 2 — Tu copia manual (la caja fuerte que controlas tú)

Un archivo `.sql` descargado que puedes guardar donde quieras (Google Drive).
Con él se reconstruye TODO desde cero.

**Preparación (una sola vez):**

1. Supabase → **Settings → Database → Connection string → URI**. Copia la cadena
   `postgresql://postgres.xxx:CONTRASEÑA@...supabase.com:5432/postgres`.
   (Si no recuerdas la contraseña, ahí puedes pulsar *Reset database password*.)
2. Crea un archivo `.env.backup` en la raíz del proyecto con:
   ```
   DATABASE_URL="postgresql://...la-cadena-que-copiaste..."
   ```
   Ese archivo está protegido en `.gitignore`: **nunca** se sube a GitHub.

**Hacer la copia (cada semana o antes de cambios grandes):**
```bash
bash scripts/backup-supabase.sh
```
Genera `backups/tdo-backup-AAAA-MM-DD_HHMM.sql`. **Súbelo a Google Drive.**

**Restaurar algún día (en un proyecto Supabase nuevo):**
```bash
psql "postgresql://...proyecto-nuevo..." -f backups/tdo-backup-XXXX.sql
```

## Nivel 3 — Que no dependa de una sola persona

Asegúrate de que **al menos dos personas** tienen acceso a las tres cuentas:

- **GitHub** (el código)
- **Supabase** (los datos)
- **Vercel** (el despliegue en producción)

Si todo cuelga de un solo email y esa persona no está disponible, ahí hay más
riesgo real que en cualquier fallo técnico.

## Rutina recomendada (resumen)

- [ ] **Hoy:** verificar backups automáticos en Supabase + hacer la primera copia manual.
- [ ] **Cada semana:** `bash scripts/backup-supabase.sh` → subir el `.sql` a Drive.
- [ ] **Una vez:** dar acceso a una segunda persona en GitHub, Supabase y Vercel.
