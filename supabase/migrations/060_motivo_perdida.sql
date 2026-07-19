-- Motivo por el que se pierde/descarta una oportunidad (precio, fecha ocupada,
-- no responde, se fue con otro proveedor…). Al marcar Perdida/Rechazada se
-- guarda aquí; el Cuadro de mando lo agrega para ver POR QUÉ no se cierra.
-- Se limpia si la oportunidad vuelve a un estado activo. Opcional (fallback).
alter table oportunidades add column if not exists motivo_perdida text;
