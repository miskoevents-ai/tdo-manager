-- Tarifario TDO 2026: precios de Cristina +12% con redondeo comercial.
-- 1) Actualiza precios de artículos existentes del inventario.
-- 2) Inserta arreglos florales, centros de mesa y packs del dossier (dedup por nombre).
-- Re-ejecutable sin duplicar. Ejecutar en Supabase → SQL Editor → Run.

-- ---------- 1 · ACTUALIZACIONES de artículos existentes ----------
update inventario set precio_alquiler = 95, coste_unitario = 10 where articulo ilike 'Bañera retro' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 140, coste_unitario = 15 where articulo ilike 'Bañera antigua blanca' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 90, coste_unitario = 18 where articulo ilike 'Diván de terciopelo marfil' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 200, coste_unitario = 20 where articulo ilike 'Columpio vintage' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 335, coste_unitario = 180, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Precio del juego de letras de madera con luz.' where articulo ilike 'Letras “LOVE” con bombillas' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 200, coste_unitario = 50, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Precio del conjunto con velas led.' where articulo ilike 'Candelabros altos de hierro' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 275, coste_unitario = 70, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Precio del juego de 7 alfombras.' where articulo ilike 'Alfombras persas/kilim' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 15, coste_unitario = 3, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad. Pareja 18 €, conjunto de 8 = 180 €.' where articulo ilike 'Maletas y baúles antiguos' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 170, coste_unitario = 30 where articulo ilike 'Arcos para ceremonia' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 58, coste_unitario = 5, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Mismo precio que el biombo hindú del dossier.' where articulo ilike 'Biombo de forja' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 34, coste_unitario = 5 where articulo ilike 'Escalera antigua con estantes' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 125, coste_unitario = 15 where articulo ilike 'Puertas antiguas verdes' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 45, coste_unitario = 8, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Se usa en el rincón de alpargatas.' where articulo ilike 'Puerta antigua rústica con cristal' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 3 where articulo ilike 'Máquina de escribir antigua' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 90, coste_unitario = 25 where articulo ilike 'Sofá rosa' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 10 where articulo ilike 'Carrito antiguo pequeño' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 100, coste_unitario = 10 where articulo ilike 'Camarera (carrito para bebidas vintage)' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 100, coste_unitario = 10 where articulo ilike 'Carro rústico grande' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 110, coste_unitario = 25 where articulo ilike 'Espejo para cartel de bienvenida' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 205, coste_unitario = 25, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Como espejo ovalado con texto personalizado.' where articulo ilike 'Cornucopia antigua (espejo de marco antiguo)' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 130, coste_unitario = 80 where articulo ilike 'Neón de pared con el nombre de la marca' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 14, coste_unitario = 4, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Farol mediano. Pequeño 5 €, grande 27 €.' where articulo ilike 'Faroles con vela LED' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 27, coste_unitario = 6 where articulo ilike 'Faroles grandes blancos' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 14, coste_unitario = 4 where articulo ilike 'Faroles blancos' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 14, coste_unitario = 4 where articulo ilike 'Faroles de mimbre' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 14, coste_unitario = 4 where articulo ilike 'Faroles de madera burdeos' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 54, coste_unitario = 10 where articulo ilike 'Mesa rústica para eventos' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 100, coste_unitario = 10 where articulo ilike 'Tocador con espejo' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 54, coste_unitario = 15 where articulo ilike 'Bicicleta retro' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 45, coste_unitario = 10 where articulo ilike 'Trasera de madera' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 27, coste_unitario = 3 where articulo ilike 'Marco grande para seating plan' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 10 where articulo ilike 'Consola rústica' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 10 where articulo ilike 'Consola gris desgastada de doble cajón' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 10 where articulo ilike 'Consola retro de 3 cajones' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 10 where articulo ilike 'Consola retro de 5 cajones' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 10 where articulo ilike 'Consola gris con puerta y cajón' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 14, coste_unitario = 3, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad.' where articulo ilike 'Cajas de fruta antiguas' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 14, coste_unitario = 3, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad.' where articulo ilike 'Diversas cajas de madera de distintos tamaños y formas' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 34, coste_unitario = 8 where articulo ilike 'Banquitos de madera usados para rincón de pétalos' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 17, coste_unitario = 4 where articulo ilike 'Banquito de madera pequeño' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 17, coste_unitario = 4, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad.' where articulo ilike 'Pedestales de madera' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 17, coste_unitario = 4, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad.' where articulo ilike 'Pedestales blancos (1 convertible en atril)' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 17, coste_unitario = 4, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad.' where articulo ilike 'Pedestales de cerámica blancos' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 17, coste_unitario = 4, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad.' where articulo ilike 'Pedestales dorados para centros en altura' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 28, coste_unitario = 5 where articulo ilike 'Peana de madera para cartel' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 28, coste_unitario = 5 where articulo ilike 'Peana para colocar flechas' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 28, coste_unitario = 5 where articulo ilike 'Peana de madera para colocar flecha/cartel' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 110, coste_unitario = 40, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Precio decorada con arreglo floral.' where articulo ilike 'Jaula de hierro grande' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 67, coste_unitario = 10 where articulo ilike 'Banco rústico con tapa con 2 cojines' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 56, coste_unitario = 10 where articulo ilike 'Estantes de cajas en altura para rincón de alpargatas' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 11, coste_unitario = 3 where articulo ilike 'Tela blanca para arco' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 34, coste_unitario = 3, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Como tinaja de barro vacía.' where articulo ilike 'Vasijas de barro' and (precio_alquiler is null or precio_alquiler = 0);
update inventario set precio_alquiler = 28, coste_unitario = 6, notas = coalesce(notas,'') || case when coalesce(notas,'')='' then '' else ' · ' end || 'Por unidad. Juego de 6 redondas = 165 €.' where articulo ilike 'Alfombra de yute' and (precio_alquiler is null or precio_alquiler = 0);

