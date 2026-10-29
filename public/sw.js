/**
 * Service worker de Dlay.
 *
 * Deliberadamente conservador. La regla que no se rompe: NUNCA se guarda en
 * caché una respuesta de la API ni nada que venga con sesión. Una agenda vieja
 * mostrada como si fuera la de hoy es peor que una pantalla sin conexión.
 *
 * Lo único que se cachea son los archivos estáticos de la propia aplicación.
 */

// Al subirla se borra la caché vieja de todos los teléfonos.
const VERSION = "v4";
const SHELL = `dlay-shell-${VERSION}`;
const OFFLINE_URL = "/sin-conexion";

// Los íconos no: cambian con la marca y, guardados acá, los teléfonos seguían
// mostrando los viejos. Se piden a la red como cualquier imagen.
const PRECACHE = [OFFLINE_URL];
const ICONO = "/marca/v2/icon-192.png";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Notificaciones push.
 *
 * Es el único canal gratis del sistema. El cuerpo viene cifrado del servidor y
 * el navegador lo entrega ya descifrado.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Dlay";
  const options = {
    body: data.body || "",
    icon: ICONO,
    badge: ICONO,
    // Con el mismo tag, un aviso nuevo del mismo turno reemplaza al anterior
    // en lugar de apilarse.
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
    lang: "es-AR",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Al tocarla, se reutiliza la ventana abierta si la hay. Abrir una segunda
 * pestaña de la misma aplicación es molesto y desorienta.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((abiertas) => {
        for (const cliente of abiertas) {
          if (cliente.url.includes(destino) && "focus" in cliente) {
            return cliente.focus();
          }
        }
        const alguna = abiertas[0];
        if (alguna && "navigate" in alguna) {
          return alguna.navigate(destino).then((c) => c && c.focus());
        }
        return self.clients.openWindow(destino);
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: siempre a la red. Si no hay conexión, pantalla de cortesía.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL);
        return (
          (await cache.match(OFFLINE_URL)) ??
          new Response("Sin conexión", { status: 503 })
        );
      }),
    );
    return;
  }

  // Estáticos del build: inmutables, se sirven de caché sin preguntar.
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
  }

  // Todo lo demás (incluida cualquier llamada a Supabase) va directo a la red.
});
