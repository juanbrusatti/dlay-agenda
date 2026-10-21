# WhatsApp por QR (Baileys)

La alternativa gratis a la Cloud API de Meta. El número del negocio se vincula
escaneando un QR, como WhatsApp Web, y los recordatorios salen desde ese
número como texto común.

| | Cloud API de Meta | QR (Baileys) |
|---|---|---|
| Costo por mensaje | $37,68 (utilidad) | $0 |
| Plantillas aprobadas por Meta | Sí, cada cambio de texto vuelve a revisión | No |
| Ventana de 24 horas | Sí | No |
| Botones «Confirmar / Cancelar» | Sí | No: va el enlace del turno al final del texto |
| Número | Uno nuevo, dedicado | El de siempre, sigue andando en el teléfono |
| Riesgo de bloqueo | Bajo | **Real**: WhatsApp no lo permite oficialmente |

Si un negocio tiene las dos cosas conectadas, **manda el QR**.

---

## Cómo funciona

```
 Panel (Vercel)            Servidor de WhatsApp           Supabase
 ─────────────            (whatsapp-server/, Render)      ─────────
 «Mostrar QR»  ──POST /whatsapp/link──▶  abre la conexión
                                          con WhatsApp ──▶ baileys_sessions.qr_code
 la tarjeta mira  ◀──────────────── baileys_sessions_view (cada 3 s)
 (escaneo)                                connection open ─▶ status = connected
                                          llaves ─────────▶ baileys_auth

 Emisor (Edge Function) ──POST /whatsapp/send──▶ manda el texto
```

- **El panel nunca escribe el estado.** Pide «vinculá» o «desvinculá» y mira
  la vista. Lo escribe todo el servidor, con `service_role`.
- **Las llaves viven en Supabase** (`baileys_auth`), no en disco. El servidor es
  descartable: se puede borrar y levantar en otro hosting sin que nadie vuelva
  a escanear. Esto es lo que hace posible usar un hosting gratis, que borra el
  disco en cada reinicio.
- Al arrancar, el servidor vuelve a conectar solo todo lo que estaba conectado.
  Si se corta, reintenta con espera creciente (2 s → 1 min).
- Los pedidos al servidor llevan el encabezado `x-dlay-secret`. Sin él, 401.

### Archivos

| Qué | Dónde |
|---|---|
| Servidor de WhatsApp | `whatsapp-server/` (proyecto aparte, con su `package.json`) |
| Tablas, vista y función del panel de Dlay | `supabase/migrations/20261021100000_baileys_sessions.sql` |
| Envío de recordatorios por QR | `supabase/functions/_shared/channels.ts` (`sendWhatsAppQr`) |
| Acciones del panel | `src/lib/actions/baileys.ts` |
| Tarjeta del QR | `src/app/(app)/configuracion/whatsapp/baileys.tsx` |
| Estado de todos los negocios (sólo Dlay) | `/plataforma/whatsapp` |
| Pruebas de permisos | `tests/rls/baileys.test.ts` |

### Seguridad

- `baileys_auth` tiene lo que permite mandar mensajes en nombre del negocio.
  **Nadie la lee salvo el servidor**: sin políticas ni permisos para
  `authenticated` ni `anon`. Hay una prueba que lo vigila.
- `baileys_sessions` tampoco tiene permisos directos. El panel lee
  `baileys_sessions_view`, que muestra el QR sólo a titular y administración.
- `/plataforma/whatsapp` da 404 a quien no está en `platform_admins`.

---

## Ponerlo en marcha (todo gratis)

### 1. Un secreto

Una palabra larga al azar que comparten el panel, el emisor y el servidor:

```bash
openssl rand -hex 32
```

### 2. La migración

```bash
npx supabase db push
```

### 3. El servidor, en Render (plan Free)

Render no pide tarjeta y da 750 horas por mes: justo un servicio prendido todo
el mes. Su plan gratis se duerme a los 15 minutos sin tráfico, y dormido corta
WhatsApp; por eso el servidor **se despierta solo** con un pedido a `/health`
cada diez minutos (usa la variable `RENDER_EXTERNAL_URL`, que Render pone sola).

1. render.com → **New → Web Service** → conectar el repo de GitHub.
2. **Root Directory:** `whatsapp-server`. **Runtime:** Docker. **Plan:** Free.
3. Variables de entorno:
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API)
   - `BAILEYS_SECRET` (el del paso 1)
