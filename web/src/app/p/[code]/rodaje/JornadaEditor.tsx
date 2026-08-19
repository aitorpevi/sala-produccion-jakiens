import {
  guardarJornadaAction,
  borrarJornadaAction,
  anadirBloqueAction,
  borrarBloqueAction,
  guardarCallTimesAction,
  avisarOrdenAction,
  anadirLocalizacionAction,
  guardarLocalizacionAction,
  borrarLocalizacionAction,
  anadirTrasladoAction,
  borrarTrasladoAction,
  guardarSeguridadCateringAction,
} from "./actions";

/**
 * Editor de una jornada de rodaje. Vive aparte de la página porque una jornada
 * tiene siete bloques (datos, localizaciones, orden de trabajo, traslados,
 * convocatoria, seguridad y catering) y todo junto era ilegible.
 */

type Loc = {
  id: string;
  nombre: string;
  direccion: string | null;
  mapsUrl: string | null;
  parking: string | null;
  accesos: string | null;
  notas: string | null;
};

type Tras = {
  id: string;
  hora: string;
  origen: string;
  destino: string;
  vehiculo: string | null;
  conductor: string | null;
  ocupantes: string | null;
};

export type JornadaConTodo = {
  id: string;
  fecha: string;
  fechaISO: Date | null;
  localizacion: string | null;
  primeraHora: string | null;
  amanecer: string | null;
  ocaso: string | null;
  meteo: string | null;
  puntoEncuentro: string | null;
  contactoSet: string | null;
  contactoSetTel: string | null;
  llegadaCliente: string | null;
  hospitalNombre: string | null;
  hospitalDireccion: string | null;
  hospitalTelefono: string | null;
  hospitalMapsUrl: string | null;
  cateringDesayuno: string | null;
  cateringComida: string | null;
  cateringNotas: string | null;
  scheduleItems: { id: string; hora: string; descripcion: string }[];
  callTimes: { id: string; projectMemberId: string; hora: string }[];
  localizaciones: Loc[];
  traslados: Tras[];
};

export type MiembroConPersona = {
  id: string;
  role: string;
  callTime: string | null;
  person: { name: string };
};

