import Link from "next/link";
import type { Etapa, TipoHito } from "@/generated/prisma/enums";
import { ETAPAS } from "@/lib/etapas";
import { PRODUCTORAS } from "@/lib/productoras";
import { bloqueaJornada, etiquetaFecha, urgencia } from "@/lib/hitos";
import { barra, choquesDeRodaje, posicion, type Rango, type Jornada } from "@/lib/calendario";

export type HitoCal = {
  id: string;
  titulo: string;
  fecha: Date;
  fechaFin: Date | null;
  tipo: TipoHito;
  completadoEn: Date | null;
};

export type ProyectoCal = {
  id: string;
  code: string;
  name: string;
  client: string;
  marca: string | null;
  productora: string | null;
  etapa: Etapa;
  refPresupuesto: string | null;
  hitos: HitoCal[];
  asignaciones: { id: string; etapa: Etapa; responsable: boolean; staff: { name: string } }[];
};

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * El calendario de toda la compañía: una fila por proyecto, el tiempo en
 * horizontal.
 *
 * Es una línea de tiempo y no una rejilla de mes por una razón concreta. Una
 * rejilla contesta "qué pasa el día 14", que es una pregunta de agenda
 * personal. Aquí la pregunta es otra —"qué tenemos en marcha y quién lo
 * lleva"—, y esa se contesta por filas. Además un rodaje de cuatro días en una
 * rejilla parece cuatro eventos sueltos, cuando es justo lo contrario: un
 * bloque en el que el equipo no está disponible para nada más.
 *
 * Todo sale de `Hito`, la misma tabla que alimenta las fechas de cada ficha. No
 * hay calendario aparte que mantener ni nada que sincronizar: es el mismo dato
 * mirado por el otro eje.
 */
