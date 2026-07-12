-- 034 · La comisión se asigna por oportunidad, no automática por reglas.
-- Cada oportunidad indica a QUIÉN se le paga comisión (o a nadie). El % sigue
-- saliendo de las reglas (persona · tipo de evento · %), pero solo se aplica a
-- la persona asignada aquí. Vacío = sin comisión (por defecto). Así las ventas
-- propias no generan comisión salvo que se asigne a mano.
-- Ejecutar en Supabase → SQL Editor → Run.

alter table oportunidades
  add column if not exists comision_equipo_id uuid references equipo(id) on delete set null;
