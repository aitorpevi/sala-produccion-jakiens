import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { createProjectAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  faltan_campos: "Faltan campos obligatorios (código, cliente, nombre).",
  codigo_duplicado: "Ya existe un proyecto con ese código.",
};

export default async function NuevoProyectoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await requireStaff();
  if (staff.tier !== "FULL") redirect("/p");

  const { error } = await searchParams;

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="wordmark">Jakiens</span>
          <span className="sub">Sala de producción</span>
        </div>
        <div className="viewer">
          <span className="tag">{staff.name} · Acceso total</span>
          <form action={logoutAction}>
            <button className="btn ghost" type="submit">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main>
        <div className="mod-head">
          <div className="htxt">
            <span className="step">Alta de proyecto</span>
            <h2>Kickoff de proyecto nuevo</h2>
            <p className="lead">
              Se rellena cuando el proyecto se gana en firme y se activa producción. Las fechas se pueden
              ajustar más adelante desde Preproducción.
            </p>
          </div>
        </div>

        {error ? <div className="form-error">{ERROR_MESSAGES[error] ?? "No se pudo crear el proyecto."}</div> : null}

        <div className="panel">
          <div className="phdr">
            <h3>Datos del proyecto</h3>
          </div>
          <form action={createProjectAction} className="alta">
            <div className="fgrid">
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
                <label htmlFor="director">Realizador</label>
                <input id="director" name="director" />
              </div>
              <div className="field">
                <label htmlFor="agencia">Agencia</label>
                <input id="agencia" name="agencia" />
              </div>
              <div className="field">
                <label htmlFor="location">Localización</label>
                <input id="location" name="location" />
              </div>
              <div className="field">
                <label htmlFor="format">Formato</label>
                <input id="format" name="format" placeholder='Ej. Spot 30" + 6 cápsulas RRSS' />
              </div>
              <div className="field">
                <label htmlFor="shootLabel">Rodaje (etiqueta)</label>
                <input id="shootLabel" name="shootLabel" placeholder="Ej. 24–25 JUL 2026" />
              </div>

              <div className="field">
                <label htmlFor="preproInicio">Preproducción — inicio</label>
                <input id="preproInicio" name="preproInicio" placeholder="Ej. 14 JUL" />
              </div>
              <div className="field">
                <label htmlFor="preproFin">Preproducción — fin</label>
                <input id="preproFin" name="preproFin" placeholder="Ej. 23 JUL" />
              </div>
              <div className="field">
                <label htmlFor="rodajeInicio">Rodaje — inicio</label>
                <input id="rodajeInicio" name="rodajeInicio" placeholder="Ej. 24 JUL" />
              </div>
              <div className="field">
                <label htmlFor="rodajeFin">Rodaje — fin</label>
                <input id="rodajeFin" name="rodajeFin" placeholder="Ej. 25 JUL" />
              </div>
              <div className="field">
                <label htmlFor="entregaMaterial">Entrega de material</label>
                <input id="entregaMaterial" name="entregaMaterial" placeholder="Ej. 26 JUL" />
              </div>
              <div className="field">
                <label htmlFor="primeraEntregaMontaje">1ª entrega de montaje</label>
                <input id="primeraEntregaMontaje" name="primeraEntregaMontaje" placeholder="Ej. 04 AGO" />
              </div>

              <div className="field">
                <label htmlFor="driveFolderUrl">Carpeta de Drive (opcional)</label>
                <input id="driveFolderUrl" name="driveFolderUrl" placeholder="https://drive.google.com/..." />
              </div>
              <div className="field">
                <label htmlFor="slackWebhookUrl">Webhook de Slack (opcional)</label>
                <input id="slackWebhookUrl" name="slackWebhookUrl" placeholder="https://hooks.slack.com/services/..." />
              </div>
            </div>
            <div className="form-foot">
              <span className="hint">El proyecto arranca en la fase Equipo, lista para dar de alta al equipo</span>
              <button className="btn solid" type="submit">
                Crear proyecto
              </button>
            </div>
          </form>
        </div>
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