-- ---------- 2 · ARREGLOS FLORALES Y ARTÍCULOS DEL DOSSIER ----------
insert into inventario (articulo, categoria, coste_unitario, precio_alquiler, notas)
select v.articulo, v.categoria, v.coste, v.precio, v.notas
from (values
  ('Cesto pequeño con arreglo floral', 'Arreglo floral', 15, 34, 'Tarifario 2026 (antes 30 €).'),
  ('Cesto mediano con arreglo floral', 'Arreglo floral', 27, 47, 'Tarifario 2026 (antes 42 €).'),
  ('Cesto/copa grande con arreglo floral', 'Arreglo floral', 40, 77, 'Tarifario 2026 (antes 69 €).'),
  ('Cesta pequeña con paniculata', 'Arreglo floral', 18, 28, 'Tarifario 2026 (antes 25 €).'),
  ('Cesto mediano con paniculata', 'Arreglo floral', 22, 39, 'Tarifario 2026 (antes 35 €).'),
  ('Cesto mediano con pampas', 'Arreglo floral', 23, 50, 'Tarifario 2026 (antes 45 €).'),
  ('Cesto mediano verdes y florecita o pampas', 'Arreglo floral', 24, 40, 'Tarifario 2026 (antes 36 €).'),
  ('Arreglo floral de suelo en verdes y blanco', 'Arreglo floral', 36, 47, 'Tarifario 2026 (antes 42 €).'),
  ('Arreglo floral de suelo con pampas y paniculata', 'Arreglo floral', 27, 58, 'Tarifario 2026 (antes 52 €).'),
  ('Arreglo floral de suelo con pampas y flores', 'Arreglo floral', 37, 84, 'Tarifario 2026 (antes 75 €).'),
  ('Arreglo floral de altar (suelo)', 'Arreglo floral', 45, 95, 'Tarifario 2026 (antes 85 €).'),
  ('Copas de altar con arreglo floral', 'Arreglo floral', 55, 120, 'Tarifario 2026 (antes 105 €).'),
  ('Cesta delantera de bicicleta con flores', 'Arreglo floral', 40, 47, 'Tarifario 2026 (antes 42 €).'),
  ('Cesta trasera de bicicleta con flores', 'Arreglo floral', 40, 47, 'Tarifario 2026 (antes 42 €).'),
  ('Centro de flores mesa de altar pequeño', 'Arreglo floral', 15, 34, 'Tarifario 2026 (antes 30 €).'),
  ('Centro de flores mesa de altar mediano', 'Arreglo floral', 32, 54, 'Tarifario 2026 (antes 48 €).'),
  ('Centro de flores mesa de altar grande', 'Arreglo floral', 40, 83, 'Tarifario 2026 (antes 74 €).'),
  ('Arreglos asimétricos para arco de ceremonia', 'Arreglo floral', 90, 170, 'Tarifario 2026 (antes 150 €).'),
  ('Ramito flores bancos iglesia con lazada larga', 'Arreglo floral', 30, 39, 'Tarifario 2026 (antes 35 €).'),
  ('Ramito sencillo para sillas de pasillo', 'Arreglo floral', 9, 14, 'Tarifario 2026 (antes 12 €).'),
  ('Ramito amplio para sillas de pasillo', 'Arreglo floral', 12, 20, 'Tarifario 2026 (antes 18 €).'),
  ('Arbusto estilo ficus', 'Arreglo floral', 17, 56, 'Tarifario 2026 (antes 50 €).'),
  ('Cesto con 40 conos de confeti', 'Arreglo floral', 45, 95, 'Tarifario 2026 (antes 85 €).'),
  ('Cesto con 60 conos de confeti', 'Arreglo floral', 63, 105, 'Tarifario 2026 (antes 95 €).'),
  ('Cesto con 40 conos de pétalos de rosa naturales', 'Arreglo floral', 58, 120, 'Tarifario 2026 (antes 105 €).'),
  ('Cesto con 60 conos de pétalos de rosa naturales', 'Arreglo floral', 78, 130, 'Tarifario 2026 (antes 115 €).'),
  ('Cesto con pétalos de rosa', 'Arreglo floral', 23, 56, 'Tarifario 2026 (antes 50 €).'),
  ('Arreglo verde y flores sobre marco de seating', 'Arreglo floral', 36, 65, 'Tarifario 2026 (antes 58 €).'),
  ('Arreglo verde y flores sobre trasera (rincón Haya)', 'Arreglo floral', 90, 170, 'Tarifario 2026 (antes 150 €).'),
  ('Arreglos laterales de puerta (rincón Encina)', 'Arreglo floral', 75, 135, 'Tarifario 2026 (antes 120 €).'),
  ('Columnas florales entrada de iglesia', 'Arreglo floral', 500, 1120, 'Tarifario 2026 (antes 1000 €).'),
  ('Arreglo floral medias lunas de ceremonia', 'Arreglo floral', 530, 1120, 'Tarifario 2026 (antes 1000 €).'),
  ('Tinaja de barro con arreglo floral', 'Arreglo floral', 32, 67, 'Tarifario 2026 (antes 60 €).'),
  ('Decoración de jaula existente en finca', 'Arreglo floral', 40, 110, 'Tarifario 2026 (antes 100 €).'),
  ('Ramaje para columpio y cartel', 'Arreglo floral', 2, 125, 'Tarifario 2026 (antes 110 €).'),
  ('Arreglo flor artificial photocall boho con alfombra', 'Arreglo floral', 65, 170, 'Tarifario 2026 (antes 154 €).'),
  ('Espejo rectangular de bienvenida con texto', 'Decorativos / Mobiliario', 30, 110, 'Tarifario 2026 (antes 100 €).'),
  ('Espejo ovalado de bienvenida con texto', 'Decorativos / Mobiliario', 33, 205, 'Tarifario 2026 (antes 182 €).'),
  ('Cartel de madera de bienvenida con texto', 'Decorativos / Mobiliario', 25, 110, 'Tarifario 2026 (antes 100 €).'),
  ('Cartel de madera «Aquí comienza…»', 'Decorativos / Mobiliario', 5, 100, 'Tarifario 2026 (antes 90 €).'),
  ('Neón (frase a elegir)', 'Iluminación', 110, 130, 'Tarifario 2026 (antes 116 €).'),
  ('Farol pequeño con vela led', 'Iluminación', 2, 5, 'Tarifario 2026 (antes 4 €).'),
  ('Farol mediano con vela led', 'Iluminación', 4, 14, 'Tarifario 2026 (antes 12 €).'),
  ('Farol grande con vela led', 'Iluminación', 6, 27, 'Tarifario 2026 (antes 24 €).'),
  ('Jarrón blanco', 'Decorativos / Mobiliario', 3, 9, 'Tarifario 2026 (antes 8 €).'),
  ('Damajuana pequeña con pampas', 'Decorativos / Mobiliario', 2, 7, 'Tarifario 2026 (antes 6 €).'),
  ('Damajuana', 'Decorativos / Mobiliario', 2, 9, 'Tarifario 2026 (antes 8 €).'),
  ('Peana con flecha personalizada', 'Decorativos / Mobiliario', 13, 28, 'Tarifario 2026 (antes 25 €).'),
  ('Peana con cartel de cervezas', 'Decorativos / Mobiliario', 3, 28, 'Tarifario 2026 (antes 25 €).'),
  ('Bañera retro', 'Decorativos / Mobiliario', 10, 95, 'Tarifario 2026 (antes 85 €).'),
  ('Bañera blanca', 'Decorativos / Mobiliario', 15, 140, 'Tarifario 2026 (antes 125 €).'),
  ('Diván', 'Decorativos / Mobiliario', 18, 90, 'Tarifario 2026 (antes 80 €).'),
  ('Mesa rústica', 'Decorativos / Mobiliario', 10, 54, 'Tarifario 2026 (antes 48 €).'),
  ('Carrito antiguo', 'Decorativos / Mobiliario', 10, 56, 'Tarifario 2026 (antes 50 €).'),
  ('Tronco decorativo', 'Decorativos / Mobiliario', 2, 7, 'Tarifario 2026 (antes 6 €).'),
  ('Jarrón con velas flotantes', 'Iluminación', 8, 18, 'Tarifario 2026 (antes 16 €).'),
  ('Marco de tela de gallinero para seating', 'Decorativos / Mobiliario', 3, 27, 'Tarifario 2026 (antes 24 €).'),
  ('Juego de 6 alfombras de yute redondas', 'Decorativos / Mobiliario', 33, 165, 'Tarifario 2026 (antes 148 €).'),
  ('Juego de 7 alfombras persas/kilim', 'Decorativos / Mobiliario', 70, 275, 'Tarifario 2026 (antes 245 €).'),
  ('Arco de madera de ceremonia', 'Decorativos / Mobiliario', 30, 170, 'Tarifario 2026 (antes 150 €).'),
  ('Tela crep blanca para arco', 'Decorativos / Mobiliario', 6, 11, 'Tarifario 2026 (antes 10 €).'),
  ('Banquito para cestos de pétalos', 'Decorativos / Mobiliario', 8, 34, 'Tarifario 2026 (antes 30 €).'),
  ('Caja de madera antigua', 'Decorativos / Mobiliario', 3, 14, 'Tarifario 2026 (antes 12 €).'),
  ('Triángulo de madera de altar', 'Decorativos / Mobiliario', 10, 270, 'Tarifario 2026 (antes 240 €).'),
  ('Maleta antigua', 'Decorativos / Mobiliario', 3, 15, 'Tarifario 2026 (antes 13 €).'),
  ('Pareja de maletas antiguas', 'Decorativos / Mobiliario', 5, 18, 'Tarifario 2026 (antes 16 €).'),
  ('Conjunto de 8 maletas antiguas', 'Decorativos / Mobiliario', 30, 180, 'Tarifario 2026 (antes 160 €).'),
  ('Cartel mapamundi de musgo preservado (seating)', 'Decorativos / Mobiliario', 45, 135, 'Tarifario 2026 (antes 120 €).'),
  ('Cartel mapamundi impreso en madera', 'Decorativos / Mobiliario', 72, 155, 'Tarifario 2026 (antes 138 €).'),
  ('Cartel rincón de limonada', 'Decorativos / Mobiliario', 4, 17, 'Tarifario 2026 (antes 15 €).'),
  ('Cesto para alpargatas con cartel de talla', 'Decorativos / Mobiliario', 1, 6, 'Tarifario 2026 (antes 5 €).'),
  ('Puerta «Deja tus tacones y a bailar»', 'Decorativos / Mobiliario', 8, 45, 'Tarifario 2026 (antes 40 €).'),
  ('Banco con tapa', 'Decorativos / Mobiliario', 10, 67, 'Tarifario 2026 (antes 60 €).'),
  ('Cajas en estantería', 'Decorativos / Mobiliario', 10, 56, 'Tarifario 2026 (antes 50 €).'),
  ('Escalera vintage', 'Decorativos / Mobiliario', 5, 34, 'Tarifario 2026 (antes 30 €).'),
  ('Biombo hindú', 'Decorativos / Mobiliario', 5, 58, 'Tarifario 2026 (antes 52 €).'),
  ('Trasera de madera (rincón Chopo)', 'Decorativos / Mobiliario', 10, 45, 'Tarifario 2026 (antes 40 €).'),
  ('Trasera de madera vintage (rincón Haya)', 'Decorativos / Mobiliario', 10, 90, 'Tarifario 2026 (antes 80 €).'),
  ('Puertas antiguas', 'Decorativos / Mobiliario', 15, 125, 'Tarifario 2026 (antes 110 €).'),
  ('Consola de madera rústica', 'Decorativos / Mobiliario', 10, 56, 'Tarifario 2026 (antes 50 €).'),
  ('Máquina de escribir antigua', 'Decorativos / Mobiliario', 3, 56, 'Tarifario 2026 (antes 50 €).'),
  ('Columpio de hierro', 'Decorativos / Mobiliario', 20, 200, 'Tarifario 2026 (antes 180 €).'),
  ('Sofá rosa / Chester', 'Decorativos / Mobiliario', 25, 90, 'Tarifario 2026 (antes 80 €).'),
  ('Letras de madera con luz', 'Iluminación', 180, 335, 'Tarifario 2026 (antes 300 €).'),
  ('Letras blancas con luz', 'Iluminación', 265, 420, 'Tarifario 2026 (antes 375 €).'),
  ('Candelabros de forja con velas led', 'Iluminación', 50, 200, 'Tarifario 2026 (antes 180 €).'),
  ('Bicicleta vintage', 'Decorativos / Mobiliario', 15, 54, 'Tarifario 2026 (antes 48 €).'),
  ('Pedestal / banquito / taburete', 'Decorativos / Mobiliario', 4, 17, 'Tarifario 2026 (antes 15 €).'),
  ('Mesa expositora', 'Decorativos / Mobiliario', 5, 100, 'Tarifario 2026 (antes 90 €).'),
  ('Carrito vintage', 'Decorativos / Mobiliario', 10, 100, 'Tarifario 2026 (antes 90 €).'),
  ('Carrito provenzal', 'Decorativos / Mobiliario', 15, 135, 'Tarifario 2026 (antes 120 €).'),
  ('Tocador vintage', 'Decorativos / Mobiliario', 10, 100, 'Tarifario 2026 (antes 90 €).'),
  ('Tinaja de barro vacía', 'Decorativos / Mobiliario', 3, 34, 'Tarifario 2026 (antes 30 €).')
) as v(articulo, categoria, coste, precio, notas)
where not exists (select 1 from inventario i where i.articulo = v.articulo);

