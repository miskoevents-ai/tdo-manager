-- Transcripción / acta de la reunión: se pega el texto que genera Granola (u
-- otra herramienta) al transcribir la llamada, y queda guardado en la
-- oportunidad para consultarlo después.
alter table reuniones
  add column if not exists transcripcion text;
