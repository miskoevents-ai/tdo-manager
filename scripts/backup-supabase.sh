#!/usr/bin/env bash
#
# ============================================================================
#  COPIA DE SEGURIDAD COMPLETA DE LA BASE DE DATOS (Supabase / Postgres)
# ============================================================================
#
#  Qué hace: descarga TODO el contenido del manager (clientes, oportunidades,
#  presupuestos, tesorería, costes, inventario... esquema + datos) a un único
#  archivo .sql con fecha. Con ese archivo se puede reconstruir el negocio
#  entero desde cero, aunque se pierda Supabase.
#
#  ---------------------------------------------------------------------------
#  CÓMO USARLO (una sola vez de preparación):
#  ---------------------------------------------------------------------------
#  1) Entra en Supabase → tu proyecto → Settings → Database.
#  2) En "Connection string" elige la pestaña "URI" y copia la cadena. Se ve así:
#        postgresql://postgres.xxxx:CONTRASEÑA@aws-0-eu-...pooler.supabase.com:5432/postgres
#     (Si te pide la contraseña de la base de datos y no la recuerdas, ahí mismo
#      puedes pulsar "Reset database password" y generar una nueva.)
#  3) Crea un archivo llamado  .env.backup  en la raíz del proyecto con una línea:
#        DATABASE_URL="postgresql://...la-cadena-que-copiaste..."
#     (Ese archivo NO se sube a git — está protegido en .gitignore.)
#
#  ---------------------------------------------------------------------------
#  CÓMO HACER LA COPIA (cada vez que quieras, p. ej. una vez por semana):
#  ---------------------------------------------------------------------------
#        bash scripts/backup-supabase.sh
#
#  Genera un archivo  backups/tdo-backup-AAAA-MM-DD_HHMM.sql
#  Súbelo a Google Drive y ya tienes tu caja fuerte del día. ✅
#
#  Alternativa: si prefieres no crear .env.backup, pásala en la misma línea:
#        DATABASE_URL="postgresql://..." bash scripts/backup-supabase.sh
# ============================================================================

set -euo pipefail

# --- Localizar la raíz del proyecto (funciona desde cualquier carpeta) -------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# --- Cargar DATABASE_URL desde .env.backup si no viene ya en el entorno ------
if [ -z "${DATABASE_URL:-}" ] && [ -f ".env.backup" ]; then
  # Lee solo la línea DATABASE_URL, sin ejecutar el archivo entero.
  DATABASE_URL="$(grep -E '^\s*DATABASE_URL=' .env.backup | head -1 | sed -E 's/^\s*DATABASE_URL=//; s/^"//; s/"$//')"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Falta DATABASE_URL."
  echo "   Crea un archivo .env.backup con la línea:"
  echo '     DATABASE_URL="postgresql://postgres.xxx:CONTRASEÑA@...supabase.com:5432/postgres"'
  echo "   (La sacas de Supabase → Settings → Database → Connection string → URI)"
  exit 1
fi

# --- Comprobar que pg_dump está instalado ------------------------------------
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "❌ pg_dump no está instalado en este equipo."
  echo "   En Mac:    brew install libpq && brew link --force libpq"
  echo "   En Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# --- Preparar carpeta y nombre de archivo con fecha --------------------------
mkdir -p backups
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="backups/tdo-backup-${STAMP}.sql"

echo "⏳ Haciendo copia completa de la base de datos..."
echo "   → $OUT"

# --no-owner / --no-privileges: la copia se puede restaurar en cualquier proyecto
# nuevo sin conflictos de usuarios/roles.
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file="$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo ""
echo "✅ Copia hecha: $OUT  ($SIZE)"
echo ""
echo "   SIGUIENTE PASO (importante): sube ese archivo a Google Drive."
echo "   Con él puedes reconstruir TODO el negocio, aunque se pierda Supabase."
echo ""
echo "   Para RESTAURAR en un proyecto nuevo algún día:"
echo "     psql \"postgresql://...nuevo-proyecto...\" -f $OUT"
