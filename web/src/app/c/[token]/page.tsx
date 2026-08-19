import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolverAccesoCliente, ordenParaCliente, marcaDe } from "@/lib/cliente";
import { AhoraMismo } from "./AhoraMismo";
import "./cliente.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const acceso = await resolverAccesoCliente(token);
  if (!acceso) return { title: "Orden de rodaje" };
  return {
    title: `${acceso.project.name} · Rodaje`,
    description: `Orden de rodaje de ${acceso.project.name} para ${acceso.project.client}.`,
    // Para "añadir a pantalla de inicio": se abre sin barra de navegador.
    appleWebApp: { capable: true, title: acceso.project.name, statusBarStyle: "black-translucent" },
    robots: { index: false, follow: false },
  };
}

export default async function VistaClientePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const acceso = await resolverAccesoCliente(token);
  if (!acceso) notFound();

  const project = acceso.project;
  const marca = marcaDe(project.brand);
  const { dias, restriccionesAnonimas } = await ordenParaCliente(project.id);

  // La jornada de hoy si la hay; si no, la primera que quede por delante.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const proxima =
    dias.find((d) => d.fechaISO && new Date(d.fechaISO) >= hoy) ?? dias[0] ?? null;

  return (
    <div className="cl" style={{ ["--acento" as string]: marca.color }}>
      <header className="cl-portada">
        {project.portadaUrl ? (
          <img className="cl-bg" src={`/api/cliente/${token}/imagen/portada`} alt="" />
        ) : null}

        <span className="cl-kicker">
          {acceso.tipo === "agencia" ? "Para la agencia" : "Para el cliente"} ·{" "}
          {project.brand === "RICORICO" ? "Ricorico" : "Jakiens"}
        </span>
        <h1 className="cl-titulo">{project.name}</h1>
        <span className="cl-sub">
          {project.client}
          {project.agencia ? ` · ${project.agencia}` : ""}
          {project.director ? ` · Dir. ${project.director}` : ""}
        </span>

        <div className="cl-logos">
          <img className="cl-invertir" src={marca.logo} alt={marca.nombre} />
          {project.logoAgenciaUrl ? (
            <img
              className="cl-invertir"
              src={`/api/cliente/${token}/imagen/logoAgencia`}
              alt={project.agencia}
            />
          ) : null}
          {project.logoClienteUrl ? (
            <img
              className="cl-invertir"
              src={`/api/cliente/${token}/imagen/logoCliente`}
              alt={project.client}
            />
          ) : null}
        </div>
      </header>

      {proxima ? (
        <AhoraMismo
          bloques={proxima.scheduleItems}
          fechaISO={proxima.fechaISO ? proxima.fechaISO.toISOString() : null}
          llegadaCliente={proxima.llegadaCliente}
        />
      ) : null}

      <main className="cl-main">
        {dias.length === 0 ? (
          <div className="cl-bloque">
            <p>La orden de rodaje todavía no está publicada. Te avisaremos en cuanto lo esté.</p>
          </div>
        ) : null}

        {dias.map((dia, i) => (
          <section key={dia.id}>
            <div className="cl-bloque">
              <h2>
                Jornada {i + 1} · {dia.fecha}
              </h2>
              {dia.llegadaCliente ? (
                <>
                  <h3>Te esperamos a las {dia.llegadaCliente}</h3>
                  <p className="cl-dato">
                    El equipo entra antes para montar; a esa hora ya hay algo que ver.
                  </p>
                </>
              ) : null}
              {dia.fechaISO ? (
                <a className="cl-btn" href={`/api/cliente/${token}/${dia.id}.ics`}>
                  Añadir al calendario
                </a>
              ) : null}
            </div>

            {dia.localizaciones.length > 0 ? (
              <div className="cl-bloque">
                <h2>Dónde</h2>
                {dia.localizaciones.map((l) => (
                  <div key={l.id} style={{ marginBottom: 16 }}>
                    <h3>{l.nombre}</h3>
                    {l.direccion ? <p>{l.direccion}</p> : null}
                    {l.parking ? <p className="cl-dato">Parking: {l.parking}</p> : null}
                    {l.accesos ? <p className="cl-dato">Accesos: {l.accesos}</p> : null}
                    {l.mapsUrl ? (
                      <a className="cl-btn" href={l.mapsUrl} target="_blank" rel="noreferrer">
                        Cómo llegar
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {dia.scheduleItems.length > 0 ? (
              <div className="cl-bloque">
                <h2>El día</h2>
                {dia.scheduleItems.map((b) => (
                  <div className="cl-fila" key={b.id}>
                    <span className="cl-hora">{b.hora}</span>
                    <span>{b.descripcion}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {dia.traslados.length > 0 ? (
              <div className="cl-bloque">
                <h2>Traslados</h2>
                {dia.traslados.map((t) => (
                  <div className="cl-fila" key={t.id}>
                    <span className="cl-hora">{t.hora}</span>
                    <span>
                      {t.origen} → {t.destino}
                      {t.vehiculo ? <span className="cl-dato"> · {t.vehiculo}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {dia.cateringDesayuno || dia.cateringComida || restriccionesAnonimas.length > 0 ? (
              <div className="cl-bloque">
                <h2>Catering</h2>
                {dia.cateringDesayuno ? <p>Desayuno · {dia.cateringDesayuno}</p> : null}
                {dia.cateringComida ? <p>Comida · {dia.cateringComida}</p> : null}
                {dia.cateringNotas ? <p className="cl-dato">{dia.cateringNotas}</p> : null}
                {restriccionesAnonimas.length > 0 ? (
                  <div className="cl-aviso">
                    <p style={{ marginBottom: 4 }}>
                      <strong>
                        {restriccionesAnonimas.length}{" "}
                        {restriccionesAnonimas.length === 1 ? "menú especial" : "menús especiales"}
                      </strong>
                    </p>
                    <p className="cl-dato">{restriccionesAnonimas.join(" · ")}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {dia.contactoSet || dia.contactoSetTel ? (
              <div className="cl-bloque">
                <h2>Cualquier cosa</h2>
                <h3>{dia.contactoSet ?? "Producción en set"}</h3>
                {dia.contactoSetTel ? (
                  <a className="cl-btn solido" href={`tel:${dia.contactoSetTel}`}>
                    Llamar {dia.contactoSetTel}
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>
        ))}
      </main>

      <footer className="cl-pie">
        {marca.nombre} · {project.code}
      </footer>
    </div>
  );
}
