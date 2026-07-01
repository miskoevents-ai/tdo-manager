# Entrada automática de leads (WhatsApp / Outlook)

TDO Manager expone un **webhook** que crea automáticamente un cliente + una
oportunidad en estado **"nueva"** a partir de un lead entrante.

## Endpoint

```
POST https://tdo-manager.vercel.app/api/leads/inbound
Cabecera:  x-leads-token: <TOKEN>   (o ?token=<TOKEN> en la URL)
Body (JSON):
{
  "nombre":       "María López",        // al menos uno de nombre / email / telefono
  "email":        "maria@correo.com",
  "telefono":     "600123123",
  "mensaje":      "Hola, quiero decorar una boda en junio",
  "canal":        "whatsapp",           // whatsapp | email | instagram | ...
  "titulo":       "Boda junio",         // opcional
  "tipo_evento":  "boda",               // opcional (boda, comunion, corporativo…)
  "serie":        "evento",             // evento | alquiler_encargo
  "fecha_evento": "2026-06-20",         // opcional
  "tipo_cliente": "particular"          // opcional
}
```

Respuesta: `{ "ok": true, "clienteId": "…", "oportunidadId": "…", "numero": "L-…" }`

- Si el email o teléfono ya existe, **reutiliza el cliente** en vez de duplicarlo.
- El `canal` se normaliza (whatsapp / email); si no se reconoce, queda "otro".

## Token

Define la variable de entorno **`LEADS_TOKEN`** en Vercel (Project Settings →
Environment Variables) con un valor secreto y úsalo en la cabecera. Si no se
define, por defecto es `tdo-leads-2026` (cámbialo en producción).

## Cómo conectar WhatsApp y Outlook

La forma más rápida, sin programar, es con un conector no-code que escuche tu
bandeja y llame a este webhook:

### Outlook / Email (Microsoft 365)
1. En **Make.com** (o Zapier / Power Automate) crea un escenario con el
   disparador *"Outlook → Nuevo correo"* (o Gmail si usas Google).
2. Añade un módulo *HTTP → Hacer una petición*:
   - URL: `https://tdo-manager.vercel.app/api/leads/inbound?token=TU_TOKEN`
   - Método: `POST`, cuerpo JSON con `nombre`, `email`, `mensaje`, `canal: "email"`.
3. Mapea el remitente y el asunto/cuerpo del correo a los campos.

### WhatsApp
- Si usas **WhatsApp Business** con un proveedor (360dialog, Twilio, Make
  WhatsApp), configura su disparador de "mensaje entrante" y el mismo módulo
  HTTP hacia el webhook con `canal: "whatsapp"`.
- Alternativa nativa (más setup): WhatsApp Business Cloud API de Meta, apuntando
  su webhook a un endpoint que reenvíe a `/api/leads/inbound`.

> Nota: las integraciones nativas de Meta/Microsoft requieren tus cuentas y
> credenciales. El conector no-code (Make/Zapier) es lo más rápido para empezar.
