/**
 * Mapa de la arquitectura del cerebro, con volúmenes reales.
 *
 * Se dibuja con los datos de verdad y no como esquema fijo: un diagrama de
 * arquitectura que no se actualiza miente a los seis meses. Aquí, si una fuente
 * deja de traer datos, su barra se queda plana y se ve.
 *
 * SVG a mano y sin librería de gráficos, por dos motivos. Uno, esto es un
 * diagrama de flujo con una barra de magnitud, no un gráfico estadístico: una
 * librería no aporta nada y añade peso. Dos, con una semana de histórico
 * cualquier curva mentiría más de lo que informa. Cuando haya meses de datos,
 * las series temporales sí pedirán herramienta.
 *
 * Color: azul secuencial para el volumen (magnitud) y nada más. El estado va en
 * texto, no en color — un semáforo rojo/verde es indistinguible para daltonismo
 * deuteranope, comprobado con el validador (ΔE 2,5).
 */

const NOMBRE: Record<string, string> = {
  WIKIPEDIA: "Wikipedia",
  GDELT: "GDELT",
  BLUESKY: "Bluesky · cuentas",
  BLUESKY_FEED: "Bluesky · feeds",
  BLUESKY_TRENDS: "Bluesky · tendencias",
  HACKERNEWS: "Hacker News",
  RSS: "Medios y newsletters",
  REDDIT: "Reddit",
};

const QUE_APORTA: Record<string, string> = {
  WIKIPEDIA: "Interés por tema, con serie diaria",
  GDELT: "Noticia global con tono",
  BLUESKY: "Voz de gente concreta",
  BLUESKY_FEED: "Conversación temática",
  BLUESKY_TRENDS: "Qué sube y qué se enfría",
  HACKERNEWS: "Señal temprana de tecnología",
  RSS: "Criterio editorial ya filtrado",
  REDDIT: "Conversación de nicho",
};

export type FilaFuente = {
  fuente: string;
  senales: number;
  vigilados: number;
  caida: boolean;
};

export function MapaCerebro({
  fuentes,
  totalSenales,
  verticales,
}: {
  fuentes: FilaFuente[];
  totalSenales: number;
  verticales: { vertical: string; n: number }[];
}) {
  const maximo = Math.max(1, ...fuentes.map((f) => f.senales));

  // 40 y no 30: con filas más juntas el nombre de la fuente pisaba su
  // descripción. Medido sobre el render real, no a ojo.
  const filaAlto = 40;
  const xTexto = 2; // margen: a x=0 los glifos se salían del lienzo
  const alto = fuentes.length * filaAlto + 44;
  const xEtiqueta = 168;
  const anchoBarra = 150;
  const xBarra = xEtiqueta + 12;
  const xProceso = xBarra + anchoBarra + 54;

  return (
    <div className="panel">
      <div className="phdr">
        <h3>Cómo funciona el cerebro</h3>
        <span className="tag">volúmenes reales</span>
      </div>
      <div className="body-copy">
        <p className="hint">
          Cada fuente entra por su lado con su propio ritmo, se normaliza a un formato común y se
          lee por separado. Si una barra está a cero, esa fuente no está trayendo nada.
        </p>

        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <svg
            viewBox={`0 0 640 ${alto}`}
            width="100%"
            style={{ maxWidth: 640, display: "block" }}
            role="img"
            aria-label={`Arquitectura del cerebro: ${fuentes.length} fuentes, ${totalSenales} señales.`}
          >
            <text x={xTexto} y="12" fontSize="9" fill="#6b6b6b" letterSpacing="1.4">
              FUENTES
            </text>
            <text x={xBarra} y="12" fontSize="9" fill="#6b6b6b" letterSpacing="1.4">
              VOLUMEN
            </text>
            <text x={xProceso} y="12" fontSize="9" fill="#6b6b6b" letterSpacing="1.4">
              PROCESO Y SALIDA
            </text>

            {fuentes.map((f, i) => {
              const y = 34 + i * filaAlto;
              const ancho = f.senales === 0 ? 0 : Math.max(3, (f.senales / maximo) * anchoBarra);
              return (
                <g key={f.fuente}>
                  <text x={xTexto} y={y + 10} fontSize="11" fill="#111111">
                    {NOMBRE[f.fuente] ?? f.fuente}
                  </text>
                  <text x={xTexto} y={y + 26} fontSize="8.5" fill="#8a8a8a">
                    {QUE_APORTA[f.fuente] ?? ""}
                  </text>

                  {/* Carril de fondo, para que el cero se vea como cero y no como ausencia */}
                  <rect
                    x={xBarra}
                    y={y}
                    width={anchoBarra}
                    height="11"
                    rx="2"
                    fill="#eeece8"
                  />
                  {ancho > 0 ? (
                    <rect x={xBarra} y={y} width={ancho} height="11" rx="2" fill="#2a78d6" />
                  ) : null}

                  <text x={xBarra + anchoBarra + 8} y={y + 9} fontSize="10" fill="#52514e">
                    {f.caida ? "sin datos" : f.senales.toLocaleString("es-ES")}
                  </text>

                  {/* Conector hacia el procesado */}
                  <path
                    d={`M ${xBarra + anchoBarra + 44} ${y + 5.5} L ${xProceso - 6} ${y + 5.5}`}
                    stroke="#dcdad6"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Bloque de proceso */}
            <rect
              x={xProceso}
              y="26"
              width="150"
              height={fuentes.length * filaAlto - 6}
              rx="3"
              fill="#f4f2ee"
              stroke="#dcdad6"
            />
            <text x={xProceso + 12} y="48" fontSize="11" fill="#111111">
              Normalización
            </text>
            <text x={xProceso + 12} y="62" fontSize="8.5" fill="#8a8a8a">
              Todo a un formato común
            </text>
            <text x={xProceso + 12} y="84" fontSize="11" fill="#111111">
              Antiduplicados
            </text>
            <text x={xProceso + 12} y="98" fontSize="8.5" fill="#8a8a8a">
              Por origen + id externo
            </text>
            <text x={xProceso + 12} y="120" fontSize="11" fill="#111111">
              Vertical y tema
            </text>
            <text x={xProceso + 12} y="134" fontSize="8.5" fill="#8a8a8a">
              {verticales.length} verticales
            </text>
            <text x={xProceso + 12} y="156" fontSize="11" fill="#111111">
              Lecturas del radar
            </text>
            <text x={xProceso + 12} y="170" fontSize="8.5" fill="#8a8a8a">
              Cada fuente en sus unidades
            </text>
            <text x={xProceso + 12} y={fuentes.length * filaAlto + 16} fontSize="14" fill="#111111">
              {totalSenales.toLocaleString("es-ES")} señales
            </text>
          </svg>
        </div>

        <p className="hint" style={{ marginTop: 12 }}>
          Las barras comparan volumen entre fuentes, no importancia: 186 días-tema de Wikipedia y
          426 posts de Bluesky son cosas distintas. Sirve para ver quién alimenta y quién no.
        </p>
      </div>
    </div>
  );
}
