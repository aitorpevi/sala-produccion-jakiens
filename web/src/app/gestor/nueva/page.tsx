import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { CLAVES_PRODUCTORA, PRODUCTORAS } from "@/lib/productoras";
import { crearOportunidadAction } from "./actions";

const ERRORES: Record<string, string> = {
  faltan_campos: "Faltan campos obligatorios (código, cliente, nombre).",
  codigo_duplicado: "Ya existe un proyecto con ese código.",
};

export default async function NuevaOportunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await requireStaff();
  if (staff.tier !== "FULL") redirect("/gestor");

  const { error } = await searchParams;

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <main>
        <div className="mod-head">
          <div className="htxt">
            <span className="step">Venta</span>
            <h2>Nueva oportunidad</h2>
            <p className="lead">
              Se abre en cuanto hay una oportunidad sobre la mesa, antes de saber si se gana. Con
              esto el equipo ya ve que existe y Carmen puede repartir el trabajo. Lo demás se
              rellena según se sepa.
            </p>
          </div>
        </div>

        {error ? <div className="form-error">{ERRORES[error] ?? "No se pudo crear la oportunidad."}</div> : null}

        <div className="panel">
          <div className="phdr">
            <h3>Lo que se sabe hoy</h3>
          </div>
          <form action={crearOportunidadAction} className="alta">
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
                <label htmlFor="client">Cliente</label>
                <input id="client" name="client" required />
              </div>
              <div className="field">
                <label htmlFor="name">Nombre del proyecto</label>
                <input id="name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="code">Código</label>
                <input id="code" name="code" placeholder="Ej. CHB-2607 (iniciales cliente + año/mes)" required />
              </div>
              <div className="field">
                <label htmlFor="agencia">Agencia</label>
                <input id="agencia" name="agencia" placeholder="Directo, si no hay" />
              </div>
              <div className="field">
                <label htmlFor="director">Realizador propuesto</label>
                <input id="director" name="director" placeholder="Si ya hay uno en mente" />
              </div>
              <div className="field">
                <label htmlFor="format">Formato</label>
                <input id="format" name="format" placeholder='Ej. Spot 30" + cápsulas RRSS' />
              </div>
              <div className="field">
                <label htmlFor="entregaPropuesta">Entrega de la propuesta</label>
                <input id="entregaPropuesta" name="entregaPropuesta" type="date" />
              </div>
              <div className="field full">
                <label htmlFor="notas">Qué piden</label>
                <textarea
                  id="notas"
                  name="notas"
                  rows={3}
                  placeholder="El brief en dos líneas: qué quieren, qué hay que preparar y con quién contamos."
                />
              </div>
            </div>
            <div className="form-foot">
              <span className="hint">
                La sala de producción sigue cerrada hasta que el proyecto se gane
              </span>
              <button className="btn solid" type="submit">
                Abrir oportunidad
              </button>
            </div>
          </form>
        </div>
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
