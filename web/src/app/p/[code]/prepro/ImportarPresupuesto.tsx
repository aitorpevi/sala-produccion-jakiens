"use client";

import { useState, useTransition } from "react";
import { importarPuestosAction } from "./actions";

/**
 * Sube el presupuesto aprobado, enseña lo que se ha encontrado y deja que
 * producción confirme qué líneas son puestos de equipo antes de importarlas.
 *
 * El paso de confirmación no es burocracia: el Excel no distingue "2 eléctricos"
 * de "2 furgonetas" de forma fiable, y colar material como si fuera gente
 * ensuciaría el control de cobertura justo donde tiene que ser exacto.
 */

type Linea = {
  seccion: string | null;
  concepto: string;
  cantidad: number;
  dias: number | null;
  pareceEquipo: boolean;
};

export function ImportarPresupuesto({ code }: { code: string }) {
  const [lineas, setLineas] = useState<Linea[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [hoja, setHoja] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [importando, startImport] = useTransition();

  async function leer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);

    setLeyendo(true);
    setError(null);
    try {
      const res = await fetch(`/api/presupuesto/${code}`, { method: "POST", body: datos });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se ha podido leer el archivo.");
        setLineas(null);
        return;
      }
      setHoja(json.hoja);
      setLineas(json.lineas);
      setMarcadas(
        new Set(
          (json.lineas as Linea[]).map((l, i) => (l.pareceEquipo ? i : -1)).filter((i) => i >= 0),
        ),
      );
      if (json.aviso) setError(json.aviso);
    } catch {
      setError("No se ha podido contactar con el servidor.");
    } finally {
      setLeyendo(false);
    }
  }

  function alternar(i: number) {
    setMarcadas((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return s;
    });
  }

  function importar() {
    if (!lineas) return;
    const elegidas = [...marcadas].sort((a, b) => a - b).map((i) => lineas[i]);
    startImport(async () => {
      await importarPuestosAction(code, elegidas);
      setLineas(null);
      setMarcadas(new Set());
    });
  }

  return (
    <div className="body-copy">
      <p className="hint">
        Sube el presupuesto aprobado en <code>.xlsx</code> y marca qué líneas son puestos de equipo.
        El archivo no se guarda: solo se lee.
      </p>

      <form onSubmit={leer} className="fgrid" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="ppto">Presupuesto aprobado</label>
          <input id="ppto" name="file" type="file" accept=".xlsx" required />
        </div>
        <div className="field">
          <button className="btn solid" type="submit" disabled={leyendo}>
            {leyendo ? "Leyendo…" : "Leer presupuesto"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="form-error" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      {lineas && lineas.length > 0 ? (
        <>
          <p className="hint" style={{ marginTop: 16 }}>
            Encontradas {lineas.length} líneas en la hoja «{hoja}». Vienen premarcadas las que
            parecen personas — repásalas, porque la detección falla con nombres poco habituales.
          </p>

          <div style={{ marginTop: 10, maxHeight: 420, overflowY: "auto" }}>
            {lineas.map((l, i) => (
              <label
                key={i}
                className="file"
                style={{ cursor: "pointer", opacity: marcadas.has(i) ? 1 : 0.5 }}
              >
                <input
                  type="checkbox"
                  checked={marcadas.has(i)}
                  onChange={() => alternar(i)}
                  style={{ width: "auto", marginRight: 10 }}
                />
                <div className="fmeta">
                  <div className="fn">
                    {l.cantidad} × {l.concepto}
                  </div>
                  <div className="fd">
                    {l.dias ? `${l.dias} jornadas` : "sin jornadas"}
                    {l.seccion ? ` · ${l.seccion}` : ""}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="form-foot">
            <span className="hint">{marcadas.size} líneas marcadas como equipo</span>
            <button
              className="btn solid"
              type="button"
              onClick={importar}
              disabled={importando || marcadas.size === 0}
            >
              {importando ? "Importando…" : `Importar ${marcadas.size} puestos`}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
