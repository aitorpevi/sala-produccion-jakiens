import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { CLAVES_PRODUCTORA, PRODUCTORAS } from "@/lib/productoras";
import { ArchivoLimitado } from "@/components/ArchivoLimitado";
import { crearOportunidadAction } from "./actions";

const ERRORES: Record<string, string> = {
  faltan_campos: "Faltan el cliente/agencia y el nombre del proyecto.",
};

export default async function NuevaOportunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await requireStaff();
  if (staff.tier !== "FULL") redirect("/gestor");

  const { error } = await searchParams;

  const [clientes, marcas, equipo] = await Promise.all([
    db.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    // Las marcas ya usadas alimentan el autocompletado. No son una tabla: es
    // texto libre con memoria, para que "Turia" no acabe escrita de seis formas.
    db.project.findMany({
      where: { marca: { not: null } },
      distinct: ["marca"],
      select: { marca: true },
      orderBy: { marca: "asc" },
    }),
    db.staffUser.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Quien puede preparar el presupuesto de venta es quien puede verlo.
  const puedenPresupuestar = equipo.filter((p) => p.accesoPresupuestoVenta);

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <main>
        <div className="mod-head">
          <div className="htxt">
            <span className="step">Venta</span>
            <h2>Nueva oportunidad</h2>
            <p className="lead">
              Se abre en cuanto hay algo sobre la mesa, antes de saber si se gana. Con esto el
              equipo ya ve que existe y se puede repartir el trabajo. Lo demás se rellena según se
              sepa.
            </p>
          </div>
        </div>

        {error ? (
          <div className="form-error">{ERRORES[error] ?? "No se pudo crear la oportunidad."}</div>
        ) : null}

        <form action={crearOportunidadAction}>
          <div className="panel">
            <div className="phdr">
              <h3>El proyecto</h3>
            </div>
            <div className="alta">
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="productora">Productora</label>
                  <select id="productora" name="productora" defaultValue="JAKIENS" required>
                    {CLAVES_PRODUCTORA.map((k) => (
                      <option key={k} value={k}>
                        {PRODUCTORAS[k].nombre} · {PRODUCTORAS[k].descripcion}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cliente">Cliente / Agencia</label>
                  <input
                    id="cliente"
                    name="cliente"
                    list="lista-clientes"
                    placeholder="McCann, Ogilvy, o el cliente directo"
                    required
                  />
                  <datalist id="lista-clientes">
                    {clientes.map((c) => (
                      <option key={c.id} value={c.nombre} />
                    ))}
                  </datalist>
                  <span className="ayuda">
                    Si no está en la lista se crea su ficha sola. Los datos fiscales se completan
                    después, desde Clientes.
                  </span>
                </div>
                <div className="field">
                  <label htmlFor="marca">Marca</label>
                  <input
                    id="marca"
                    name="marca"
                    list="lista-marcas"
                    placeholder="Cerveza Turia, Consum..."
                  />
                  <datalist id="lista-marcas">
                    {marcas.map((m) => (
                      <option key={m.marca} value={m.marca ?? ""} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="name">Nombre del proyecto</label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Verano, Navidad, Lanzamiento..."
                    required
                  />
                  <span className="ayuda">Se lee junto a la marca: «Cerveza Turia · Verano».</span>
                </div>
                <div className="field">
                  <label htmlFor="director">Realizador propuesto</label>
                  <input
                    id="director"
                    name="director"
                    placeholder="Primeras ideas, aunque no esté cerrado"
                  />
                </div>
                <div className="field">
                  <label htmlFor="entregaPropuesta">Entrega de la propuesta</label>
                  <input id="entregaPropuesta" name="entregaPropuesta" type="date" />
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="phdr">
              <h3>Briefing</h3>
              <span className="tag">Lo que manda la agencia</span>
            </div>
            <div className="alta">
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="briefingArchivo">Documento</label>
                  <ArchivoLimitado
                    id="briefingArchivo"
                    name="briefingArchivo"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.key,.zip"
                  />
                </div>
                <div className="field">
                  <label htmlFor="briefingUrl">O enlace</label>
                  <input id="briefingUrl" name="briefingUrl" placeholder="Drive, Dropbox, Canva..." />
                  <span className="ayuda">
                    Si el brief vive en la nube, mejor el enlace: una copia subida se queda
                    congelada mientras la buena sigue cambiando.
                  </span>
                </div>
                <div className="field full">
                  <label htmlFor="comentarios">Comentarios Canva</label>
                  <textarea id="comentarios" name="comentarios" rows={3} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="phdr">
              <h3>Quién la trabaja</h3>
              <span className="tag">Se puede cambiar después</span>
            </div>
            <div className="alta">
              <div className="equipo-picker">
                {equipo.map((p) => (
                  <label className="persona-check" key={p.id}>
                    <input type="checkbox" name="equipo" value={p.id} />
                    <span className="pc-nombre">{p.name}</span>
                  </label>
                ))}
              </div>
              <div className="fgrid" style={{ marginTop: 16 }}>
                <div className="field">
                  <label htmlFor="responsable">Responsable de la propuesta</label>
                  <select id="responsable" name="responsable" defaultValue="">
                    <option value="">— Sin responsable todavía —</option>
                    {equipo.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <span className="ayuda">Quien supervisa y a quien se le pregunta.</span>
                </div>
                <div className="field">
                  <label htmlFor="presupuestoAsignadoA">Prepara el presupuesto</label>
                  <select id="presupuestoAsignadoA" name="presupuestoAsignadoA" defaultValue="">
                    <option value="">— Sin asignar —</option>
                    {puedenPresupuestar.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <span className="ayuda">Le llega aviso en la app y por Slack.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="alta">
              <div className="form-foot">
                <span className="hint">
                  El código se genera solo. El identificador de verdad llega con el PDF del
                  presupuesto.
                </span>
                <button className="btn solid" type="submit">
                  Abrir oportunidad
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
