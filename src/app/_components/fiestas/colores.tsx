/**
 * The «fiestas» colors: the accent turns Christmas green while the look is on.
 *
 * Green and not red on purpose: red already means «careful» in the app
 * (cancel, delete), and a red «Agendar turno» next to a red «Cancelar turno»
 * would make people stop and think. Red stays for the decorations.
 *
 * Only the accent tokens change, for light and dark, with the same selectors
 * as globals.css plus `html` so these win without touching that file.
 */
const CSS = `
html:root {
  --accent: #157347;
  --accent-text: #116a40;
  --accent-wash: #e2f2e8;
  --nieve: #b9c7d6;
  --fiesta-rojo: #c8323c;
}
@media (prefers-color-scheme: dark) {
  html:root:not([data-theme="light"]) {
    --accent: #1f8a55;
    --accent-text: #74d3a0;
    --accent-wash: #10291c;
    --nieve: #e8eef5;
    --fiesta-rojo: #f0737b;
  }
}
html:root[data-theme="dark"] {
  --accent: #1f8a55;
  --accent-text: #74d3a0;
  --accent-wash: #10291c;
  --nieve: #e8eef5;
  --fiesta-rojo: #f0737b;
}
`;

export function ColoresFiestas() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
