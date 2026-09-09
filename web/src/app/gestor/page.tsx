import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, filtroProyectosVisibles } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { ETAPAS, ESTADOS, estaVivo, estaArchivado } from "@/lib/etapas";
import { etiquetaFecha, urgencia } from "@/lib/hitos";
import { CLAVES_PRODUCTORA, PRODUCTORAS } from "@/lib/productoras";
import { IconoRadar } from "@/components/IconoRadar";

/** "Chiara" → "CH". Dos letras: con once personas no hay colisiones que importen. */
const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

type HitoMinimo = { fecha: Date; fechaFin: Date | null; titulo: string; completadoEn: Date | null };

/**
 * Qué fecha enseña la pastilla: la primera que quede PENDIENTE.
 *
 * Tuvo dos vidas anteriores y las dos eran peores. Primero enseñaba solo fechas
 * futuras, y un proyecto con todo el calendario pasado decía "sin fecha", que es
 * mentira y justo al revés de lo que importa. Luego enseñaba la última pasada en
 * gris, porque sin estado de "hecho" la app no podía saber si esa entrega se
 * cumplió o se le fue, y pintar una alarma sin saberlo habría sido inventarla.
 *
 * Ahora consta. Una fecha pendiente que ya pasó va en rojo y el rojo significa
 * algo; un proyecto con todo hecho dice "al día", que también es una respuesta.
 */
function fechaAEnsenar(hitos: HitoMinimo[]) {
  // Solo cuentan los que siguen pendientes: uno hecho ya no pide nada, aunque
  // su fecha esté por delante. Lo que interesa saber al mirar el tablero es qué
  // queda por hacer, no qué hay apuntado.
  const pendientes = hitos.filter((h) => !h.completadoEn);
  if (pendientes.length === 0) {
    return hitos.length > 0 ? { hito: null, pasada: false, alDia: true } : null;
  }
  // El primero pendiente por fecha. Si esa fecha ya pasó, va en rojo — y ahora
  // el rojo significa algo, porque consta que no se ha entregado.
  return { hito: pendientes[0], pasada: false, alDia: false };
}

/**
 * Home del gestor: la operativa de la compañía de un vistazo.
 *
 * Una columna por etapa, apiladas en vertical, y dentro cada proyecto es una
 * pastilla que se abre entera de un clic. La pastilla lleva quién está
 * trabajándola AHORA —los asignados a la etapa en la que está el proyecto— y
 * cuál es su próxima fecha, que son las dos preguntas que se hace cualquiera al
 * entrar: qué hay encima de la mesa y quién lo lleva.
 *
 * Lo ve TODO el equipo interno, sea cual sea su nivel. Los niveles filtran lo
 * que se puede hacer dentro de cada proyecto, no si el proyecto existe.
 */
