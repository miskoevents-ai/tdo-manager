-- El plan previsto guarda también quién trabajará (persona, para las horas) y
-- quién pagará el gasto: al cuadrar la línea, se trasladan al coste real.
alter table costes_estimados add column if not exists equipo_id uuid references equipo(id) on delete set null;
alter table costes_estimados add column if not exists pagador text;
