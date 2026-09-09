"use client";

import { useState } from "react";

/**
 * Selector de archivo que avisa ANTES de enviar si el archivo no va a caber.
 *
 * Vercel rechaza cualquier petición de más de 4,5 MB en la propia plataforma,
 * sin que el código llegue a ejecutarse: el navegador recibe un 413 y la
 * pantalla se rompe sin explicación. Eso fue exactamente lo que pasó el
 * 2026-09-09 al adjuntar un briefing.
 *
 * Comprobarlo en el navegador convierte un error incomprensible en una frase
 * que dice qué hacer. Y lo que dice —pega el enlace— es además la mejor opción:
 * un brief que vive en Drive o Canva sigue cambiando, y una copia subida se
 * queda congelada.
 */
const LIMITE = 4 * 1024 * 1024;

export function ArchivoLimitado({
  id,
  name,
  accept,
}: {
  id: string;
  name: string;
  accept?: string;
}) {
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f && f.size > LIMITE) {
            setAviso(
              `«${f.name}» pesa ${(f.size / 1024 / 1024).toFixed(1)} MB y el máximo son 4 MB. ` +
                "Súbelo a Drive o Canva y pega aquí el enlace: además así el equipo verá siempre la última versión.",
            );
            e.currentTarget.value = "";
          } else {
            setAviso(null);
          }
        }}
      />
      {aviso ? <span className="aviso-archivo">{aviso}</span> : null}
    </>
  );
}
