import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { guardarClienteAction } from "./actions";

/**
 * Directorio de clientes y agencias.
 *
 * Existe para dos cosas que antes había que reconstruir a mano: saber quién
 * repite y en qué época llama cada uno, y que los datos fiscales lleguen a
 * contabilidad sin volver a teclearse en cada factura.
 *
 * Cada ficha muestra su volumen de trabajo —cuántos proyectos, cuántos ganados—
 * porque es la pregunta que se hace cualquiera al abrir esta pantalla.
 */
export default async function ClientesPage() {
  const staff = await requireStaffTier(["FULL", "LOGISTICS"]);

  const clientes = await db.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      proyectos: { select: { id: true, code: true, name: true, etapa: true, estado: true, createdAt: true } },
    },
  });

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <main>
        <div className="mod-head">
          <div className="htxt">
            <span className="step">Gestor</span>
            <h2>Clientes y agencias</h2>
            <p className="lead">
              La ficha se crea sola al abrir una oportunidad. Aquí se completan los datos fiscales,
              que son los que luego necesita contabilidad.
            </p>
          </div>
          <Link href="/gestor" className="btn ghost">
            Volver al tablero
          </Link>
        </div>

        {clientes.length === 0 ? (
          <div className="panel">
            <div className="empty">
              <span className="em-mono">Sin clientes</span>
              Se crearán solos al abrir la primera oportunidad.
            </div>
          </div>
        ) : null}

        {clientes.map((c) => {
          const ganados = c.proyectos.filter((p) => p.etapa !== "VENTA").length;
          const perdidos = c.proyectos.filter((p) => p.estado === "PERDIDO").length;
          return (
            <details className="panel" key={c.id}>
              <summary className="phdr">
                <h3>{c.nombre}</h3>
                <span className="tag">
                  {c.proyectos.length} {c.proyectos.length === 1 ? "proyecto" : "proyectos"} ·{" "}
                  {ganados} ganados
                  {perdidos > 0 ? ` · ${perdidos} perdidos` : ""}
                  {c.cif ? "" : " · sin CIF"}
                </span>
              </summary>

              {c.proyectos.map((p) => (
                <div className="file" key={p.id}>
                  <div className="ic" data-ext={String(p.createdAt.getFullYear()).slice(-2)}></div>
                  <div className="fmeta">
                    <div className="fn">{p.name}</div>
                    <div className="fd">
                      {p.code} · {p.etapa.toLowerCase()}
                    </div>
                  </div>
                  <Link className="btn ghost" href={`/gestor/${p.code}`}>
                    Ver
                  </Link>
                </div>
              ))}

              <form action={guardarClienteAction} className="alta">
                <input type="hidden" name="id" value={c.id} />
                <div className="fgrid">
                  <div className="field">
                    <label htmlFor={`cif-${c.id}`}>CIF</label>
                    <input id={`cif-${c.id}`} name="cif" defaultValue={c.cif ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor={`pago-${c.id}`}>Condiciones de pago</label>
                    <input
                      id={`pago-${c.id}`}
                      name="condicionesPago"
                      defaultValue={c.condicionesPago ?? ""}
                      placeholder="30 días fecha factura"
                    />
                  </div>
                  <div className="field full">
                    <label htmlFor={`dir-${c.id}`}>Dirección fiscal</label>
                    <input id={`dir-${c.id}`} name="direccionFiscal" defaultValue={c.direccionFiscal ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor={`cn-${c.id}`}>Contacto</label>
                    <input id={`cn-${c.id}`} name="contactoNombre" defaultValue={c.contactoNombre ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor={`ce-${c.id}`}>Email</label>
                    <input id={`ce-${c.id}`} name="contactoEmail" type="email" defaultValue={c.contactoEmail ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor={`ct-${c.id}`}>Teléfono</label>
                    <input id={`ct-${c.id}`} name="contactoTelefono" defaultValue={c.contactoTelefono ?? ""} />
                  </div>
                  <div className="field full">
                    <label htmlFor={`nt-${c.id}`}>Notas</label>
                    <textarea id={`nt-${c.id}`} name="notas" rows={2} defaultValue={c.notas ?? ""} />
                  </div>
                </div>
                <div className="form-foot">
                  <span className="hint">Estos datos son los que viajan a contabilidad</span>
                  <button className="btn solid" type="submit">
                    Guardar
                  </button>
                </div>
              </form>
            </details>
          );
        })}
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
