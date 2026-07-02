-- Fotos del inventario: enlaza artículos con las fotos del catálogo
-- (bucket "Catalogo fotos 1") cuando la correspondencia es clara.
-- Solo rellena los que no tienen foto. Re-ejecutable.

with base as (
  select 'https://pnsyufngekfqveluzlmn.supabase.co/storage/v1/object/public/Catalogo%20fotos%201/' as url
)
update inventario i
set foto_url = b.url || v.archivo
from base b, (values
  -- Packs del dossier
  ('Ceremonia Bambú', 'rincon-boda-ceremonia-encina-arco-triangulo-06.PNG'),
  ('Photocall Columpio', 'rincon-boda-columpio-flores-vistas-01.PNG'),
  ('Photocall Boho', 'photocall-boda-sofa-rosa-neon-01.PNG'),
  ('Rincón bienvenida Natural', 'rincon-boda-cartel-bienvenida-pampa-03.jpg'),
  ('Rincón bienvenida Alameda', 'rincon-boda-cartel-bienvenida-lucia-kevin-01.PNG'),
  ('Rincón bienvenida Espejo', 'rincon-boda-bienvenida-espejo-ovalado-sara-alberto-04.PNG'),
  -- Centros de mesa (referencias)
  ('Centro de mesa básico · ref A', 'centro-mesa-paniculata-cubo-vichy-05.jpg'),
  ('Centro de mesa sobre madera · ref B', 'centro-mesa-jarroncitos-claveles-rodaja-03.jpg'),
  ('Centro en altura · ref F (flor pequeña)', 'centro-mesa-alto-eucalipto-flores-01.PNG'),
  ('Centro en altura · ref F (flor grande)', 'centro-mesa-alto-otonal-velas-02.jpg'),
  -- Arreglos
  ('Columnas florales entrada de iglesia', 'rincon-boda-portada-iglesia-columnas-flores-03.jpg'),
  ('Decoración de jaula existente en finca', 'rincon-boda-seating-plan-jaula-flores-01.PNG'),
  -- Artículos físicos existentes
  ('Columpio vintage', 'rincon-boda-columpio-flores-vistas-01.PNG'),
  ('Sofá rosa', 'photocall-boda-sofa-rosa-neon-01.PNG'),
  ('Jaula de hierro grande', 'rincon-boda-seating-plan-jaula-flores-01.PNG'),
  ('Puertas antiguas verdes', 'rincon-boda-seating-plan-puerta-verde-paniculata-02.jpg'),
  ('Mantones de Manila', 'feria-andaluza-macetas-mantones-luz-02.PNG'),
  ('Variedad de macetas estilo andaluz', 'feria-andaluza-patio-macetas-mantones-03.PNG'),
  ('Barricas de vino antiguas', 'feria-andaluza-mesas-sillas-claveles-04.PNG')
) as v(articulo, archivo)
where i.articulo = v.articulo
  and (i.foto_url is null or i.foto_url = '');
