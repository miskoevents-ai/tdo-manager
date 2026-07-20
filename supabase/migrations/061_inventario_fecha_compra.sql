-- Fecha de compra de un artículo del inventario (cuándo se invirtió en la
-- pieza). El coste ya se guarda en coste_unitario; la inversión "en conjunto"
-- de una pieza = coste_unitario × cantidad_total. Con esto se calcula la
-- amortización: lo que ha generado en alquileres frente a lo que costó.
alter table inventario add column if not exists fecha_compra date;