-- ---------- 3 · CENTROS DE MESA (referencias del dossier) ----------
insert into inventario (articulo, categoria, coste_unitario, precio_alquiler, notas)
select v.articulo, v.categoria, v.coste, v.precio, v.notas
from (values
  ('Centro de mesa básico · ref A', 'Centros de mesa', 11, 25, 'Tarifario 2026 (antes 22 €). Precio por unidad.'),
  ('Centro de mesa básico · ref A (finca Najaraya)', 'Centros de mesa', 8, 20, 'Tarifario 2026 (antes 18 €). Precio por unidad.'),
  ('Centro de mesa sobre madera · ref B', 'Centros de mesa', 9, 28, 'Tarifario 2026 (antes 25 €). Precio por unidad.'),
  ('Centro de mesa sobre espejo · ref C', 'Centros de mesa', 9, 28, 'Tarifario 2026 (antes 25 €). Precio por unidad.'),
  ('Centro de mesa alargado · ref D', 'Centros de mesa', 32, 54, 'Tarifario 2026 (antes 48 €). Precio por unidad.'),
  ('Centro de mesa imperial · ref E', 'Centros de mesa', 100, 170, 'Tarifario 2026 (antes 152 €). Precio por unidad.'),
  ('Centro en altura · ref F (flor pequeña)', 'Centros de mesa', 30, 67, 'Tarifario 2026 (antes 60 €). Precio por unidad.'),
  ('Centro en altura · ref F (flor grande)', 'Centros de mesa', 50, 95, 'Tarifario 2026 (antes 85 €). Precio por unidad.'),
  ('Centro en altura · ref X', 'Centros de mesa', 70, 125, 'Tarifario 2026 (antes 110 €). Precio por unidad.')
) as v(articulo, categoria, coste, precio, notas)
where not exists (select 1 from inventario i where i.articulo = v.articulo);

