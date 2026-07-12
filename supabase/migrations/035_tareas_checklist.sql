-- Lista de comprobación (checklist) por tarea: pasos que se pueden ir
-- marcando desde la tarjeta, con barra de progreso. Se guarda como JSON:
--   [{ "texto": "Comprar flores", "hecho": true }, ...]
alter table tareas
  add column if not exists checklist jsonb not null default '[]'::jsonb;
