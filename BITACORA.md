# Bitácora

Una entrada por sesión de trabajo, la más reciente arriba. Sirve para que la
sesión del otro ordenador sepa qué pasó sin tener que reconstruirlo del historial
de commits. Qué se hizo, qué se decidió y qué queda abierto.

Las decisiones que siguen vigentes se resumen además en `CLAUDE.md`; aquí queda
el relato con su fecha.

---

## 2026-09-01 · MacBook · Paso 3: equipo por etapa y presupuesto de venta (rama `gestor-proyectos`)

**Esquema** (migración `20260901160000_asignaciones_y_presupuesto_venta`, solo
añade — se puede aplicar con la app en marcha):

- `AsignacionEtapa` — quién del equipo interno trabaja un proyecto **en qué
  etapa**, con rol libre y un flag `responsable` para el lead de la etapa. La
  clave única es `(proyecto, persona, etapa)`: reasignar actualiza el rol en vez
  de fallar, porque el caso real es "y además lleva la cotización".
- `PresupuestoVenta` — lo que se cotiza al cliente, con importe, estado, notas y
  quién lo tocó por última vez.
- `StaffUser.accesoPresupuestoVenta` — entra en `false` para todos y se decide a
  mano en el seed. Nadie hereda este acceso de su nivel.

**Por qué el permiso de venta va por usuario y no por `tier`**: Carmen es
LOGISTICS, sí ve costes para negociar tarifas y no ve lo que cobramos. Meterlo en
el tier obligaría a inventar un nivel por cada combinación. Hoy lo tienen Javier,
Aitor, Aina, Chiara y Maca.

**El dato confidencial ni se consulta** cuando quien mira no tiene permiso
(`include: { presupuestoVenta: staff.accesoPresupuestoVenta }`). Traerlo y luego
no pintarlo lo dejaría en el HTML que sale del servidor.

**Corregido de la lista pendiente**: `veCostes` en `p/[code]/prepro/page.tsx`
pasa de `tier === "FULL"` a incluir también `LOGISTICS`, como decía
`REQUISITOS.md` §9 y confirmó Aitor. Pablo y Carmen ya ven las tarifas por
colaborador.

**Verificado en el navegador**: asignados Javier (responsable) y Miquel a la
etapa de venta de EG-2611, y guardado un presupuesto de 48.500 € en estado
"enviado" —la fecha de envío se sella sola—. Con la cuenta de **Carmen**, el
HTML que devuelve el servidor no contiene ni el importe ni las notas, y el panel
no existe; las asignaciones sí las ve. Un intento de escribir el presupuesto
como Carmen replicando el `ACTION_ID` a pelo dejó el dato intacto (devolvió 500,
así que probablemente Next rechazó la petición antes de llegar a la acción; la
comprobación de permiso está igualmente en la propia acción).

`tsc --noEmit` limpio, `npm run build` completo, lint en los mismos 6 avisos
preexistentes.

**Pendiente / a decidir:**

- **Mikko** es FULL pero no tiene acceso al presupuesto de venta: es dirección
  creativa y no interviene en la cotización. Una línea de cambiar si toca.
- **Jakie** aparece en el equipo de cotización según la descripción del proceso,
  pero no existe como `StaffUser` — no está entre las 11 cuentas del seed.
- Las fechas siguen siendo editables por cualquier nivel, confirmado por Aitor.

---

## 2026-09-01 · MacBook · Paso 2: la etapa de venta (rama `gestor-proyectos`)

Primeras pantallas del gestor. Un proyecto ya puede existir antes de ganarse.

**Rutas nuevas**, todas bajo `/gestor` y no bajo `/p`, para no mezclar los dos
ejes: `/p` es la sala de producción y sus siete fases; `/gestor` es el eje de
negocio y sus cinco etapas.

- `/gestor` — todos los proyectos agrupados por etapa, con el próximo hito de
  cada uno. Lo ve **todo** el equipo interno, incluidos `POSTPRODUCTION`, que
  hasta ahora no veían nada de venta pese a preparar las presentaciones.
- `/gestor/nueva` — alta de oportunidad. Pide solo lo que se sabe el día que
  entra el brief: cliente, nombre, código, agencia, realizador propuesto,
  formato, fecha de entrega de la propuesta y qué piden. Solo `FULL`.
- `/gestor/[code]` — ficha: cabecera, recorrido de las cinco etapas, lista de
  fechas con alta y baja, y el bloque de situación.

**La sala de producción queda cerrada mientras el proyecto está en venta.** Se
comprueba en `requireStaffAccess`, no ocultando el enlace: quien tenga la URL
guardada la va a usar. `/p` tampoco lista oportunidades.

