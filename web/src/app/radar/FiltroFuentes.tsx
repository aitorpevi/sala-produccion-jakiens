"use client";

import { useEffect, useState } from "react";

/**
 * Oculta o muestra tarjetas del radar por fuente, sin ir al servidor.
 *
 * Los datos de todas las fuentes ya están renderizados en la página: ocultar
 * una es cuestión de CSS, no de una consulta nueva. Por eso es instantáneo —
 * a diferencia del filtro por vertical, que sí cambia lo que hay que calcular
 * (el movimiento de Wikipedia filtrado por "moda" es otra consulta) y por eso
 * sigue siendo una navegación de servidor.
 *
 * Se recuerda en localStorage: quien decide que Bluesky le sobra no debería
 * tener que volver a decirlo en cada visita.
 */

const CLAVE = "radar-fuentes-ocultas";

export function FiltroFuentes({
  opciones,
}: {
  opciones: { fuente: string; etiqueta: string }[];
}) {
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [listo, setListo] = useState(false);

  useEffect(() => {
    // Única lectura de una fuente externa al montar (localStorage no existe en
    // el servidor, por eso no puede ir en el estado inicial). Es justo el caso
    // que la propia regla del linter da como correcto: sincronizar con algo de
    // fuera, no derivar un valor que ya se pudiera calcular en el render.
    try {
      const guardado: string[] = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage al montar, no un cálculo derivable en el render
      setOcultas(new Set(guardado));
    } catch {
      // localStorage vacío o con basura: se empieza sin nada oculto.
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    localStorage.setItem(CLAVE, JSON.stringify([...ocultas]));
    for (const { fuente } of opciones) {
      document.querySelectorAll<HTMLElement>(`[data-fuente="${fuente}"]`).forEach((el) => {
        el.style.display = ocultas.has(fuente) ? "none" : "";
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `opciones` es estable en cada render de esta página
  }, [ocultas, listo]);

  function alternar(fuente: string) {
    setOcultas((prev) => {
      const s = new Set(prev);
      if (s.has(fuente)) s.delete(fuente);
      else s.add(fuente);
      return s;
    });
  }

  return (
    <div className="body-copy">
      <p className="hint" style={{ marginBottom: 8 }}>
        Quita ruido sin recargar la página: los datos ya están cargados, solo se ocultan las
        tarjetas que no quieras ver.
      </p>
      {opciones.map((o) => (
        <label
          key={o.fuente}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginRight: 16,
            marginBottom: 4,
            fontFamily: "var(--body)",
            fontSize: 13,
            opacity: ocultas.has(o.fuente) ? 0.45 : 1,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={!ocultas.has(o.fuente)}
            onChange={() => alternar(o.fuente)}
            style={{ width: "auto" }}
          />
          {o.etiqueta}
        </label>
      ))}
    </div>
  );
}