-- ---------- 4 · PACKS DEL DOSSIER ----------
insert into inventario (articulo, categoria, precio_alquiler, notas)
select v.articulo, 'Packs del dossier', v.precio, v.notas
from (values
  ('Rincón bienvenida Natural', 190, 'Cartel de bienvenida artesanal y 2 cestos: uno con pampas y otro con paniculata. Tarifario 2026 (antes 170 €).'),
  ('Rincón bienvenida Alameda', 190, 'Cartel artesanal con nombres y fecha personalizados con ramaje, sobre atril, y 2 cestos con paniculata. Tarifario 2026 (antes 170 €).'),
  ('Rincón bienvenida Espejo', 245, 'Espejo con texto personalizado, cestos con flores de temporada a elegir y faroles con vela led. Tarifario 2026 (antes 218 €).'),
  ('Rincón bicicleta', 130, 'Bicicleta de bambú decorada con cesta delantera de flores de temporada y flecha en peana personalizada. Tarifario 2026 (antes 115 €).'),
  ('Rincón de cerveza retro', 125, 'Bañera retro de hierro y peana con cartel de cervezas. Tarifario 2026 (antes 110 €).'),
  ('Rincón de cerveza jardín', 315, 'Bañera antigua, peana con cartel de cervezas y bicicleta con flores de colores a elegir. Tarifario 2026 (antes 280 €).'),
  ('Ceremonia Roma Jardín', 280, 'Altar con centro alargado de flores de temporada, diván para los novios y 8 ramitos de pasillo. Tarifario 2026 (antes 250 €).'),
  ('Ceremonia Roma', 590, 'Altar con centro alargado, diván para los novios, pareja de copas con flores y 6 cestos de pasillo. Tarifario 2026 (antes 525 €).'),
  ('Ceremonia Boho', 455, 'Centro sobre consola rústica con verde y paniculata y 6 arreglos de pasillo con pampas y flores blancas. Tarifario 2026 (antes 408 €).'),
  ('Ceremonia Provenza', 755, '6 arreglos de pasillo, centro sobre consola, carrito antiguo con 60 conos de pétalos, damajuana, cesto de paniculata y alfombras de yute. Tarifario 2026 (antes 676 €).'),
  ('Ceremonia Italia', 605, 'Arco de madera con dos arreglos asimétricos, centro con paniculata, diván y 10 ramitos de pasillo. Tarifario 2026 (antes 540 €).'),
  ('Ceremonia Melodía', 885, 'Arco de madera con arreglos asimétricos, 12 ramitos de pasillo, 8 cestitos y rincón de pétalos con 100 conos. Tarifario 2026 (antes 790 €).'),
  ('Ceremonia Alegría', 955, 'Arco con arreglos asimétricos, arreglos sobre mesa, 8 ramitos, cesto floral, 2 faroles y 4 cestos de pétalos sobre carrito y bancos. Tarifario 2026 (antes 853 €).'),
  ('Ceremonia Bambú', 1025, 'Estructura triangular de madera decorada con pampas y flores, 8 cestos y bodegones de entrada con conos de pétalos y damajuanas. Tarifario 2026 (antes 914 €).'),
  ('Rincón Lucía (pétalos)', 200, 'Cesto de 60 conos con confeti de pétalo natural, carrito antiguo, damajuana y cesto de paniculata. Tarifario 2026 (antes 178 €).'),
  ('Rincón Ángela (pétalos)', 260, 'Pareja de cestos con 100 conos de confeti de pétalo natural y carrito antiguo. Tarifario 2026 (antes 230 €).'),
  ('Rincón Casilda (pétalos)', 56, 'Cesto sobre banco de madera con pétalos de rosas frescas del color a elegir. Tarifario 2026 (antes 50 €). Precio por unidad.'),
  ('Entrada Toscana', 94, 'Pareja de cestos con base verde y flores de temporada de colores a elegir. Tarifario 2026 (antes 84 €). Precio por pareja.'),
  ('Camino Provenza', 67, 'Bodegón de tronco de árbol, farol con vela led y cesto con verde y paniculata. Tarifario 2026 (antes 60 €). Precio por unidad.'),
  ('Camino Entrevelas I', 67, 'Bodegón de 3 jarrones de cristal ahumado con velas flotantes y farol con vela led. Tarifario 2026 (antes 60 €). Precio por unidad.'),
  ('Camino Entrevelas II', 76, 'Bodegón de 3 jarrones con velas flotantes, farol con vela led y cesto floral de color a elegir. Tarifario 2026 (antes 68 €). Precio por unidad.'),
  ('Pasillo Boho (7 alfombras persas)', 275, 'Camino de 7 alfombras persas/kilim para el pasillo de ceremonia. Tarifario 2026 (antes 245 €).'),
  ('Seating Verona', 215, 'Marco antiguo con tela de gallinero y ramaje sobre atril, 2 cestos de flores de temporada y 3 jarrones blancos. Tarifario 2026 (antes 190 €).'),
  ('Seating Boho', 215, 'Marco de madera con tela de gallinero y ramaje, 2 cestos y 3 damajuanas con pampas y paniculata. Tarifario 2026 (antes 190 €).'),
  ('Seating Niza', 310, 'Mesa con botellas de cristal con flores, nombres pintados a mano, cajas de madera, cinco faroles y damajuanas con pampas. Tarifario 2026 (antes 275 €).'),
  ('Seating Viajero', 315, 'Cartel mapamundi de musgo preservado con nombres pintados a mano y conjunto de 8 maletas antiguas. Tarifario 2026 (antes 280 €).'),
  ('Rincón Celina (alpargatas)', 160, 'Puerta rústica con frase pintada, 6 cestos con números, 5 cajas de madera y 2 faroles. Tarifario 2026 (antes 142 €).'),
  ('Rincón Claudia (alpargatas)', 215, 'Biombo hindú, cajas en estanterías, escalera con cajones, banco rústico con tapa y cartel. Tarifario 2026 (antes 192 €).'),
  ('Rincón Chopo (fotos)', 110, 'Trasera de madera rústica, pareja de maletas y cesto floral de temporada. Tarifario 2026 (antes 98 €).'),
  ('Rincón Haya (detalles)', 260, 'Trasera vintage con tela de gallinero decorada con ramaje y flores de temporada. Tarifario 2026 (antes 230 €).'),
  ('Rincón Encina (fotos)', 260, 'Puertas antiguas con arreglo de ramaje y flores de temporada de colores a elegir. Tarifario 2026 (antes 230 €).'),
  ('Rincón Acacia (regalos)', 170, 'Puertas antiguas, 3 cajas de fruta y pareja de maletas. Tarifario 2026 (antes 150 €).'),
  ('Rincón de firmas Cerezo', 170, 'Consola francesa, candelabro, portacartas, elefantes con libros, cartel y máquina de escribir antigua. Tarifario 2026 (antes 150 €).'),
  ('Photocall Columpio', 325, 'Columpio de hierro decorado con ramaje y rosas blancas, con cartel (frase personalizable). Tarifario 2026 (antes 290 €).'),
  ('Photocall Chester Flores', 560, 'Sofá Chester con pareja de copas florales bajo estructura de madera con ramaje y neón a elegir. Tarifario 2026 (antes 500 €).'),
  ('Photocall Boho', 560, 'Estructura con palmeras y ramaje, neón a elegir, sofá rosa y arreglos florales sobre alfombra de yute. Tarifario 2026 (antes 500 €).'),
  ('Letras con luz (madera)', 335, 'Iniciales de madera con bombillas de luz cálida. Tarifario 2026 (antes 300 €).'),
  ('Letras con luz blancas', 420, 'Iniciales de madera blancas con bombillas de luz cálida. Tarifario 2026 (antes 375 €).'),
  ('Candelabros de forja', 200, 'Candelabros de forja con velas led de luz cálida. Tarifario 2026 (antes 180 €).')
) as v(articulo, precio, notas)
where not exists (select 1 from inventario i where i.articulo = v.articulo);
