import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { AppShell, ModHead, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";
import {
  crearJornadaAction,
  guardarRestriccionesAction,
  subirImagenClienteAction,
  crearEnlaceClienteAction,
  revocarEnlaceClienteAction,
} from "./actions";
import { blobDisponible } from "@/lib/storage";
import { JornadaEditor } from "./JornadaEditor";

export default async function RodajePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "rodaje");

  const [dias, miembros] = await Promise.all([
    db.callSheetDay.findMany({
      where: { projectId: project.id },
      include: {
        scheduleItems: { orderBy: { hora: "asc" } },
        callTimes: true,
        localizaciones: { orderBy: { orden: "asc" } },
        traslados: { orderBy: { orden: "asc" } },
      },
      orderBy: { orden: "asc" },
    }),
    db.projectMember.findMany({
      where: { projectId: project.id },
      include: { person: true },
      orderBy: { role: "asc" },
    }),
  ]);

  const conRestricciones = miembros.filter((m) => m.restriccionesAlimentarias);

  const accesos = await db.clientAccess.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });
  const hayBlob = blobDisponible();

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="rodaje"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ModHead
        step="05"
        title="Rodaje"
        lead="Orden de rodaje por jornada: localizaciones, horario, traslados y convocatoria. Cada colaborador ve la suya destacada."
      />

      <div className="panel">
        <div className="phdr">
          <h3>Jornadas</h3>
          <span className="tag">{dias.length}</span>
        </div>
        <div className="body-copy">
          <form action={crearJornadaAction} className="fgrid">
            <input type="hidden" name="code" value={project.code} />
            <div className="field">
              <label htmlFor="fecha-nueva">Añadir jornada</label>
              <input id="fecha-nueva" name="fecha" placeholder="Lunes 8 de septiembre" required />
            </div>
            <div className="field">
              <button className="btn solid" type="submit">
                Crear jornada
              </button>
            </div>
          </form>
          {dias.length === 0 ? (
            <p className="hint" style={{ marginTop: 10 }}>
              Todavía no hay jornadas. Crea la primera para empezar la orden de rodaje.
            </p>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Restricciones alimentarias</h3>
          <span className="tag">{conRestricciones.length} con restricción</span>
        </div>
        <div className="body-copy">
          <p className="hint">
            Son datos de salud: se guardan cifrados, solo para este proyecto, y el cliente los verá
            agregados y sin nombres. Pídeselos al equipo antes de anotarlos aquí.
          </p>
          <form action={guardarRestriccionesAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="code" value={project.code} />
            <div className="fgrid">
              {miembros.map((m) => (
                <div className="field" key={m.id}>
                  <label htmlFor={`restr-${m.id}`}>
                    {m.person.name} · {m.role}
                  </label>
                  <input
                    id={`restr-${m.id}`}
                    name={`restr-${m.id}`}
                    defaultValue={m.restriccionesAlimentarias ?? ""}
                    placeholder="sin restricciones"
                  />
                </div>
              ))}
            </div>
            <div className="form-foot">
              <span className="hint">
                {miembros.length === 0 ? "Sin equipo todavía." : `${miembros.length} personas`}
              </span>
              <button className="btn solid" type="submit">
                Guardar restricciones
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Vista de cliente y agencia</h3>
          <span className="tag">{accesos.length} enlaces</span>
        </div>
        <div className="body-copy">
          <p className="hint">
            Una página con la orden de rodaje, sin teléfonos del equipo, sin tarifas y con los
            alérgenos agregados y sin nombres. Se genera de estos mismos datos: al editar la
            jornada, el cliente ve el cambio.
          </p>

          {!hayBlob ? (
            <div className="empty" style={{ marginTop: 12, textAlign: "left" }}>
              <span className="em-mono">Falta configurar el almacenamiento</span>
              Sin <code>BLOB_READ_WRITE_TOKEN</code> no se pueden subir la portada ni los logos.
              Los enlaces funcionan igual, pero la página saldrá sin imagen.
            </div>
          ) : null}

          <div className="fgrid" style={{ marginTop: 14 }}>
            {[
              { campo: "portadaUrl", label: "Imagen de portada", valor: project.portadaUrl },
              { campo: "logoClienteUrl", label: `Logo de ${project.client}`, valor: project.logoClienteUrl },
              { campo: "logoAgenciaUrl", label: `Logo de ${project.agencia || "la agencia"}`, valor: project.logoAgenciaUrl },
            ].map((x) => (
              <div className="field" key={x.campo}>
                <label htmlFor={`img-${x.campo}`}>
                  {x.label} {x.valor ? "· cargado" : ""}
                </label>
                <form action={subirImagenClienteAction}>
                  <input type="hidden" name="code" value={project.code} />
                  <input type="hidden" name="campo" value={x.campo} />
                  <input id={`img-${x.campo}`} type="file" name="file" accept="image/*,.svg" />
                  <button className="btn" type="submit" style={{ marginTop: 6 }}>
                    Subir
                  </button>
                </form>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            La portada puede ser un frame del animatic, una página del moodboard o una foto de la
            localización. Lo que quede bien: el key visual casi nunca existe todavía el día del rodaje.
          </p>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>Enlaces</h4>
          {accesos.length === 0 ? (
            <p className="hint">Sin enlaces todavía.</p>
          ) : (
            accesos.map((a) => (
              <div className="file" key={a.id}>
                <div className="fmeta">
                  <div className="fn">
                    {a.tipo === "agencia" ? "Agencia" : "Cliente"}
                    {a.etiqueta ? ` · ${a.etiqueta}` : ""}
                  </div>
                  <div className="fd">
                    /c/{a.token} · caduca el {a.expiresAt.toLocaleDateString("es-ES")} ·{" "}
                    {a.lastSeenAt
                      ? `visto el ${a.lastSeenAt.toLocaleDateString("es-ES")}`
                      : "sin abrir todavía"}
                  </div>
                </div>
                <a className="btn" href={`/c/${a.token}`} target="_blank" rel="noreferrer">
                  Abrir
                </a>
                <form action={revocarEnlaceClienteAction}>
                  <input type="hidden" name="code" value={project.code} />
                  <input type="hidden" name="accesoId" value={a.id} />
                  <button className="btn ghost" type="submit">
                    Revocar
                  </button>
                </form>
              </div>
            ))
          )}

          <form action={crearEnlaceClienteAction} className="fgrid" style={{ marginTop: 12 }}>
            <input type="hidden" name="code" value={project.code} />
            <div className="field">
              <label htmlFor="tipo-acceso">Para quién</label>
              <select id="tipo-acceso" name="tipo" defaultValue="cliente">
                <option value="cliente">Cliente</option>
                <option value="agencia">Agencia</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="etiqueta-acceso">A quién se lo das</label>
              <input id="etiqueta-acceso" name="etiqueta" placeholder="Marta, de McCann" />
            </div>
            <div className="field">
              <button className="btn solid" type="submit">
                Generar enlace
              </button>
            </div>
          </form>
        </div>
      </div>

      {dias.map((dia, i) => (
        <JornadaEditor
          key={dia.id}
          code={project.code}
          indice={i + 1}
          dia={dia}
          miembros={miembros}
        />
      ))}
    </AppShell>
  );
}
