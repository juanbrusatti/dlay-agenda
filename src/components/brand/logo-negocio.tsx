/**
 * The business's own logo on its public pages: a small rounded tile with the
 * image whole inside (never cropped), on white so a transparent logo reads on
 * any theme. Fixed size, so a heavy or odd-shaped image can never push the
 * content down or sideways.
 */
export function LogoNegocio({
  url,
  nombre,
  lado = 48,
}: {
  url: string;
  nombre: string;
  /** Side in pixels. */
  lado?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white"
      style={{ width: lado, height: lado }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny image already sized when uploaded */}
      <img
        src={url}
        alt={`Logo de ${nombre}`}
        width={lado}
        height={lado}
        decoding="async"
        className="h-full w-full object-contain p-1"
      />
    </span>
  );
}
