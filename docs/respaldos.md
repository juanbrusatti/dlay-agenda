# Respaldos de la base

El plan gratis de Supabase no guarda copias que se puedan bajar. Las saca una
GitHub Action (`.github/workflows/respaldo.yml`) todas las noches a las 04:00 de
Argentina.

## Qué se guarda

- `datos.sql`: todos los datos de `public` (negocios, clientes, turnos, caja,
  mensajes, sesiones de WhatsApp…) y las cuentas de `auth` (usuarios e
  identidades). No van las sesiones abiertas ni los registros de auth.
- `estructura.sql`: la estructura de `public` y `app`, por las dudas. La
  fuente de verdad de la estructura son las migraciones.

Va todo en un archivo `dlay-AAAA-MM-DD-HHMM.tar.gz.gpg`, cifrado con AES-256. Se
guarda 30 días en GitHub → Actions → la ejecución del día → Artifacts.

**Tiene datos personales de los clientes de cada negocio.** No lo descifres en
una compu compartida y borrá la copia descifrada cuando termines.

## Secretos (GitHub → Settings → Secrets and variables → Actions)

| Nombre | Qué es |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Connect → **Session pooler**, con la contraseña de la base puesta. |
| `RESPALDO_CLAVE` | Una clave larga para cifrar. Guardala también en tu gestor de contraseñas: **sin ella el respaldo no se puede abrir.** |

## Si falla

GitHub manda un mail cuando una ejecución programada falla. También falla a
propósito si el respaldo sale sin negocios o sin usuarios.

GitHub apaga las Actions programadas de un repositorio que pasa 60 días sin
cambios. Si eso pasa, te avisa por mail; se vuelven a prender desde la pestaña
Actions.

## Cómo se restaura

1. Bajá el artifact del día que quieras y descomprimí el `.zip` que da GitHub.
2. Descifralo (te pide la clave):

   ```bash
   mkdir respaldo
   gpg -d dlay-AAAA-MM-DD-HHMM.tar.gz.gpg | tar -xzf - -C respaldo
   ```

3. En un proyecto nuevo de Supabase, creá la estructura con las migraciones:

   ```bash
   npx supabase link --project-ref <ref-del-proyecto-nuevo>
   npx supabase db push
   ```

4. Cargá los datos. `session_replication_role = replica` apaga los triggers
   mientras se cargan, así no se disparan avisos ni recordatorios por turnos
   viejos:

   ```bash
   psql "<Session pooler del proyecto nuevo>" --single-transaction -v ON_ERROR_STOP=1 \
     -c "SET session_replication_role = replica" -f respaldo/datos.sql
   ```

5. Lo que no está en la base hay que volver a cargarlo como la primera vez
   (`docs/despliegue.md`): las Edge Functions y sus secretos, el cron del
   emisor y las variables de Vercel y Render apuntando al proyecto nuevo.

Las sesiones de WhatsApp van en el respaldo, así que si se restaura rápido los
negocios no tendrían que volver a escanear. Si pasaron días, WhatsApp
probablemente las haya cerrado y el panel les va a pedir el QR.