export function CalendarioProyectos({
  proyectos,
  rango,
  hoy,
}: {
  proyectos: ProyectoCal[];
  rango: Rango;
  hoy: Date;
}) {
  // Las jornadas de rodaje de TODOS los proyectos, para saber cuáles se pisan.
  // Se calcula una vez y no por fila: un choque es una relación entre dos
  // proyectos, no una propiedad de uno.
  const jornadas: Jornada[] = proyectos.flatMap((p) =>
    p.hitos
      .filter((h) => bloqueaJornada(h.tipo))
      .map((h) => ({
        hitoId: h.id,
        projectId: p.id,
        inicio: h.fecha,
        fin: h.fechaFin ?? h.fecha,
      }))
  );
  const chocan = choquesDeRodaje(jornadas);
  const hayChoques = chocan.size > 0;

  const hoyPct = posicion(hoy, rango);
  const hoyVisible = hoyPct >= 0 && hoyPct <= 100;

  return (
    <div className="cal">
      {hayChoques ? (
        <p className="cal-choque-aviso">
          Hay jornadas de rodaje de proyectos distintos el mismo día. Están marcadas abajo.
        </p>
      ) : null}

      <div className="cal-rejilla">
        {/* Cabecera: los meses del periodo. */}
        <div className="cal-fila cal-cabecera">
          <div className="cal-etiqueta" />
          <div className="cal-pista">
            {rango.meses.map((m) => (
              <div
                className="cal-mes"
                key={m.label}
                style={{ left: `${m.izquierda}%`, width: `${m.ancho}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {ETAPAS.map((e) => {
          const enEtapa = proyectos.filter((p) => p.etapa === e.clave);
          if (enEtapa.length === 0) return null;

          return (
            <div className="cal-grupo" style={{ ["--etapa" as string]: e.color }} key={e.clave}>
              <div className="cal-fila cal-grupo-titulo">
                <div className="cal-etiqueta">
                  <span className="etapa-punto" />
                  {e.label}
                  <span className="cal-cuenta">{enEtapa.length}</span>
                </div>
                <div className="cal-pista" />
              </div>

              {enEtapa.map((p) => {
                const productora =
                  PRODUCTORAS[(p.productora ?? "JAKIENS") as keyof typeof PRODUCTORAS] ??
                  PRODUCTORAS.JAKIENS;
                const gente = p.asignaciones.filter((a) => a.etapa === p.etapa);

                const rodajes = p.hitos.filter((h) => bloqueaJornada(h.tipo));
                const puntos = p.hitos.filter((h) => !bloqueaJornada(h.tipo));
                // Se numeran solo los que de verdad se pintan, para que el
                // zigzag de carriles no salte al caer uno fuera del periodo.
                let carril = 0;

                return (
                  <div className="cal-fila cal-proyecto" key={p.id}>
                    <div className="cal-etiqueta">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="cal-logo" src={productora.logo} alt={productora.nombre} height={10} />
                      <Link className="cal-nombre" href={`/gestor/${p.code}`}>
                        {p.name}
                      </Link>
                      <span className="cal-cliente">
                        {p.client}
                        {p.marca ? ` · ${p.marca}` : ""}
                      </span>
                      <span className="cal-gente">
                        {gente.length > 0 ? (
                          gente.map((a) => (
                            <span
                              className={`cal-persona${a.responsable ? " lead" : ""}`}
                              key={a.id}
                              title={`${a.staff.name}${a.responsable ? " · responsable" : ""}`}
                            >
                              {iniciales(a.staff.name)}
                            </span>
                          ))
                        ) : (
                          <span className="cal-sin-gente">Sin asignar</span>
                        )}
                      </span>
                    </div>

                    <div className="cal-pista">
                      {rango.meses.map((m) => (
                        <span className="cal-linea" key={m.label} style={{ left: `${m.izquierda}%` }} />
                      ))}
                      {hoyVisible ? <span className="cal-hoy" style={{ left: `${hoyPct}%` }} /> : null}

                      {/* Los rodajes, como franja: el equipo no está disponible. */}
                      {rodajes.map((h) => {
                        const b = barra(h.fecha, h.fechaFin ?? h.fecha, rango);
                        if (!b) return null;
                        return (
                          <span
                            className={`cal-rodaje${chocan.has(h.id) ? " choca" : ""}${
                              h.completadoEn ? " hecho" : ""
                            }`}
                            key={h.id}
                            style={{ left: `${b.izquierda}%`, width: `${b.ancho}%` }}
                            title={`${h.titulo} · ${etiquetaFecha(h.fecha, h.fechaFin)}${
                              chocan.has(h.id) ? " · CHOCA con otro rodaje" : ""
                            }`}
                          >
                            {/*
                              En una ventana de tres meses un rodaje de dos días
                              mide un 2% del ancho y la palabra no cabe: se
                              recortaba a "Ro". Por debajo de ese umbral la
                              franja habla sola —es la única barra maciza de la
                              fila— y el texto completo sigue en el tooltip.
                            */}
                            {b.ancho >= 5 ? <span className="cal-rodaje-txt">Rodaje</span> : null}
                          </span>
                        );
                      })}

                      {/* El resto de fechas, como marca con su etiqueta. */}
                      {puntos.map((h) => {
                        const izq = posicion(h.fecha, rango);
                        if (izq < 0 || izq > 100) return null;
                        const u = urgencia(h.fecha, hoy, h.completadoEn);
                        const lane = carril++ % 2;
                        // Las etiquetas de la mitad derecha se escriben hacia la
                        // izquierda para no salirse de la pista.
                        const haciaIzquierda = izq > 62;
                        return (
                          <span
                            className={`cal-hito u-${u} carril-${lane}${haciaIzquierda ? " izq" : ""}`}
                            key={h.id}
                            style={{ left: `${izq}%` }}
                            title={`${h.titulo} · ${etiquetaFecha(h.fecha, h.fechaFin)}`}
                          >
                            <span className="cal-marca" />
                            <span className="cal-txt">{h.titulo}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="cal-leyenda">
        <span>
          <i className="lg-rodaje" />
          Rodaje
        </span>
        <span>
          <i className="lg-choque" />
          Rodajes que chocan
        </span>
        <span>
          <i className="lg-vencido" />
          Pendiente y pasado
        </span>
        <span>
          <i className="lg-hecho" />
          Hecho
        </span>
        <span>
          <i className="lg-hoy" />
          Hoy
        </span>
      </div>
    </div>
  );
}