4. **Health Check Path:** `/health`.
5. Cuando termine, copiar la URL (`https://algo.onrender.com`).

Alternativas, también gratis:

- **Northflank** (Developer Sandbox): dos servicios que no se duermen nunca.
  Pide tarjeta para verificar la cuenta, sin cobrar. Mismo Dockerfile; ahí
  conviene no poner `KEEPALIVE_URL`.
- **Oracle Cloud Always Free**: una máquina virtual propia, la que más
  recursos da, pero hay que instalar Node y dejarlo como servicio. También pide
  tarjeta.

**Una sola copia del servidor a la vez.** Dos copias con la misma sesión se
pisan y WhatsApp corta las dos (el panel lo muestra como «La sesión se abrió en
otro servidor»).

### 4. El panel (Vercel)

En Vercel → Settings → Environment Variables:

```
BAILEYS_SERVER_URL=https://algo.onrender.com
BAILEYS_SECRET=<el del paso 1>
```

Y volver a desplegar.

### 5. El emisor (Supabase)

```bash
npx supabase secrets set BAILEYS_SERVER_URL=https://algo.onrender.com BAILEYS_SECRET=<el del paso 1>
```

```bash
npx supabase functions deploy dispatch
```

### 6. Vincular

Ajustes → WhatsApp → **Mostrar el código QR** → escanear desde WhatsApp en el
teléfono del negocio (Ajustes → Dispositivos vinculados → Vincular un
dispositivo). En unos segundos la tarjeta pasa a «WhatsApp conectado con QR».

Con el **modo de prueba** encendido (lo está en todo negocio nuevo) el emisor
hace el recorrido completo pero no manda nada: así se puede mirar qué saldría
antes de que le llegue a alguien.

---

## En local

```bash
cd whatsapp-server && npm install && cp .env.example .env
```

En `.env`: `SUPABASE_URL=http://127.0.0.1:54321`, la `SERVICE_ROLE_KEY` que
muestra `npx supabase status` y cualquier secreto de 16+ caracteres. Después:

```bash
cd whatsapp-server && npm run dev
```

Y en `.env.local` del panel: `BAILEYS_SERVER_URL=http://localhost:8787` (o el
`PORT` que hayas puesto) y el mismo `BAILEYS_SECRET`.

---

## Qué tener en cuenta

- **El teléfono tiene que conectarse a internet al menos cada 14 días**, o
  WhatsApp desvincula el dispositivo. Pasa lo mismo con WhatsApp Web.
- **Si alguien desvincula desde el teléfono**, el servidor lo detecta, borra
  las llaves y el panel pide escanear de nuevo. Eso no se puede hacer desde
  Dlay: tiene que hacerlo alguien del negocio con el teléfono en la mano.
- **Los mensajes salen despacio a propósito**: el emisor ya manda de a uno con
  1,5 a 4 s de pausa, y el servidor agrega 1 a 3 s de «escribiendo…» antes de
  cada uno.
- **Un número sin WhatsApp** falla de una (no se reintenta) con «Ese número no
  tiene WhatsApp». El 9 de los celulares argentinos lo resuelve WhatsApp
  cuando se le pregunta por el número.
- **El costo del mensaje queda en $0** en la bitácora, así no gasta del tope del
  mes. El tope sí se mira antes de enviar con el precio de Meta: si un negocio
  con QR tiene un tope muy bajo, podría frenar mensajes que en realidad no
  cuestan.
- Las respuestas que el cliente escriba llegan al teléfono del negocio como
  siempre; el sistema no las lee. Confirmar o cancelar se hace por el enlace.

---

## Si algo no anda

| Qué se ve | Qué mirar |
|---|---|
| «El servidor de WhatsApp todavía no está configurado» | Faltan `BAILEYS_SERVER_URL` o `BAILEYS_SECRET` en Vercel |
| «No pudimos hablar con el servidor de WhatsApp» | Que el servicio de Render esté prendido; abrir `https://…/health` |
| El QR no aparece nunca | Logs del servicio en Render; que `SUPABASE_SERVICE_ROLE_KEY` sea la del proyecto correcto |
| «Nadie escaneó el código a tiempo» | Normal: vence a los ~2 minutos. Generar otro |
| Los recordatorios siguen saliendo por Meta | Faltan los `supabase secrets` del paso 5, o no se volvió a desplegar `dispatch` |
| Error 401 en los logs del emisor | El `BAILEYS_SECRET` no es el mismo en los tres lugares |