**El GO** (`marcarGanadoAction`) es el punto donde el gestor entrega el testigo:
pasa el proyecto a PREPRODUCCION/ACTIVO, crea las siete `PhaseState` con
`skipDuplicates` y redirige a la fase Equipo. `/p/nuevo` sigue existiendo para
los proyectos que entran ya ganados sin pasar por venta.

**Primer uso real de la tabla `Hito`**: la fecha de entrega de la propuesta se
guarda como hito de tipo `ENTREGA_PROPUESTA` y criticidad ALTA. Es el primer
`<input type="date">` de la app; el resto de fechas siguen siendo texto libre.
Los hitos derivados (`origen != "manual"`) no se pueden borrar desde la ficha y
se marcan como "Automático", con el motivo en el `title` — esconder el botón
habría dejado a la gente preguntándose si es un fallo.

**Color**: el relleno es de la ETAPA (`src/lib/etapas.ts`), y la urgencia va por
peso y borde, no por color. Dos escalas de color en la misma tarjeta y no se lee
ninguna de las dos.

**Verificado en el navegador**, no solo compilado: alta de oportunidad completa
(EG-2611, Estrella Galicia) con su hito · `/p/EG-2611/equipo` redirige a la ficha
· `/p` no la lista · el GO crea las siete fases y entra en Equipo · con la cuenta
de Carmen (`LOGISTICS`) se ve el gestor pero no el botón de nueva oportunidad, y
`/gestor/nueva` a pelo redirige. `tsc --noEmit` limpio y `npm run build`
completo; los 6 avisos de lint que quedan están todos en archivos no tocados.

**En la base local** queda EG-2611 como oportunidad de ejemplo, para poder
clicar el flujo. No está en el seed.

**Decisión que conviene revisar**: hoy cualquier nivel puede añadir y quitar
fechas de cualquier proyecto. Es lo coherente con "cada responsable de fase
nutre su parte", pero hasta que exista la asignación de personas por etapa
(paso 3) no hay forma de acotarlo mejor.

---

## 2026-09-01 · MacBook · Paso 1: hitos, etapa y estado (rama `gestor-proyectos`)

Primer paso de implementación del gestor. Solo modelo de datos y vocabulario: no
hay pantallas nuevas todavía.

**Esquema** (migración `20260901140000_gestor_hitos_y_etapa`, escrita a mano):

- `Etapa` (VENTA · PREPRODUCCION · RODAJE · POSTPRODUCCION · CIERRE) y
  `EstadoProyecto` (OPORTUNIDAD · ACTIVO · PERDIDO · PAUSADO · CERRADO) como
  enums, más `Project.etapa` y `Project.estado`.
- `Project.status` (texto `activo | cerrado`) desaparece. La migración **traduce
  el dato antes de borrar la columna**: `prisma migrate dev` proponía un
  `DROP COLUMN` a secas que se habría llevado por delante el estado de todos los
  proyectos.
- Tabla `Hito` con `fecha`/`fechaFin` como `DATE` real, `tipo`, `criticidad`,
  `responsable` (StaffUser) y `origen`/`origenId` para los derivados.
  Índices por `fecha` y por `(projectId, fecha)`.

**Por qué la etapa de los proyectos existentes se queda en PREPRODUCCION**: no se
puede deducir del dato que hay. `PhaseState` se escribe al crear el proyecto y
después nunca se actualiza, así que todos figuran eternamente en "equipo". Lo
único seguro es que ninguno está en VENTA (hasta ahora no había forma de
registrar una oportunidad). Los cerrados van a CIERRE; el resto se corrigen a
mano desde el gestor cuando exista la pantalla.

**Código nuevo:**

- `src/lib/etapas.ts` — las cinco etapas con su color, y los estados con si
  cuentan como vivos. PAUSADO cuenta como vivo: puede volver la semana que viene.
- `src/lib/hitos.ts` — tipos de hito, criticidad, y `urgencia()` separada de
  `criticidad` a propósito (una cambia sola cada día, la otra no; mezclarlas en
  un color impide ver las dos).
- `scripts/importar-hitos.ts` — convierte las fechas de texto en hitos. Corre en
  simulación por defecto; escribe con `--aplicar`. Es idempotente.

**El año era el problema real del parseo.** "14 JUL" no dice de qué año es. Se
deduce del año del propio texto, si no del `shootLabel`, si no del `createdAt`; y
si la fecha cae más de tres meses antes del alta se asume el año siguiente (un
proyecto dado de alta en diciembre para rodar en enero). Lo que no se puede leer
**no se inventa**: se lista para revisarlo a mano. Una fecha inventada en un
calendario es peor que un hueco, porque el hueco se ve.

**Verificado:** migración aplicada preservando el estado, importación en seco y
aplicada (6 hitos de CHB-2607, años inferidos bien), segunda pasada idempotente,
`tsc --noEmit` limpio, `npm run build` completo, y en el navegador tanto el
listado de activos como la rama de archivados (probando con estado PERDIDO y
devolviéndolo después). Los avisos de `npm run lint` son todos preexistentes en
archivos no tocados.

