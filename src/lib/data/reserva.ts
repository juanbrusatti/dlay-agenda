import "server-only";

import { urlDelLogo } from "@/lib/logo";
import { createClient } from "@/lib/supabase/server";

/**
 * La reserva online.
 *
 * Es lo único del sistema que toca alguien sin cuenta, y por eso no consulta
 * ninguna tabla: habla con tres funciones de la base que devuelven lo justo
 * para reservar. Nunca un nombre, nunca un teléfono, nunca un turno ajeno.
 */

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
  onRequest: boolean;
};

export type BookingPage = {
  tenant: { name: string; slug: string; timezone: string };
  settings: {
    showPrices: boolean;
    minAdvanceHours: number;
    maxDaysAhead: number;
    welcomeText: string | null;
    addressNote: string | null;
  };
  services: BookingService[];
};

export async function getBookingPage(slug: string): Promise<BookingPage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("booking_page", { p_slug: slug });

  if (error || !data) return null;
  return data as unknown as BookingPage;
}

export type PublicLink = { slug: string; enabled: boolean };

/** El enlace público del negocio, para compartirlo. */
export async function getPublicLink(): Promise<PublicLink | null> {
  const supabase = await createClient();

  const [{ data: tenant }, { data: settings }] = await Promise.all([
    supabase.from("tenants").select("slug").maybeSingle(),
    supabase.from("booking_settings").select("enabled").maybeSingle(),
  ]);

  if (!tenant) return null;
  return { slug: tenant.slug, enabled: settings?.enabled ?? false };
}

/**
 * The logo of the business behind a public address, for the booking page and
 * the page behind a reminder's link. Null when it has none or on any error:
 * the page then looks as it always did.
 */
export async function getLogoPublico(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("logo_negocio", { p_slug: slug });
  if (error) return null;
  return urlDelLogo(data);
}
