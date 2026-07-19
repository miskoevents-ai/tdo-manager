-- Probabilidad de cierre (%) de una oportunidad: probabilidad de que acabe en
-- dinero. Sirve para ponderar el pipeline (Σ total × %) y tener una previsión
-- realista, no solo el bruto "todo lo que hay en el aire".
--
-- Es OPCIONAL: si está vacía, se usa la probabilidad por defecto del estado
-- (nueva 10, contestada 25, en conversación 45, presup. enviado 60,
-- confirmada→facturada 100, perdida/rechazada 0). Si se rellena a mano, manda
-- ese valor. Entero 0–100. El server action tiene fallback tolerante.
alter table oportunidades add column if not exists probabilidad integer;