**Pendiente que ha salido por el camino:** la barra de fases del `AppShell` lee
la constante `PHASE_STATE` en vez de la tabla `PhaseState`, así que todos los
proyectos muestran las mismas fases en el mismo estado. La tabla se escribe y no
se lee nunca.

---

## 2026-09-01 · MacBook · Diseño del Gestor de Proyectos y puesta a punto del portátil

**Contexto.** Primera sesión desde el MacBook (hasta ahora todo el desarrollo
venía del ordenador fijo). El objetivo era diseñar un tercer módulo, el **gestor
de proyectos**: ver todos los proyectos por etapa, las fechas importantes de cada
uno y quién trabaja en cada fase.

**Decisiones de diseño** (detalle en `CLAUDE.md`):

1. El gestor no es una app nueva. Son rutas nuevas sobre las mismas tablas de
   este repo. Descartada cualquier sincronización entre herramientas.
2. Hay **dos ejes de fase** y no son el mismo: la etapa de negocio (5, empieza en
   venta) y la fase operativa del producer (7, empieza tras el GO). Se propone
   añadir `Project.etapa` y dejar `PhaseState` intacto.
3. El calendario maestro necesita **fechas reales**. Se propone una tabla `Hito`
   con `DateTime` como fuente de verdad, en vez de migrar los campos de texto.
4. `Project.status` se queda corto con solo `activo | cerrado`. Con venta hacen
   falta al menos `oportunidad`, `ganado`, `perdido`, `pausado`, `cerrado`. Los
   proyectos perdidos se archivan y se consultan, no desaparecen.
5. Colores del calendario: **etapa** al relleno, **proyecto** como código corto
   (no color, no escala a 20 proyectos), **urgencia** como tratamiento del borde,
   y el **rodaje** como franja horizontal que bloquea el día, no como tarjeta.

**Hallazgos en el código:**

- `src/app/p/[code]/prepro/page.tsx:41` tiene `const veCostes = staff.tier === "FULL"`,
  pero `REQUISITOS.md` §9 dice que Carmen y Pablo (`LOGISTICS`) deben ver los
  presupuestos individuales por colaborador para negociar tarifas. Confirmado con
  Aitor que manda el documento: **el código está de más y hay que corregirlo.**
- El presupuesto **de venta** (lo que se cobra al cliente) no existe en el modelo.
  Todo lo que hay es coste. Necesita objeto propio con su propia ACL: Carmen ve
  coste, no ve venta.
- `POSTPRODUCTION` (Malo, Miquel, Lungo) no tiene acceso a nada de venta, pero en
  la práctica preparan presentaciones y tratamientos en esa etapa. El gestor
  necesita su propia matriz de acceso por etapa.
- `REQUISITOS.md` §11 deja marcado como supuesto pendiente que **nadie está
  asignado a ningún proyecto**: cualquiera del equipo interno los ve todos. Sin
  resolver eso no hay pantalla "Mi trabajo".
- El `README` documenta 3 variables de entorno; el código usa 8.

**Puesta a punto del MacBook** (estaba en blanco, sin Node ni Homebrew):

- Node 24.20.0 LTS instalado en `~/.local/node` desde el tarball oficial de
  nodejs.org, con checksum verificado. Sin tocar el sistema y sin `sudo`. Añadido
  al `PATH` en `~/.zshrc`.
- Dependencias instaladas, Postgres local levantado con `npx prisma dev --name local`,
  16 migraciones aplicadas y seed cargado.
- `.env` local creado con secretos generados solo para desarrollo. Los de
  producción siguen únicamente en Vercel y no se han tocado.
- Verificado end-to-end: login como `aitor@jakiens.com` y listado de proyectos
  con CHB-2607. Sin errores de servidor.
- Identidad de Git configurada en este repo como `APV <aitor@jakiens.com>`, igual
  que los commits anteriores.

**Queda abierto:**

- [ ] Nada del gestor está implementado todavía — esta sesión fue diseño y setup.
- [ ] Orden acordado: (1) `Hito` + `etapa` + `status` ampliado, (2) etapa de venta
      con ficha mínima, (3) asignación de personas por etapa y `PresupuestoVenta`,
      (4) calendario maestro con aviso de solapes, (5) "Mi trabajo" e inbox.
- [ ] Corregir `veCostes` en prepro para que `LOGISTICS` vea costes por colaborador.
- [ ] Decidir si el login pasa a Google Workspace (`hd=jakiens.com`). No afecta a
      los accesos por token de externos ni de cliente.
- [ ] Poner a salvo `DATOS_PERSONALES_KEY` fuera de Vercel.
- [ ] Actualizar el `README` con las 8 variables de entorno reales.
