/**
 * Icono del módulo creativo: un cerebro con un pulso de color muy sutil.
 *
 * SVG inline con animación CSS, no un GIF. Un GIF real habría que generarlo,
 * alojarlo y mantenerlo — pesa más, no se puede recolorear por CSS, y en
 * pantallas de alta densidad se ve borroso. El SVG pesa nada y la animación
 * (`hue-rotate` + saturación, en `.radar-brain` de globals.css) vive en un
 * solo sitio.
 *
 * El color es fijo (el azul validado del sistema, #2a78d6) y no `currentColor`
 * a propósito: `hue-rotate` no tiene ningún tono que rotar sobre blanco o
 * negro puro, así que dentro de un botón de fondo oscuro con texto blanco el
 * pulso sería invisible justo donde más se ve el icono.
 *
 * El pulso rota el tono unos 18° y sube la saturación — perceptible sin ser
 * un semáforo parpadeante. Respeta `prefers-reduced-motion`.
 */
export function IconoRadar({ size = 20, color = "#2a78d6" }: { size?: number; color?: string }) {
  return (
    <svg
      className="radar-brain"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 3.5c-2.2 0-3.8 1.6-3.8 3.5 0 .5.1 1 .3 1.4C4.4 9 3.5 10.3 3.5 12c0 1.5.7 2.7 1.8 3.5-.2.4-.3.9-.3 1.4 0 2 1.6 3.6 3.6 3.6.6 0 1.2-.2 1.7-.4.5.6 1.3 1 2.2 1"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 21c.9 0 1.7-.4 2.2-1 .5.2 1.1.4 1.7.4 2 0 3.6-1.6 3.6-3.6 0-.5-.1-1-.3-1.4 1.1-.8 1.8-2 1.8-3.5 0-1.7-.9-3-2-3.6.2-.4.3-.9.3-1.4 0-1.9-1.6-3.5-3.8-3.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.5v17.5M9 8.2c1 .5 2 .5 3 0M9 15.8c1-.5 2-.5 3 0M6.3 12h1.6M16.1 12h1.6"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.75"
      />
      <circle cx="12" cy="12" r="1.4" fill={color} />
    </svg>
  );
}
