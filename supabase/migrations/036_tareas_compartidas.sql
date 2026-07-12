-- Tareas compartidas: una tarea puede asignarse a varias personas. Se guarda
-- la lista completa en `asignados`; `asignada_a` sigue siendo la principal
-- (== asignados[0]) para avisos e imputación de horas.
alter table tareas
  add column if not exists asignados text[] not null default '{}';

-- Rellena `asignados` con la persona ya asignada en las tareas existentes.
update tareas
  set asignados = array[asignada_a]
  where asignada_a is not null
    and asignada_a <> ''
    and array_length(asignados, 1) is null;
