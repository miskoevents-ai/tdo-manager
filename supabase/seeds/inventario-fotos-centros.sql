-- Fotos de los centros de mesa de referencia (carpeta "FOTOS CENTROS DE MESA"
-- del Drive, subidas al bucket "Catalogo fotos 1" con nombre limpio).
-- Solo rellena los que no tienen foto. Re-ejecutable.

with base as (
  select 'https://pnsyufngekfqveluzlmn.supabase.co/storage/v1/object/public/Catalogo%20fotos%201/' as url
)
update inventario i
set foto_url = b.url || v.archivo
from base b, (values
  ('Centro de mesa básico · ref A (finca Najaraya)', 'centro-basico-ref-a-najaraya-01.jpg'),
  ('Centro de mesa sobre espejo · ref C', 'centro-espejo-ref-c-01.jpg'),
  ('Centro de mesa alargado · ref D', 'centro-alargado-ref-d-01.jpg'),
  ('Centro de mesa imperial · ref E', 'centro-imperial-ref-e-01.jpg'),
  ('Centro en altura · ref X', 'centro-altura-ref-x-01.jpg')
) as v(articulo, archivo)
where i.articulo = v.articulo
  and (i.foto_url is null or i.foto_url = '');

-- Verificación: deben salir 5 filas con foto.
select articulo, foto_url is not null as tiene_foto
from inventario
where articulo in (
  'Centro de mesa básico · ref A (finca Najaraya)',
  'Centro de mesa sobre espejo · ref C',
  'Centro de mesa alargado · ref D',
  'Centro de mesa imperial · ref E',
  'Centro en altura · ref X'
);
