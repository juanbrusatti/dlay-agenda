import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { atLeast, getCurrentTenant } from "@/lib/auth/tenant";
import { getSinVer } from "@/lib/data/mensajes";
import { AvisoMensajes } from "./aviso-mensajes";
import { META_VISIBLE } from "@/lib/canal-whatsapp";
import { NavLink } from "./nav-link";

/**
 * Barra superior en píldora flotante. Los módulos se van sumando acá a medida
 * que avanzan las fases.
 *
 * El rol se lee acá adentro en lugar de recibirlo por propiedad: la consulta
 * está memorizada por render, así que no cuesta un viaje más, y evita que una
 * pantalla nueva se olvide de pasarlo y le muestre a un profesional un enlace
 * que sólo la va a llevar a un "no encontrado".
 */
export async function Barra({ tenantName }: { tenantName: string }) {
  const membership = await getCurrentTenant();
  const role = membership?.role ?? "staff";
  const veLaPlata = atLeast(role, "reception");
  const veElNegocio = atLeast(role, "admin");
  // La bandeja de Mensajes lee lo que llega por la Cloud API de Meta.
  const sinVer = membership && META_VISIBLE ? await getSinVer(membership.tenant.id) : 0;

  return (
    <header className="sticky top-3 z-20 mx-auto w-full max-w-4xl px-4">
      {/* En el teléfono y la tablet son dos renglones: arriba el negocio, la ayuda y
          salir; abajo las secciones, de borde a borde y deslizables. En una
          sola fila no entraban y el logo terminaba encima de «Inicio». */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[22px] border-[1.5px] border-line bg-surface px-3 py-2 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.25)] lg:flex-nowrap lg:rounded-pill">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2.5 lg:flex-initial"
          aria-label={`${tenantName}, ir al inicio`}
        >
          <Logo className="h-8 w-8 shrink-0" />
          <span className="truncate text-[14.5px] font-semibold">
            {tenantName}
          </span>
        </Link>

        <nav
          aria-label="Secciones"
          className="relative order-last -mx-1 flex w-full basis-full items-center gap-1 overflow-x-auto [scrollbar-width:none] lg:order-none lg:mx-0 lg:ml-auto lg:w-auto lg:shrink-0 lg:basis-auto [&::-webkit-scrollbar]:hidden"
        >
          <NavLink href="/" guia="inicio">Inicio</NavLink>
          <NavLink href="/agenda" guia="agenda">Agenda</NavLink>
          <NavLink href="/clientes" guia="clientes">Clientes</NavLink>
          {veLaPlata && <NavLink href="/caja" guia="caja">Caja</NavLink>}
          {veElNegocio && <NavLink href="/informes" guia="informes">Informes</NavLink>}
          <NavLink href="/servicios" guia="servicios">Servicios</NavLink>
          {membership && META_VISIBLE && (
            <AvisoMensajes tenantId={membership.tenant.id} sinVer={sinVer} />
          )}
          <NavLink href="/recordatorios" guia="avisos">Avisos</NavLink>
          <NavLink href="/configuracion" guia="ajustes">Ajustes</NavLink>
        </nav>

        <Link
          href="/ayuda"
          data-guia="ayuda"
          aria-label="Ayuda"
          title="Ayuda"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-[1.5px] border-line text-[14px] font-semibold text-muted hover:border-accent hover:text-ink"
        >
          ?
        </Link>

        <form action={signOut} className="shrink-0">
          <Button type="submit" variant="ghost" size="sm">
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
