-- Ayudantes externos (un amigo que echa una mano): las horas llevan su nombre
-- y, como se les paga en efectivo, el pago sale en tesorería enlazado al
-- parte (si lo adelanta un socio, queda como reembolso pendiente).
alter table partes_horas add column if not exists persona_externa text;
alter table partes_horas add column if not exists tesoreria_id uuid references tesoreria(id) on delete set null;
alter table costes_estimados add column if not exists persona_externa text;