export default async function GestorPage({
  searchParams,
}: {
  searchParams: Promise<{ productora?: string }>;
}) {
  const staff = await requireStaff();
  const hoy = new Date();
  // Al fusionar las dos pantallas se perdía la separación por productora, que
  // sí era útil: evita leer del tirón un rodaje de 40k y una pieza de social.
  // Vuelve como filtro en vez de como dos listas.
  const { productora: filtro } = await searchParams;
  const filtroActivo = CLAVES_PRODUCTORA.includes(filtro as never) ? filtro : null;

  const proyectos = await db.project.findMany({
    // Un producer externo solo ve los proyectos que lleva. Se filtra en la
    // consulta y no después: filtrar en memoria significaría que los ajenos ya
    // han pasado por el servidor.
    where: filtroProyectosVisibles(staff),
    orderBy: { createdAt: "desc" },
    include: {
      // Todos los hitos, y el que se enseña se elige abajo. Filtrar aquí por
      // "fecha futura" hacía que un proyecto con todas las fechas pasadas
      // dijera "sin fecha", que es mentira y justo al revés de lo que importa:
      // ese es el que hay que mirar. Son pocas filas por proyecto.
      hitos: { orderBy: { fecha: "asc" } },
      // Y solo la gente asignada a la etapa en la que el proyecto está ahora.
      // Quien trabajó la venta de algo que ya está en postpo no es quien lo
      // lleva hoy, y sacarlo aquí despistaría más que ayudar.
      asignaciones: { include: { staff: true }, orderBy: [{ responsable: "desc" }, { creadoEn: "asc" }] },
    },
  });

  const vivos = proyectos
    .filter((p) => estaVivo(p.estado))
    .filter((p) => !filtroActivo || (p.productora ?? "JAKIENS") === filtroActivo);
  const archivados = proyectos.filter((p) => estaArchivado(p.estado));

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <main>
        <div className="mod-head">
          <div className="htxt">
            <h2>Proyectos activos</h2>
          </div>
          {/*
            Dos líneas a propósito. Arriba lo que se hace a diario —abrir una
            oportunidad o dar de alta un proyecto ganado—; debajo, y más ligero,
            lo que se consulta de vez en cuando. Tenerlo todo en una fila daba a
            Radar el mismo peso que al botón que arranca un proyecto.
          */}
          <div className="acciones-cabecera">
            {staff.tier === "FULL" ? (
              <div className="acciones-fila">
                <Link href="/p/nuevo" className="btn ghost">
                  + Nuevo proyecto
                </Link>
                <Link href="/gestor/nueva" className="btn solid">
                  + Nueva oportunidad
                </Link>
              </div>
            ) : null}
            <div className="acciones-fila secundaria">
              <Link href="/radar" className="enlace-sec">
                <IconoRadar size={13} />
                Radar
              </Link>
              {staff.tier === "FULL" || staff.tier === "LOGISTICS" ? (
                <>
                  <Link href="/gestor/clientes" className="enlace-sec">
                    Clientes
                  </Link>
                  <Link href="/colaboradores" className="enlace-sec">
                    Colaboradores
                  </Link>
                </>
              ) : null}
              {staff.tier === "FULL" ? (
                <>
                  <Link href="/gestor/equipo" className="enlace-sec">
                    Permisos
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <nav className="filtros" aria-label="Filtrar por productora">
          <Link className={`filtro${filtroActivo ? "" : " on"}`} href="/gestor">
            Todo
          </Link>
          {CLAVES_PRODUCTORA.map((k) => (
            <Link
              key={k}
              className={`filtro${filtroActivo === k ? " on" : ""}`}
              href={`/gestor?productora=${k}`}
              style={{ ["--etapa" as string]: PRODUCTORAS[k].color }}
            >
              <span className="etapa-punto" />
              {PRODUCTORAS[k].nombre}
            </Link>
          ))}
        </nav>

        {vivos.length === 0 ? (
          <div className="panel">
            <div className="empty">
              <span className="em-mono">Nada en marcha</span>
              {staff.tier === "FULL"
                ? "Abre la primera oportunidad con el botón de arriba."
                : "Todavía no hay ningún proyecto abierto."}
            </div>
          </div>
        ) : null}

        {ETAPAS.map((e) => {
          const enEtapa = vivos.filter((p) => p.etapa === e.clave);

          return (
            <section className="etapa-bloque" style={{ ["--etapa" as string]: e.color }} key={e.clave}>
              <div className="etapa-titulo">
                <span className="etapa-punto" />
                <h3>{e.label}</h3>
                <span className="cuenta">{enEtapa.length}</span>
                <span className="desc">{e.descripcion}</span>
              </div>

              {enEtapa.length === 0 ? (
                // Las etapas vacías se quedan, no desaparecen: el hueco también
                // informa —"no tenemos nada en venta" es una noticia—, y hace
                // que el orden de la pantalla no baile cada semana.
                <p className="etapa-vacia">Nada en esta etapa</p>
              ) : (
                <div className="pastillas">
                  {enEtapa.map((p) => {
                    const fecha = fechaAEnsenar(p.hitos);
                    const gente = p.asignaciones.filter((a) => a.etapa === p.etapa);
                    const productora = PRODUCTORAS[(p.productora ?? "JAKIENS") as keyof typeof PRODUCTORAS] ?? PRODUCTORAS.JAKIENS;

                    return (
                      <Link className="pastilla" href={`/gestor/${p.code}`} key={p.id}>
                        <div className="p-top">
                          {/*
                            El logo identifica de un vistazo de quién es el
                            proyecto, que a ojo se lee antes que un nombre en
                            texto. Se usa `<img>` y no `next/image`: son SVG
                            estáticos de kilobytes, vectoriales, y el optimizador
                            no tiene nada que optimizar en ellos.
                          */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="p-logo"
                            src={productora.logo}
                            alt={productora.nombre}
                            height={12}
                          />
                          {fecha?.hito ? (
                            <span className={`hito-proximo u-${urgencia(fecha.hito.fecha, hoy)}`}>
                              {etiquetaFecha(fecha.hito.fecha, fecha.hito.fechaFin)}
                            </span>
                          ) : fecha?.alDia ? (
                            <span className="hito-proximo u-hecho">Al día</span>
                          ) : (
                            <span className="hito-proximo u-vacio">Sin fecha</span>
                          )}
                        </div>

                        <div className="p-nombre">{p.name}</div>
                        <div className="p-cliente">
                          {p.client}
                          {p.marca ? ` · ${p.marca}` : ""} · {p.refPresupuesto ?? p.code}
                          {p.estado !== "ACTIVO" && p.estado !== "OPORTUNIDAD"
                            ? ` · ${ESTADOS[p.estado].label}`
                            : ""}
                        </div>

                        {fecha?.hito ? <div className="p-hito">{fecha.hito.titulo}</div> : null}

                        {gente.length > 0 ? (
                          <div className="p-gente">
                            <div className="p-chips">
                              {gente.map((a) => (
                                <span
                                  className={`p-persona${a.responsable ? " lead" : ""}`}
                                  key={a.id}
                                  title={`${a.staff.name}${a.rol ? ` · ${a.rol}` : ""}${
                                    a.responsable ? " · responsable" : ""
                                  }`}
                                >
                                  {iniciales(a.staff.name)}
                                </span>
                              ))}
                            </div>
                            <span className="p-nombres">
                              {gente.map((a) => a.staff.name).join(" · ")}
                            </span>
                          </div>
                        ) : (
                          <div className="p-gente">
                            <span className="p-sin-gente">Sin asignar</span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {archivados.length > 0 ? (
          <details className="panel">
            <summary className="phdr">
              <h3>Archivados</h3>
              <span className="tag">{archivados.length}</span>
            </summary>
            {archivados.map((p) => (
              <div className="file" key={p.id}>
                <div className="ic" data-ext={p.estado === "PERDIDO" ? "NO" : "OK"}></div>
                <div className="fmeta">
                  <div className="fn">{p.name}</div>
                  <div className="fd">
                    {ESTADOS[p.estado].label} · {p.client} · {p.code}
                  </div>
                </div>
                <Link className="btn ghost" href={`/gestor/${p.code}`}>
                  Ver
                </Link>
              </div>
            ))}
          </details>
        ) : null}
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
