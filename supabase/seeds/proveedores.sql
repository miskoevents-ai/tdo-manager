-- Seed de proveedores de Tu Decoración Original (a partir de "Relación de proveedores").
-- Seguro de re-ejecutar: solo inserta los que aún no existan (por nombre).
-- Ejecútalo en Supabase → SQL Editor → Run.

insert into proveedores (nombre, tipo_servicio, contacto, email, telefono, localidad, notas)
select v.nombre, v.tipo_servicio, v.contacto, v.email, v.telefono, v.localidad, v.notas
from (values
  -- Flores
  ('Verdnatura', 'floristeria', NULL, NULL, '621 19 69 60', NULL,
   'Flor natural, preservada y articulos de montaje y decoracion floral. Tiene app (WhatsApp). Hay que darse de alta como nuevo cliente de facturacion.'),
  ('Coflores', 'floristeria', 'Fernando (comercial)', NULL, '627 71 92 76', 'Coslada',
   'Compra por web y fisicamente, app de facil manejo. Sobre todo para imprevistos. Alta como nuevo cliente de facturacion.'),
  ('ASV Natur', 'floristeria', 'Fernando (comercial)', NULL, '91 388 47 07', 'Coslada',
   'Flor y articulos de decoracion. Web y fisicamente, app de facil manejo. Sobre todo para imprevistos. Alta como nuevo cliente de facturacion. Tel comercial 627 71 92 76.'),
  ('Astro Flor', 'floristeria', NULL, NULL, '91 386 46 50', 'Moncloa-Aravaca',
   'Flor, para imprevistos. Suele ser mas caro. Llamar por telefono para consultar existencias; se puede ir fisicamente. Alta como nuevo cliente de facturacion.'),
  ('Ana (florista)', 'floristeria', 'Ana', NULL, '607 348 201', NULL, 'Florista.'),
  ('Chave (florista)', 'floristeria', 'Chave', NULL, '619 107 354', NULL, 'Florista.'),
  -- Otros servicios
  ('Easy Media S.L', 'otros', 'Nacho', NULL, '673 20 37 81', NULL,
   'Mantenimiento web (easy-media.es). Otro contacto: Nacho 661 64 52 16.'),
  ('Work Out', 'alquiler_subcontrata', 'Fabiola (comercial)', NULL, '650 517 181', NULL,
   'Montajes y logistica. Apoyo en eventos corporativos (contratado ocasionalmente desde septiembre 2025).'),
  ('Lumennet', 'imprenta', 'David (comercial)', NULL, '696 962 531', NULL,
   'Impresiones digitales (lumennet.es).'),
  ('Maderas Villalba', 'otros', 'Celia', NULL, '91 851 83 14', NULL,
   'Proveedor de madera; entregan tambien a domicilio.'),
  ('Neoluz', 'iluminacion_av', 'Gloria', NULL, '669 41 63 67', NULL,
   'Iluminacion, incluidas letras con bombillas.'),
  ('Unomas', 'imprenta', 'Conchi', NULL, '91 815 18 69', 'Villanueva del Pardillo',
   'Serigrafia e impresion: uniformes, pegatinas, logo. Otro tel 633 93 35 46.'),
  ('Carpintero Fausto', 'otros', 'Fausto', NULL, '622 66 61 42', NULL, 'Carpintero.'),
  -- Mobiliario y piezas en alquiler
  ('Eventoh', 'mobiliario', 'Patricio', 'patricio@eventoh.es', '622 22 33 31', NULL,
   'Alquiler de mobiliario: manteles, sillas y mesas plegables, un poco de todo (www.eventoh.es).'),
  ('Madrid Props', 'mobiliario', 'Carmen', NULL, '676 74 02 95', NULL,
   'Articulos y mobiliario retro, estilo art deco.'),
  ('Crimons', 'mobiliario', 'Gloria', NULL, '91 655 58 57', NULL,
   'Gran variedad de mobiliario de estilo mas actual.'),
  ('Alkila', 'catering', 'Javier', 'administracion@alkila.me', '91 921 85 91', NULL,
   'Variedad de elementos para catering.'),
  ('Mersena', 'mobiliario', NULL, NULL, '91 710 44 36', NULL,
   'Mercado de segunda mano; tambien alquilan para eventos. Otro tel 627 546 406.'),
  ('Hermanos Roldan', 'mobiliario', NULL, NULL, '91 884 46 78', NULL,
   'Moquetas para eventos.')
) as v(nombre, tipo_servicio, contacto, email, telefono, localidad, notas)
where not exists (
  select 1 from proveedores p where p.nombre = v.nombre
);