export function JornadaEditor({
  code,
  indice,
  dia,
  miembros,
}: {
  code: string;
  indice: number;
  dia: JornadaConTodo;
  miembros: MiembroConPersona[];
}) {
  const hid = (
    <>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="callSheetDayId" value={dia.id} />
    </>
  );

  return (
    <div className="panel">
      <div className="phdr">
        <h3>
          Jornada {indice} · {dia.fecha}
        </h3>
        <span className="status ok">
          <span className="s-dot"></span>
          {dia.callTimes.length} convocados
        </span>
      </div>

      <div className="body-copy">
        {/* ---------- Datos de la jornada ---------- */}
        <form action={guardarJornadaAction} className="fgrid">
          {hid}
          <div className="field">
            <label htmlFor={`fecha-${dia.id}`}>Fecha (como se lee)</label>
            <input id={`fecha-${dia.id}`} name="fecha" defaultValue={dia.fecha} />
          </div>
          <div className="field">
            <label htmlFor={`fiso-${dia.id}`}>Fecha real</label>
            <input
              id={`fiso-${dia.id}`}
              name="fechaISO"
              type="date"
              defaultValue={dia.fechaISO ? dia.fechaISO.toISOString().slice(0, 10) : ""}
            />
          </div>
          <div className="field">
            <label htmlFor={`enc-${dia.id}`}>Punto de encuentro</label>
            <input
              id={`enc-${dia.id}`}
              name="puntoEncuentro"
              defaultValue={dia.puntoEncuentro ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor={`hora-in-${dia.id}`}>Entrada general</label>
            <input
              id={`hora-in-${dia.id}`}
              name="primeraHora"
              defaultValue={dia.primeraHora ?? ""}
              placeholder="07:00"
            />
          </div>
          <div className="field">
            <label htmlFor={`cont-${dia.id}`}>Producción en set</label>
            <input
              id={`cont-${dia.id}`}
              name="contactoSet"
              defaultValue={dia.contactoSet ?? ""}
              placeholder="Nombre"
            />
          </div>
          <div className="field">
            <label htmlFor={`amanecer-${dia.id}`}>Amanecer</label>
            <input id={`amanecer-${dia.id}`} name="amanecer" defaultValue={dia.amanecer ?? ""} />
          </div>
          <div className="field">
            <label htmlFor={`ocaso-${dia.id}`}>Ocaso</label>
            <input id={`ocaso-${dia.id}`} name="ocaso" defaultValue={dia.ocaso ?? ""} />
          </div>
          <div className="field full">
            <label htmlFor={`meteo-${dia.id}`}>Meteo</label>
            <input id={`meteo-${dia.id}`} name="meteo" defaultValue={dia.meteo ?? ""} />
          </div>
          <div className="field">
            <button className="btn solid" type="submit">
              Guardar jornada
            </button>
          </div>
        </form>

        {/* ---------- Localizaciones ---------- */}
        <h4 style={{ marginTop: 26, marginBottom: 6 }}>Localizaciones</h4>
        {dia.localizaciones.length === 0 ? (
          <p className="hint">Ninguna todavía.</p>
        ) : (
          dia.localizaciones.map((l) => (
            <form action={guardarLocalizacionAction} className="fgrid" key={l.id} style={{ marginBottom: 14 }}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="localizacionId" value={l.id} />
              <div className="field">
                <label htmlFor={`ln-${l.id}`}>Nombre</label>
                <input id={`ln-${l.id}`} name="nombre" defaultValue={l.nombre} />
              </div>
              <div className="field">
                <label htmlFor={`ld-${l.id}`}>Dirección</label>
                <input id={`ld-${l.id}`} name="direccion" defaultValue={l.direccion ?? ""} />
              </div>
              <div className="field">
                <label htmlFor={`lm-${l.id}`}>Enlace a Google Maps</label>
                <input id={`lm-${l.id}`} name="mapsUrl" defaultValue={l.mapsUrl ?? ""} />
              </div>
              <div className="field">
                <label htmlFor={`lp-${l.id}`}>Parking</label>
                <input id={`lp-${l.id}`} name="parking" defaultValue={l.parking ?? ""} />
              </div>
              <div className="field full">
                <label htmlFor={`la-${l.id}`}>Accesos · puerta, códigos, a quién preguntar</label>
                <input id={`la-${l.id}`} name="accesos" defaultValue={l.accesos ?? ""} />
              </div>
              <div className="field full">
                <label htmlFor={`lx-${l.id}`}>Notas</label>
                <input id={`lx-${l.id}`} name="notas" defaultValue={l.notas ?? ""} />
              </div>
              <div className="field">
                <button className="btn" type="submit" formAction={guardarLocalizacionAction}>
                  Guardar
                </button>
              </div>
              <div className="field">
                <button className="btn ghost" type="submit" formAction={borrarLocalizacionAction}>
                  Quitar localización
                </button>
              </div>
            </form>
          ))
        )}
        <form action={anadirLocalizacionAction} className="fgrid">
          {hid}
          <div className="field">
            <label htmlFor={`nl-${dia.id}`}>Añadir localización</label>
            <input id={`nl-${dia.id}`} name="nombre" placeholder="Nave de Paterna" />
          </div>
          <div className="field">
            <button className="btn" type="submit">
              Añadir
            </button>
          </div>
        </form>

        {/* ---------- Orden de trabajo ---------- */}
        <h4 style={{ marginTop: 26, marginBottom: 6 }}>Orden de trabajo</h4>
        {dia.scheduleItems.length === 0 ? (
          <p className="hint">Sin bloques todavía.</p>
        ) : (
          dia.scheduleItems.map((b) => (
            <div className="file" key={b.id}>
              <div className="fmeta">
                <div className="fn">
                  {b.hora} · {b.descripcion}
                </div>
              </div>
              <form action={borrarBloqueAction}>
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="scheduleItemId" value={b.id} />
                <button className="btn ghost" type="submit">
                  Quitar
                </button>
              </form>
            </div>
          ))
        )}
        <form action={anadirBloqueAction} className="fgrid" style={{ marginTop: 10 }}>
          {hid}
          <div className="field">
            <label htmlFor={`bh-${dia.id}`}>Hora</label>
            <input id={`bh-${dia.id}`} name="hora" placeholder="07:30" />
          </div>
          <div className="field">
            <label htmlFor={`bd-${dia.id}`}>Qué pasa</label>
            <input id={`bd-${dia.id}`} name="descripcion" placeholder="Desayuno y montaje" />
          </div>
          <div className="field">
            <button className="btn" type="submit">
              Añadir bloque
            </button>
          </div>
        </form>

        {/* ---------- Traslados ---------- */}
        <h4 style={{ marginTop: 26, marginBottom: 6 }}>Orden de traslados</h4>
        {dia.traslados.length === 0 ? (
          <p className="hint">Sin traslados. Si no los hay, esta sección no aparecerá en la orden.</p>
        ) : (
          dia.traslados.map((t) => (
            <div className="file" key={t.id}>
              <div className="fmeta">
                <div className="fn">
                  {t.hora} · {t.origen} → {t.destino}
                </div>
                <div className="fd">
                  {[t.vehiculo, t.conductor ? `conduce ${t.conductor}` : null, t.ocupantes]
                    .filter(Boolean)
                    .join(" · ") || "sin detalles"}
                </div>
              </div>
              <form action={borrarTrasladoAction}>
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="trasladoId" value={t.id} />
                <button className="btn ghost" type="submit">
                  Quitar
                </button>
              </form>
            </div>
          ))
        )}
        <form action={anadirTrasladoAction} className="fgrid" style={{ marginTop: 10 }}>
          {hid}
          <div className="field">
            <label htmlFor={`th-${dia.id}`}>Hora</label>
            <input id={`th-${dia.id}`} name="hora" placeholder="06:30" />
          </div>
          <div className="field">
            <label htmlFor={`to-${dia.id}`}>Origen</label>
            <input id={`to-${dia.id}`} name="origen" placeholder="Oficina" />
          </div>
          <div className="field">
            <label htmlFor={`td-${dia.id}`}>Destino</label>
            <input id={`td-${dia.id}`} name="destino" placeholder="Nave de Paterna" />
          </div>
          <div className="field">
            <label htmlFor={`tv-${dia.id}`}>Vehículo</label>
            <input id={`tv-${dia.id}`} name="vehiculo" placeholder="Furgoneta 1" />
          </div>
          <div className="field">
            <label htmlFor={`tc-${dia.id}`}>Conductor</label>
            <input id={`tc-${dia.id}`} name="conductor" />
          </div>
          <div className="field">
            <label htmlFor={`tp-${dia.id}`}>Quién va</label>
            <input id={`tp-${dia.id}`} name="ocupantes" placeholder="Equipo de arte + Clara" />
          </div>
          <div className="field">
            <button className="btn" type="submit">
              Añadir traslado
            </button>
          </div>
        </form>

        {/* ---------- Seguridad, catering y cliente ---------- */}
        <h4 style={{ marginTop: 26, marginBottom: 6 }}>Seguridad, catering y cliente</h4>
        <form action={guardarSeguridadCateringAction} className="fgrid">
          {hid}
          <div className="field">
            <label htmlFor={`hn-${dia.id}`}>Hospital más cercano</label>
            <input id={`hn-${dia.id}`} name="hospitalNombre" defaultValue={dia.hospitalNombre ?? ""} />
          </div>
          <div className="field">
            <label htmlFor={`hd-${dia.id}`}>Dirección del hospital</label>
            <input
              id={`hd-${dia.id}`}
              name="hospitalDireccion"
              defaultValue={dia.hospitalDireccion ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor={`ht-${dia.id}`}>Teléfono del hospital</label>
            <input
              id={`ht-${dia.id}`}
              name="hospitalTelefono"
              defaultValue={dia.hospitalTelefono ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor={`hm-${dia.id}`}>Hospital en Maps</label>
            <input
              id={`hm-${dia.id}`}
              name="hospitalMapsUrl"
              defaultValue={dia.hospitalMapsUrl ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor={`cd-${dia.id}`}>Desayuno</label>
            <input
              id={`cd-${dia.id}`}
              name="cateringDesayuno"
              defaultValue={dia.cateringDesayuno ?? ""}
              placeholder="07:00 en set"
            />
          </div>
          <div className="field">
            <label htmlFor={`cc-${dia.id}`}>Comida</label>
            <input
              id={`cc-${dia.id}`}
              name="cateringComida"
              defaultValue={dia.cateringComida ?? ""}
              placeholder="14:00"
            />
          </div>
          <div className="field full">
            <label htmlFor={`cn-${dia.id}`}>Notas de catering</label>
            <input id={`cn-${dia.id}`} name="cateringNotas" defaultValue={dia.cateringNotas ?? ""} />
          </div>
          <div className="field">
            <label htmlFor={`cst-${dia.id}`}>Teléfono de producción en set</label>
            <input
              id={`cst-${dia.id}`}
              name="contactoSetTel"
              defaultValue={dia.contactoSetTel ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor={`lc-${dia.id}`}>Llegada sugerida de cliente y agencia</label>
            <input
              id={`lc-${dia.id}`}
              name="llegadaCliente"
              defaultValue={dia.llegadaCliente ?? ""}
              placeholder="11:00"
            />
          </div>
          <div className="field">
            <button className="btn solid" type="submit">
              Guardar
            </button>
          </div>
        </form>
        <p className="hint" style={{ marginTop: 6 }}>
          El teléfono de producción en set es el único que ven colaboradores, cliente y agencia.
        </p>

        {/* ---------- Convocatoria ---------- */}
        <h4 style={{ marginTop: 26, marginBottom: 6 }}>Convocatoria</h4>
        <p className="hint">Deja la hora en blanco para quien no esté convocado esta jornada.</p>
        <form action={guardarCallTimesAction} style={{ marginTop: 10 }}>
          {hid}
          <div className="fgrid">
            {miembros.map((m) => {
              const ct = dia.callTimes.find((c) => c.projectMemberId === m.id);
              return (
                <div className="field" key={m.id}>
                  <label htmlFor={`ct-${dia.id}-${m.id}`}>
                    {m.person.name} · {m.role}
                  </label>
                  <input
                    id={`ct-${dia.id}-${m.id}`}
                    name={`hora-${m.id}`}
                    defaultValue={ct?.hora ?? ""}
                    placeholder={m.callTime ?? "—"}
                  />
                </div>
              );
            })}
          </div>
          <div className="form-foot">
            <span className="hint">
              {miembros.length === 0
                ? "Añade equipo en la fase 01 para poder convocarlo."
                : `${miembros.length} personas en el equipo`}
            </span>
            <button className="btn solid" type="submit">
              Guardar convocatoria
            </button>
          </div>
        </form>

        <div className="form-foot" style={{ marginTop: 20 }}>
          <form action={borrarJornadaAction}>
            {hid}
            <button className="btn ghost" type="submit">
              Eliminar jornada
            </button>
          </form>
          <form action={avisarOrdenAction}>
            {hid}
            <button className="btn" type="submit">
              Avisar en Slack
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
