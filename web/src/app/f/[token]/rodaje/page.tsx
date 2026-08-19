import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMemberByToken } from "@/lib/access";
import { AppShell, ModHead } from "@/components/AppShell";
import { PHASES, phaseAllowedForMember } from "@/lib/phases";

export default async function CollaboratorRodajePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await requireMemberByToken(token);
  if (!phaseAllowedForMember(member, "rodaje")) notFound();
  const allowedPhases = PHASES.map((p) => p.key).filter((k) => phaseAllowedForMember(member, k));

  const dias = await db.callSheetDay.findMany({
    where: { projectId: member.projectId },
    include: {
      scheduleItems: { orderBy: { hora: "asc" } },
      callTimes: { include: { projectMember: { include: { person: true } } } },
      localizaciones: { orderBy: { orden: "asc" } },
      traslados: { orderBy: { orden: "asc" } },
    },
    orderBy: { orden: "asc" },
  });

  // Solo las jornadas en las que esta persona está convocada. Mientras no haya
  // ninguna convocatoria cargada se muestran todas, para que al menos vea la
  // localización y el horario general en vez de una pantalla vacía.
  const hayConvocatorias = dias.some((d) => d.callTimes.length > 0);
  const misDias = hayConvocatorias
    ? dias.filter((d) => d.callTimes.some((c) => c.projectMemberId === member.id))
    : dias;

  return (
    <AppShell
      project={member.project}
      basePath={`/f/${token}`}
      currentPhase="rodaje"
      allowedPhases={allowedPhases}
      viewerLabel={
        <>
          <div className="avatar">{member.person.initials}</div>
          <span className="tag">{member.person.name}</span>
        </>
      }
    >
      <ModHead
        step="05"
        title="Rodaje"
        lead="Tu convocatoria, el punto de encuentro y el horario de cada jornada."
        scope={`Vista de ${member.person.name} · ${member.role}`}
      />

      {misDias.length === 0 ? (
        <div className="empty">
          <span className="em-mono">Sin jornadas</span>
          La orden de rodaje todavía no está publicada. Producción te avisará.
        </div>
      ) : null}

      {misDias.map((dia, i) => {
        const mia = dia.callTimes.find((c) => c.projectMemberId === member.id);
        const miHora = mia?.hora ?? member.callTime;

        return (
          <div key={dia.id}>
            <div className="panel">
              <div className="phdr">
                <h3>
                  Jornada {i + 1} · {dia.fecha}
                </h3>
                <span className="status ok">
                  <span className="s-dot"></span>
                  {miHora ? `Tu hora: ${miHora}` : "Hora por confirmar"}
                </span>
              </div>
              <div className="body-copy">
                <p>
                  <strong>Punto de encuentro:</strong>{" "}
                  {dia.puntoEncuentro ?? dia.localizaciones[0]?.nombre ?? "por confirmar"}
                </p>
                {dia.contactoSet || dia.contactoSetTel ? (
                  <p>
                    <strong>Producción en set:</strong> {dia.contactoSet ?? "—"}
                    {dia.contactoSetTel ? (
                      <>
                        {" · "}
                        <a href={`tel:${dia.contactoSetTel}`}>{dia.contactoSetTel}</a>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <p className="hint" style={{ marginTop: 8 }}>
                  {[
                    dia.primeraHora ? `Entrada general ${dia.primeraHora}` : null,
                    dia.amanecer ? `Amanece ${dia.amanecer}` : null,
                    dia.ocaso ? `Anochece ${dia.ocaso}` : null,
                    dia.meteo,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos de horario todavía"}
                </p>
              </div>
            </div>

            {dia.localizaciones.length > 0 ? (
              <div className="panel">
                <div className="phdr">
                  <h3>Localizaciones</h3>
                  <span className="tag">{dia.localizaciones.length}</span>
                </div>
                <div className="body-copy">
                  {dia.localizaciones.map((l) => (
                    <div key={l.id} style={{ marginBottom: 14 }}>
                      <p>
                        <strong>{l.nombre}</strong>
                        {l.direccion ? ` · ${l.direccion}` : ""}
                      </p>
                      {l.accesos ? <p className="hint">Accesos: {l.accesos}</p> : null}
                      {l.parking ? <p className="hint">Parking: {l.parking}</p> : null}
                      {l.notas ? <p className="hint">{l.notas}</p> : null}
                      {l.mapsUrl ? (
                        <p style={{ marginTop: 6 }}>
                          <a className="btn" href={l.mapsUrl} target="_blank" rel="noreferrer">
                            Abrir en Maps
                          </a>
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {dia.traslados.length > 0 ? (
              <div className="panel">
                <div className="phdr">
                  <h3>Traslados</h3>
                  <span className="tag">{dia.traslados.length}</span>
                </div>
                <div className="body-copy">
                  {dia.traslados.map((t) => (
                    <div className="file" key={t.id}>
                      <div className="fmeta">
                        <div className="fn">
                          {t.hora} · {t.origen} → {t.destino}
                        </div>
                        <div className="fd">
                          {[t.vehiculo, t.conductor ? `conduce ${t.conductor}` : null, t.ocupantes]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {dia.cateringDesayuno || dia.cateringComida || dia.cateringNotas ? (
              <div className="panel">
                <div className="phdr">
                  <h3>Catering</h3>
                </div>
                <div className="body-copy">
                  {dia.cateringDesayuno ? <p>Desayuno: {dia.cateringDesayuno}</p> : null}
                  {dia.cateringComida ? <p>Comida: {dia.cateringComida}</p> : null}
                  {dia.cateringNotas ? <p className="hint">{dia.cateringNotas}</p> : null}
                  <p className="hint" style={{ marginTop: 6 }}>
                    Si tienes alguna alergia o restricción y no se la has dicho a producción,
                    avísales antes del rodaje.
                  </p>
                </div>
              </div>
            ) : null}

            {dia.hospitalNombre ? (
              <div className="panel">
                <div className="phdr">
                  <h3>Hospital más cercano</h3>
                  <span className="tag">emergencias</span>
                </div>
                <div className="body-copy">
                  <p>
                    <strong>{dia.hospitalNombre}</strong>
                    {dia.hospitalDireccion ? ` · ${dia.hospitalDireccion}` : ""}
                  </p>
                  <p style={{ marginTop: 6 }}>
                    {dia.hospitalTelefono ? (
                      <a className="btn" href={`tel:${dia.hospitalTelefono}`}>
                        Llamar {dia.hospitalTelefono}
                      </a>
                    ) : null}{" "}
                    {dia.hospitalMapsUrl ? (
                      <a className="btn ghost" href={dia.hospitalMapsUrl} target="_blank" rel="noreferrer">
                        Cómo llegar
                      </a>
                    ) : null}
                  </p>
                  <p className="hint" style={{ marginTop: 6 }}>
                    Emergencias: 112
                  </p>
                </div>
              </div>
            ) : null}

            {dia.scheduleItems.length > 0 ? (
              <div className="panel">
                <div className="phdr">
                  <h3>Orden de trabajo</h3>
                  <span className="tag">{dia.fecha}</span>
                </div>
                <div className="body-copy">
                  {dia.scheduleItems.map((b) => (
                    <div className="file" key={b.id}>
                      <div className="fmeta">
                        <div className="fn">
                          {b.hora} · {b.descripcion}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {dia.callTimes.length > 0 ? (
              <div className="panel">
                <div className="phdr">
                  <h3>Convocatoria del equipo</h3>
                  <span className="tag">{dia.callTimes.length} personas</span>
                </div>
                <div className="body-copy">
                  {[...dia.callTimes]
                    .sort((a, b) => a.hora.localeCompare(b.hora))
                    .map((c) => {
                      const esMio = c.projectMemberId === member.id;
                      return (
                        <div
                          className="file"
                          key={c.id}
                          style={esMio ? { borderLeft: "3px solid var(--ink)" } : undefined}
                        >
                          <div className="fmeta">
                            <div className="fn">
                              {c.hora} · {c.projectMember.person.name}
                              {esMio ? " (tú)" : ""}
                            </div>
                            <div className="fd">{c.projectMember.role}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </AppShell>
  );
}
