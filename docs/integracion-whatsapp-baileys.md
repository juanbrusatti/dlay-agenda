# Integración de WhatsApp con Baileys (Modo Dispositivo Vinculado)

Este documento explica paso a paso cómo implementar y usar la integración de WhatsApp usando Baileys.

## Índice

1. [Qué es Baileys](#qué-es-baileys)
2. [Ventajas y desventajas](#ventajas-y-desventajas)
3. [Arquitectura del sistema](#arquitectura-del-sistema)
4. [Lo que ya está implementado](#lo-que-ya-está-implementado)
5. [Configuración necesaria](#configuración-necesaria)
6. [Pasos para ponerlo en marcha](#pasos-para-ponerlo-en-marcha)
7. [Uso del sistema](#uso-del-sistema)
8. [Panel de administración](#panel-de-administración)
9. [Consideraciones de seguridad](#consideraciones-de-seguridad)
10. [Troubleshooting](#troubleshooting)

---

## Qué es Baileys

Baileys es una librería de TypeScript/JavaScript que imita el funcionamiento de WhatsApp Web. Permite:

- Conectar un número de WhatsApp como "dispositivo vinculado"
- Que el número siga funcionando normalmente en el celular



---

## Ventajas y desventajas

### Ventajas

- **Sin ventana de 24 horas:** Podés enviar mensajes en cualquier momento, no solo cuando el cliente te escribió primero
- **El número sigue funcionando en el celular:** Los mensajes también aparecen en tu teléfono
- **Funciona como WhatsApp Web:** Es el mismo proceso de escanear un QR

### Desventajas

- **Riesgo de bloqueo:** Si WhatsApp detecta comportamiento automatizado, podría bloquear el número
- **Gestión de sesiones:** Las sesiones pueden desconectarse y necesitan reconexión periódica

---

## Arquitectura del sistema

El sistema tiene los siguientes componentes:

### 1. Base de datos (Supabase)

Guarda las sesiones de Baileys para que el servidor sea descartable:

- **Tabla `baileys_sessions`:** Almacena el estado de cada sesión, el QR code, y los datos de conexión
- **Vista `baileys_sessions_view`:** Vista segura sin datos sensibles para el panel
- **Función `get_baileys_session()`:** Función de Postgres para obtener la sesión activa del negocio

### 2. API del panel (Next.js)

Endpoints que el panel usa para comunicarse con el servidor Baileys:

- `POST /api/whatsapp/link-company-whatsapp` - Inicia la vinculación y genera el QR
- `POST /api/whatsapp/unlink-session` - Desvincula una sesión
- `POST /api/whatsapp/send-message` - Envía un mensaje a través de Baileys
- `GET /api/whatsapp/session-status` - Consulta el estado de la sesión (para polling)
- `POST /api/whatsapp/relink-session` - Fuerza la reconexión de una sesión

### 3. Servidor Baileys externo

Un servidor separado que corre Baileys y maneja las conexiones reales con WhatsApp:

- **URL:** `https://wsp-baileys.fly.dev` (o la que configures)
- **Endpoints que debe implementar:**
  - `POST /whatsapp/link` - Inicia una nueva sesión y devuelve el QR
  - `POST /whatsapp/unlink` - Cierra una sesión
  - `POST /whatsapp/send` - Envía un mensaje
  - `POST /whatsapp/relink` - Reconecta una sesión existente

### 4. Panel de configuración

Pantalla en `/configuracion/whatsapp` con el componente `BaileysLink`:

- Muestra el QR code para escanear
- Hace polling para verificar si fue escaneado
- Muestra el estado de conexión
- Permite desvincular

### 5. Panel de administración (Super)

Pantalla en `/super/whatsapp-relink` para gestión interna:

- Lista todas las empresas con WhatsApp vinculado
- Permite reconectar todas las sesiones automáticamente
- Implementa pausas aleatorias para evitar detección:
  - 30-60 segundos entre empresas
  - 5 minutos cada 10 envíos

---

## Lo que ya está implementado

Todo el código del panel ya está listo:

### Migración de base de datos

**Archivo:** `supabase/migrations/20261021100000_baileys_sessions.sql`

Crea la tabla `baileys_sessions` con:
- Campos para guardar el estado, QR, y datos de sesión
- Políticas RLS para seguridad
- Vista sin datos sensibles
- Función auxiliar para obtener la sesión activa

### Variables de entorno

**Archivo:** `src/lib/env.ts`

Agregada la variable `BAILEYS_SERVER_URL` para configurar la URL del servidor Baileys.

**Archivo:** `.env.example`

Agregada la documentación de la variable `BAILEYS_SERVER_URL`.

### Endpoints API

**Archivos creados:**

1. `src/app/api/whatsapp/link-company-whatsapp/route.ts` - Inicia vinculación
2. `src/app/api/whatsapp/unlink-session/route.ts` - Desvincula sesión
3. `src/app/api/whatsapp/send-message/route.ts` - Envía mensajes
4. `src/app/api/whatsapp/session-status/route.ts` - Consulta estado
5. `src/app/api/whatsapp/relink-session/route.ts` - Reconecta sesión

### Acciones de servidor

**Archivo:** `src/lib/actions/baileys.ts`

Funciones server actions para usar desde el panel:
- `vincularBaileys()` - Inicia la vinculación
- `desvincularBaileys()` - Desvincula la sesión
- `getBaileysSessionState()` - Obtiene el estado actual

### Componentes de UI

**Archivos creados:**

1. `src/app/(app)/configuracion/whatsapp/baileys.tsx` - Componente para vincular/desvincular
2. `src/app/super/whatsapp-relink/page.tsx` - Panel de administración
3. `src/app/super/whatsapp-relink/relink-list.tsx` - Lista de sesiones con reconexión

---

## Configuración necesaria

### 1. Aplicar la migración de base de datos

```bash
# Si usás Supabase local
npm run db:reset

# O aplicá solo la migración nueva
supabase db push
```

### 2. Configurar la variable de entorno

En tu archivo `.env.local` (o en las variables de entorno de tu hosting):

```bash
BAILEYS_SERVER_URL=https://wsp-baileys.fly.dev
```

Reemplazá la URL con la de tu servidor Baileys real.

### 3. (Opcional) Crear el servidor Baileys

Si aún no tenés un servidor Baileys, necesitás crear uno. Ver la sección [Servidor Baileys](#servidor-baileys) más abajo.

---

## Pasos para ponerlo en marcha

### Paso 1: Verificar que la migración se aplicó

```bash
# Entrá a Supabase y verificá que la tabla existe
supabase db diff --use-migra
```

O entrá al panel de Supabase → Table Editor y verificá que existe la tabla `baileys_sessions`.

### Paso 2: Configurar la variable de entorno

Agregá `BAILEYS_SERVER_URL` a tu `.env.local`:

```bash
BAILEYS_SERVER_URL=https://tu-servidor-baileys.com
```

### Paso 3: Iniciar el servidor de desarrollo

```bash
npm run dev
```

### Paso 4: Probar la vinculación

1. Entrá a `http://localhost:3000/configuracion/whatsapp`
2. Buscá la sección "Vincular WhatsApp (modo dispositivo vinculado)"
3. Hacé clic en "Vincular WhatsApp"
4. Debería aparecer un QR code
5. Escanealo con WhatsApp (Ajustes → Dispositivos vinculados → Vincular un dispositivo)
6. Esperá unos segundos y debería cambiar a "WhatsApp conectado"

### Paso 5: Probar el envío de mensajes

Una vez conectado, podés probar enviar un mensaje usando el endpoint:

```bash
curl -X POST http://localhost:3000/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{"to":"5493584123456","message":"Hola desde Baileys"}'
```

---

## Uso del sistema

### Vincular un número

1. Entrá a `/configuracion/whatsapp`
2. En la sección "Vincular WhatsApp (modo dispositivo vinculado)", hacé clic en "Vincular WhatsApp"
3. Escaneá el QR con WhatsApp
4. Esperá a que el estado cambie a "conectado"

### Desvincular un número

1. Entrá a `/configuracion/whatsapp`
2. En la tarjeta de "WhatsApp conectado", hacé clic en "Desconectar"
3. Confirmá la acción

### Ver el estado de la sesión

El componente hace polling automático cada 3 segundos para verificar el estado. No necesitás hacer nada manual.

---

## Panel de administración

El panel `/super/whatsapp-relink` está diseñado para uso interno:

### Funcionalidades

1. **Ver todas las sesiones:** Lista todas las empresas con WhatsApp vinculado
2. **Estadísticas:** Muestra cuántas están conectadas, conectando, o con error
3. **Reconectar todas:** Fuerza la reconexión de todas las sesiones con pausas aleatorias

### Pausas aleatorias

Para evitar que WhatsApp detecte el envío automático, el sistema implementa:

- **Pausa entre empresas:** 30 a 60 segundos aleatorios entre cada reconexión
- **Pausa cada 10 envíos:** 5 minutos de pausa después de cada 10 reconexiones

Este patrón simula comportamiento humano y reduce el riesgo de bloqueo.

---

## Servidor Baileys

**Esto es lo que tenés que implementar vos.** El código del panel ya está listo, pero necesitás un servidor separado que corra Baileys.

### Requisitos del servidor

El servidor debe implementar los siguientes endpoints:

#### POST /whatsapp/link

Inicia una nueva sesión de Baileys y devuelve el QR code.

**Request:**
```json
{
  "sessionId": "tenant-123-timestamp",
  "tenantId": "uuid-del-negocio"
}
```

**Response:**
```json
{
  "ok": true,
  "sessionId": "tenant-123-timestamp",
  "qr": "base64-encoded-qr-code"
}
```

#### POST /whatsapp/unlink

Cierra una sesión de Baileys.

**Request:**
```json
{
  "sessionId": "tenant-123-timestamp"
}
```

**Response:**
```json
{
  "ok": true
}
```

#### POST /whatsapp/send

Envía un mensaje a través de Baileys.

**Request:**
```json
{
  "sessionId": "tenant-123-timestamp",
  "to": "5493584123456",
  "message": "Hola desde Baileys"
}
```

**Response:**
```json
{
  "ok": true,
  "messageId": "message-id-from-whatsapp"
}
```

#### POST /whatsapp/relink

Reconecta una sesión existente.

**Request:**
```json
{
  "sessionId": "tenant-123-timestamp"
}
```

**Response:**
```json
{
  "ok": true,
  "qr": "base64-encoded-qr-code" // opcional, si necesita nuevo QR
}
```

### Implementación sugerida

Podés usar este repositorio como base: https://github.com/WhiskeySockets/Baileys

Ejemplo básico de estructura:

```typescript
import makeWASocket from '@whiskeysockets/baileys';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';

const sessions = new Map();

app.post('/whatsapp/link', async (req, res) => {
  const { sessionId, tenantId } = req.body;

  const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  socket.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;

    if (qr) {
      // Enviar el QR al panel
      const qrBuffer = await QRCode.toBuffer(qr);
      const qrBase64 = qrBuffer.toString('base64');
      // Acá deberías guardar en Supabase
      res.json({ ok: true, sessionId, qr: qrBase64 });
    }

    if (connection === 'open') {
      // Sesión conectada
      // Actualizar en Supabase
    }
  });

  sessions.set(sessionId, socket);
});
```

### Hosting del servidor

Podés usar hosting gratuito como:

- **Fly.io:** https://fly.io
- **Northflank:** https://northflank.com
- **Render:** https://render.com
- **Railway:** https://railway.app

**Importante:** Las sesiones se guardan en Supabase, por lo que el servidor es descartable. Si el servidor se cae, podés levantarlo en otro lugar y las sesiones se recuperan desde Supabase.

---

## Consideraciones de seguridad

### 1. Datos sensibles

Los datos de la sesión de Baileys (auth state, keys, etc) se guardan en la columna `session_data` de la tabla `baileys_sessions`. Esta columna:

- **NO está incluida en la vista `baileys_sessions_view`**
- **NO tiene permisos de lectura para usuarios autenticados**
- Sólo el servidor Baileys debería leerla (usando service role key)

### 2. Permisos

Las políticas RLS de la tabla `baileys_sessions` aseguran que:

- Sólo titulares y admins pueden ver sus propias sesiones
- Sólo titulares y admins pueden crear, actualizar o borrar sesiones
- Cada negocio sólo puede acceder a sus propias sesiones

### 3. Servidor Baileys

El servidor Baileys debe:

- Usar HTTPS obligatoriamente
- Validar que las requests vienen de tu panel (puedes usar un header secreto)
- No exponer los datos de sesión a terceros
- Implementar rate limiting para evitar abuso

---

## Troubleshooting

### El QR no aparece

**Problema:** Hacés clic en "Vincular WhatsApp" pero no aparece el QR.

**Soluciones:**
1. Verificá que `BAILEYS_SERVER_URL` esté configurado correctamente
2. Verificá que el servidor Baileys esté corriendo
3. Revisá los logs del servidor Baileys
4. Verificá que el endpoint `/whatsapp/link` esté funcionando

### El QR aparece pero no se conecta

**Problema:** Escaneás el QR pero el estado nunca cambia a "conectado".

**Soluciones:**
1. Verificá que escaneaste desde la app de WhatsApp (no desde WhatsApp Web)
2. Revisá los logs del servidor Baileys para ver si hay errores
3. Verificá que el servidor Baileys esté guardando el estado en Supabase
4. Probá reconectar la sesión desde el panel `/super/whatsapp-relink`

### Error al enviar mensaje

**Problema:** Intentás enviar un mensaje pero falla.

**Soluciones:**
1. Verificá que la sesión esté en estado "connected"
2. Verificá que el número de destino esté en formato internacional (ej: 5493584123456)
3. Revisá los logs del servidor Baileys
4. Verificá que el servidor Baileys tenga la sesión cargada

### La sesión se desconecta sola

**Problema:** La sesión estaba conectada pero pasa a "disconnected" o "error".

**Soluciones:**
1. Las sesiones de Baileys pueden desconectarse si WhatsApp detecta actividad sospechosa
2. Usá el panel `/super/whatsapp-relink` para reconectar automáticamente
3. Verificá que no estés enviando demasiados mensajes muy rápido
4. Considerá aumentar las pausas entre envíos

### Error de permisos en Supabase

**Problema:** Error al acceder a la tabla `baileys_sessions`.

**Soluciones:**
1. Verificá que la migración se aplicó correctamente
2. Verificá que las políticas RLS estén activas
3. Revisá los logs de Supabase para ver el error exacto
4. Ejecutá `supabase db reset` para recrear la base de datos

---

## Próximos pasos

Una vez que tengas el servidor Baileys funcionando:

1. **Integrar con recordatorios:** Modificá el sistema de recordatorios para usar Baileys en lugar de la API de Meta
2. **Agregar webhooks:** Implementa webhooks en el servidor Baileys para recibir mensajes de WhatsApp
3. **Mensajes entrantes:** Crea un sistema para procesar y mostrar los mensajes que reciben los números
4. **Monitoreo:** Agrega métricas y alertas para saber cuando una sesión se desconecta

---

## Soporte

Si tenés problemas:

1. Revisá la sección [Troubleshooting](#troubleshooting)
2. Revisá los logs del servidor Baileys
3. Revisá los logs de Supabase
4. Verificá la documentación de Baileys: https://github.com/WhiskeySockets/Baileys
