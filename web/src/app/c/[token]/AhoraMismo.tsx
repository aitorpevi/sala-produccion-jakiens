"use client";

import { useEffect, useState } from "react";

/**
 * Bloque de la orden de trabajo que está ocurriendo ahora.
 *
 * Es lo único de la vista de cliente que se ejecuta en el navegador, y por un
 * motivo concreto: el servidor no sabe qué hora es donde está el cliente, y una
 * página cacheada se quedaría congelada. Se recalcula cada minuto.
 *
 * Solo se activa el día del rodaje. Si el cliente abre la página tres días
 * antes, ver "ahora mismo: comida" sería desconcertante — en su lugar sale la
 * cuenta atrás.
 */

type Bloque = { id: string; hora: string; descripcion: string };

/** "07:30" → minutos desde medianoche. Devuelve null si no es una hora. */
function aMinutos(hora: string): number | null {
  const m = hora.trim().match(/^(\d{1,2})[:.h ]?(\d{2})?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (!Number.isFinite(h) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function textoCuentaAtras(ms: number) {
  const min = Math.floor(ms / 60000);
  const dias = Math.floor(min / 1440);
  const horas = Math.floor((min % 1440) / 60);
  const minutos = min % 60;
  if (dias > 0) return `Faltan ${dias} ${dias === 1 ? "día" : "días"} y ${horas} h`;
  if (horas > 0) return `Faltan ${horas} h ${minutos} min`;
  return `Faltan ${minutos} min`;
}

export function AhoraMismo({
  bloques,
  fechaISO,
  llegadaCliente,
}: {
  bloques: Bloque[];
  fechaISO: string | null;
  llegadaCliente: string | null;
}) {
  const [ahora, setAhora] = useState<Date | null>(null);

  // El primer render tiene que coincidir con el del servidor o React protesta,
  // así que la hora no se lee hasta después de montar.
  useEffect(() => {
    setAhora(new Date());
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!ahora || !fechaISO) return null;

  const dia = new Date(fechaISO);
  const esHoy =
    dia.getFullYear() === ahora.getFullYear() &&
    dia.getMonth() === ahora.getMonth() &&
    dia.getDate() === ahora.getDate();

  if (!esHoy) {
    // Antes del día: cuenta atrás a la hora de llegada sugerida, o al inicio.
    const referencia = llegadaCliente ?? bloques[0]?.hora ?? null;
    const min = referencia ? aMinutos(referencia) : null;
    if (min === null) return null;

    const objetivo = new Date(dia);
    objetivo.setHours(Math.floor(min / 60), min % 60, 0, 0);
    const falta = objetivo.getTime() - ahora.getTime();
    if (falta <= 0) return null;

    return (
      <div className="ahora">
        <span className="ahora-et">Cuenta atrás</span>
        <strong>{textoCuentaAtras(falta)}</strong>
        {llegadaCliente ? <span className="ahora-sub">Te esperamos a las {llegadaCliente}</span> : null}
      </div>
    );
  }

  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const conMinutos = bloques
    .map((b) => ({ ...b, min: aMinutos(b.hora) }))
    .filter((b): b is Bloque & { min: number } => b.min !== null)
    .sort((a, b) => a.min - b.min);

  if (conMinutos.length === 0) return null;

  const actual = [...conMinutos].reverse().find((b) => b.min <= minAhora) ?? null;
  const siguiente = conMinutos.find((b) => b.min > minAhora) ?? null;

  if (!actual && !siguiente) return null;

  return (
    <div className="ahora">
      <span className="ahora-et">Ahora mismo</span>
      <strong>{actual ? `${actual.hora} · ${actual.descripcion}` : "Aún no ha empezado"}</strong>
      {siguiente ? (
        <span className="ahora-sub">
          A continuación · {siguiente.hora} {siguiente.descripcion}
        </span>
      ) : (
        <span className="ahora-sub">Último bloque de la jornada</span>
      )}
    </div>
  );
}
