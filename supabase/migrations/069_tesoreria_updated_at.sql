-- Ordenar la Tesorería por "lo último gestionado en el manager": no por la
-- fecha contable del movimiento, sino por cuándo se creó o se editó por última
-- vez (marcar cobrado/pagado, devolver fianza, etc.). Así lo que acabas de
-- tocar aparece arriba del todo.
--
-- Se añade updated_at (nullable, sin default para no marcar todo el histórico
-- como "reciente"), se rellena el histórico con created_at, y un trigger lo
-- pone a now() en cada insert/update. Idempotente: el backfill solo toca filas
-- sin updated_at, así re-ejecutar la migración no pisa las horas reales de edición.
alter table tesoreria add column if not exists updated_at timestamptz;

update tesoreria set updated_at = created_at where updated_at is null;

create or replace function tesoreria_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tesoreria_updated_at on tesoreria;
create trigger trg_tesoreria_updated_at
  before insert or update on tesoreria
  for each row execute function tesoreria_touch_updated_at();
