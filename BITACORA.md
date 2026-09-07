# Bitácora

Una entrada por sesión de trabajo, la más reciente arriba. Sirve para que la
sesión del otro ordenador sepa qué pasó sin tener que reconstruirlo del historial
de commits. Qué se hizo, qué se decidió y qué queda abierto.

Las decisiones que siguen vigentes se resumen además en `CLAUDE.md`; aquí queda
el relato con su fecha.

---

## 2026-09-07 · MacBook · Ficha de venta, clientes, avisos y externos

Resto del feedback de las pantallas del gestor.

**Ficha de proyecto:**

- **Etapa y estado suben al encabezado y se fusionan.** Antes eran dos selectores
  al final de la página que se pisaban: un proyecto en preproducción ES un
  proyecto ganado, y decirlo dos veces solo permitía que un día no coincidieran.
  Ahora hay dos salidas: avanzar de etapa —y salir de VENTA hacia adelante
  dispara el GO entero, siete fases y canal de Slack— o marcarlo como perdido.
  Fuera PAUSADO y OPORTUNIDAD de la interfaz: si está en Venta ya es una
  oportunidad.
- **En venta no se añaden fechas.** Solo vive la entrega de la propuesta, que se
  pone al abrir la oportunidad; el calendario se define en preproducción. En su
  sitio hay una nota que lo explica, en vez de un formulario ausente sin más.
- **Panel de briefing** con los documentos y enlaces, y alta de nuevos.
- **Panel de presupuesto sin importe**: subir el PDF, estado, quién lo prepara y
  los comentarios. Al subir el PDF **se captura la referencia del PPTO de su
  nombre de archivo** y pasa a ser el identificador visible del proyecto. Queda
  editable, por si el archivo venía mal nombrado.
- El identificador del encabezado es `refPresupuesto` si existe, y el código
  interno si no.

**Clientes** (`/gestor/clientes`, niveles FULL y LOGISTICS): ficha por cliente
con CIF, dirección fiscal, contacto y condiciones de pago, su histórico de
proyectos y cuántos se ganaron. Reservado a quien ve dinero: aquí vive
información de contabilidad, no de reparto de trabajo.

**Avisos** en la cabecera, con `<details>` y no un menú con estado: funciona sin
hidratar y no se queda nada abierto al navegar.

**Nivel EXTERNO acotado.** Se aplica en la consulta (`filtroProyectosVisibles`)
y no filtrando en memoria: filtrar después significaría que los proyectos ajenos
ya han pasado por el servidor. A un proyecto que no lleva responde **404 y no
403** — un 403 confirma que existe.

**Descarga de documentos** por `/api/documentos/[id]`, con el permiso comprobado
en el propio endpoint. Una URL de descarga es lo primero que alguien pega en un
chat.

**Verificado en el navegador, con cuatro cuentas distintas:**

- **Aitor** abre la oportunidad "Verano" (McCann · Cerveza Turia) y todo aterriza.
- **Chiara** ve el aviso en la cabecera con su enlace correcto, sube el PPTO y la
  referencia se captura: `PPTO 57A-2026-Kids-Consum-Mascotas`.
- **Carmen** ve la ficha, el briefing y el identificador, pero **no** el panel de
  presupuesto ni los enlaces de descarga; y pidiendo la URL de descarga a pelo
  recibe un 403.
- **Toni** (EXTERNO, asignado solo a IKE-2609) ve un único proyecto en el
  tablero, entra en el suyo, recibe 404 en fichas y salas de producción ajenas, y
  `/gestor/clientes` lo devuelve al tablero.

`tsc` limpio, `build` completo, lint en los 6 avisos preexistentes.

**Sigue pendiente**: desplegar. Hay 8 migraciones en esta rama y el build de
Vercel **no ejecuta migraciones** — fusionar a `main` sin migrar antes rompería
producción. Y los hitos siguen sin estado de "completado".

---

## 2026-09-07 · MacBook · Una sola pantalla, y el alta de oportunidad rehecha

**Las dos pantallas se fusionan.** Propuesta de Aitor, y tenía razón: `/p` y
`/gestor` eran la misma lista de proyectos vista dos veces. Todo lo que salía en
`/p` —preproducción, rodaje, postpo, cierre— ya aparecía en el gestor agrupado
por etapa. `/p` pasa a redirigir (no se borra: hay enlaces sueltos por Slack y en
los marcadores de la gente). La sala de producción de cada proyecto no cambia.

Lo que sí se perdía era la separación por productora, que evitaba leer del tirón
un rodaje de 40k y una pieza de social. Vuelve como **filtro** en la cabecera, no
como dos listas. Los accesos a Radar, Colaboradores, Nuevo proyecto y Nueva
oportunidad se juntan ahí.

**Alta de oportunidad rehecha** con el feedback:

- **Cliente/Agencia** con autocompletado sobre la tabla `Cliente`, y creación
  automática de la ficha si no existía. Pedir un alta previa convertiría en
  trámite lo que tiene que ser un minuto.
- **Marca** con autocompletado sobre las ya usadas.
- **Fuera el código**: se genera solo (`src/lib/codigo.ts`, iniciales + año +
  correlativo). Con una sola palabra coge tres letras, no una: "McCann" daba
  "M-26-001" y eso no distingue nada en cuanto haya dos clientes con la misma
  inicial.
- **Fuera el formato**: viene en el documento de la agencia con más detalle del
  que cabe en una caja.
- **Briefing**: archivo o enlace a Drive/Dropbox/Canva.
- **"Qué piden" → "Comentarios Canva"**.
- **Equipo y responsable** se asignan aquí, no después.
- **"Prepara el presupuesto"**: solo lista a quien puede verlo, y al asignarlo se
  crea un `Aviso` en la app y se intenta el DM de Slack.

**Los avisos se guardan siempre en la base antes de intentar Slack.** Ese orden
importa: un aviso que solo vive en un canal externo se pierde el día que ese
canal falla, y nadie se entera de que se ha perdido.

**Verificado end to end**: creada la oportunidad "Verano" (McCann / Cerveza
Turia) con briefing en Canva, entrega el 19 SEP, Mikko como responsable con
Malo, Miquel y Carmen, y presupuesto asignado a Chiara. El aviso a Chiara se
generó con su enlace. El filtro de Ricorico deja solo Vodafone. El login
aterriza en `/gestor`. `tsc` limpio, `build` completo, lint en los 6 avisos de
siempre.

**Queda de este feedback**: la ficha de proyecto — quitar el alta de fechas en
venta, subir etapa y estado al encabezado fusionados, el panel de presupuesto con
PDF y la captura de `refPresupuesto`, las pantallas de clientes, el punto de
avisos en la cabecera y acotar el nivel `EXTERNO` a sus proyectos.

---

## 2026-09-07 · MacBook · Cimientos del rediseño de venta (rama `gestor-proyectos`)

Primera mitad del feedback de Aitor sobre las pantallas de venta: **el modelo de
datos**. Las pantallas van en la siguiente tanda.

**Decisiones tomadas con él** (las cuatro se preguntaron explícitamente):

1. **Código/ID**: `Project.code` se queda como identificador interno estable que
   vive en la URL y no cambia nunca — está en 112 sitios y 11 carpetas de ruta, y
   si cambiara moriría cualquier enlace ya compartido. La referencia real del
   PPTO ("PPTO 57A-2026-Kids-Consum-Mascotas") va en `refPresupuesto`, se captura
   al subir el PDF y es la que se muestra como identificador.
2. **Producers externos** (Toni, Andrea, Guillem): nivel `EXTERNO` nuevo. Ven las
   mismas fases que un producer de casa, pero solo en los proyectos donde están
   asignados. Ese acotado es de alcance, no de fase: se resuelve en `access.ts`.
3. **Marca anunciante**: campo de texto con autocompletado, no tabla. Promovible
   cuando haga falta medir por marca.
4. **Avisos**: DM de Slack + dentro de la app. **Email descartado**: la app no
   envía ni un correo. El Excel de altas que `REQUISITOS.md` §3.4 describe como
   "se envía por email a gestoría" en realidad **se descarga**.

**Esquema** (migración `20260907140000_clientes_documentos_y_venta`):

- `Cliente` — nombre, CIF, dirección fiscal, contacto y condiciones de pago. La
  base para medir recurrencia y estacionalidad, y para que los datos fiscales
  lleguen solos a contabilidad.
- `Documento` (`BRIEFING` / `PRESUPUESTO` / `OTRO`) — archivo subido o enlace a
  Drive, Dropbox o Canva. No se reutiliza `Material` porque aquel está atado al
  reparto por colaborador y aquí no hay nada de eso.
- `Aviso` — avisos dentro de la app. Existe porque no hay correo y el DM de
  Slack depende de un token que puede no estar: si el aviso no sale, el trabajo
  asignado sigue aquí esperando.
- `Project.marca`, `Project.clienteId`, `Project.refPresupuesto`.
- `PresupuestoVenta`: fuera `importe`, dentro `asignadoAId`. Estados nuevos:
  `en_preparacion · revisado_jakie · enviado_cliente`. Ya no hay "aprobado" ni
  "rechazado" — eso le pasa al proyecto, no al documento, y tenerlo en los dos
  sitios garantizaba que un día dijeran cosas distintas.

**`Project.brand` → `Project.productora`**, y `lib/marcas.ts` → `lib/productoras.ts`.
`brand` significaba la productora (Jakiens/Ricorico); al añadir `marca` para la
marca anunciante habrían convivido dos campos parecidos con sentidos distintos.
Era un bug esperando.

**La migración va escrita a mano** y traslada el dato antes de borrar: el diff
generado proponía `DROP COLUMN "brand"` a secas. Además crea la ficha de cliente
de cada nombre que ya estaba escrito en los proyectos y las enlaza, para que la
tabla no naciera vacía.

**Tropiezo que dejó rastro**: la primera versión tenía las claves ajenas antes de
las columnas que referencian. Al fallar, Postgres **no deshizo** los `CREATE
TYPE` ni los `CREATE TABLE` —Prisma no envuelve el archivo en una transacción
cuando hay `ALTER TYPE ... ADD VALUE`— y los reintentos se atascaban. Los tipos
van ahora con `IF NOT EXISTS` y un `DO $$ ... EXCEPTION` para que la migración
sea re-ejecutable. Conviene recordarlo: **una migración a medias no se deshace sola.**

**Verificado sobre datos poblados**, no sobre una base vacía: `productora`
conservada (Vodafone sigue en Ricorico), seis fichas de cliente creadas desde los
proyectos existentes y enlazadas, estado del presupuesto traducido. `tsc` limpio,
`build` completo, lint en los 6 avisos preexistentes, y las cinco pantallas
principales responden 200.

**Lo que queda de este feedback** (siguiente tanda): rehacer el formulario de
oportunidad (cliente de la base, marca, sin código, sin formato, briefing con
adjunto, "Comentarios Canva", equipo y asignación de presupuesto), quitar el alta
de fechas en venta, subir etapa/estado al encabezado fusionados, y el panel de
presupuesto con PDF.

---

## 2026-09-07 · MacBook · Canal de Slack por proyecto (rama `gestor-proyectos`)

Al dar el GO, la app crea el canal de Slack del proyecto, mete al equipo interno
y publica un primer mensaje con la ficha. Decidido con Aitor: **en el GO, no al
abrir la oportunidad**, porque se abren oportunidades que no se ganan y cada una
dejaría un canal muerto — Slack deja archivar, pero el nombre queda reservado
para siempre.

**Lo que había** era un *incoming webhook* por proyecto: una URL pegada a mano
que solo sabe publicar en un canal que ya existe. **Lo nuevo** es un bot token
(`SLACK_BOT_TOKEN`), que además de publicar puede crear canales y buscar gente
por su email.

- `Project.slackChannelId` / `slackChannelName` (migración
  `20260907110000_canal_slack_por_proyecto`, dos columnas opcionales).
- `src/lib/slack.ts` reescrito: `crearCanal`, `buscarPorEmail`, `invitar`,
  `publicar`, `prepararCanalDeProyecto` y `avisarProyecto`.
- Los 12 avisos que ya existían pasan de `notifySlack(project.slackWebhookUrl, …)`
  a `avisarProyecto(project, …)`, que prefiere el canal y cae al webhook si el
  proyecto es de los antiguos. Así los canales nuevos reciben todo, no solo el
  mensaje de bienvenida, y los proyectos que ya tienen webhook siguen igual.
  La única llamada que sigue siendo `notifySlack` es la que prueba un webhook
  recién pegado en la fase Equipo, que por definición no debe ir por el canal.

**Detalles que importan:**

- Slack responde `200` con `{ok:false, error:"…"}` en vez de un código HTTP de
  error, así que mirar `res.ok` no sirve: hay que leer el cuerpo.
- Nombres de canal: minúsculas, sin acentos, ≤80 caracteres, prefijo `proj-`.
  Si el nombre está cogido (incluido por un canal archivado) prueba `-2`, `-3`…
- `users.lookupByEmail` devuelve `null` para quien no esté en el workspace: los
  producers externos no tienen cuenta, y que falte uno no impide que entren los
  demás.
- **Nada de esto rompe el GO.** Sin token, `haySlackApi()` es `false` y se sale
  antes de empezar.

**Verificado**: el GO funciona sin `SLACK_BOT_TOKEN` (probado con MAH-2610, sin
un solo error en el servidor), la sanitización de nombres cubre acentos, guiones
bajos y el límite de 80, `tsc` limpio y lint en los mismos 6 avisos
preexistentes. **Sin probar contra Slack de verdad**: hace falta que alguien con
permisos de administrador instale la app y ponga el token.

**Pendiente / avisos:**

- El despliegue a producción **no ejecuta migraciones**: `build` es solo
  `next build`. Fusionar esta rama a `main` sin migrar antes rompería
  producción, porque el código pediría columnas que no existen.
- Los hitos siguen sin estado de "completado".

---

## 2026-09-07 · MacBook · UX del gestor: bloques por etapa y pastillas (rama `gestor-proyectos`)

Rediseño de `/gestor` a partir de la revisión de Aitor. La home pasa de una lista
de filas dentro de paneles a **un bloque por etapa apilado en vertical**, y dentro
cada proyecto es una **pastilla clicable entera** (`<Link>` envolviendo la
tarjeta, no un botón al final de la fila).

Cada pastilla lleva ahora **quién está trabajando el proyecto**: los asignados a
la etapa en la que el proyecto está *ahora*, con las iniciales en cuadraditos y
los nombres debajo. El responsable de etapa va relleno con el color de la etapa.
Dos letras no identifican a nadie que no conozca ya al equipo, y la herramienta
también la abre gente nueva, de ahí los nombres.

Las etapas vacías **no desaparecen**: el hueco también informa ("no tenemos nada
en venta" es una noticia) y evita que el orden de la pantalla baile cada semana.

**Fallo de diseño encontrado y corregido durante la revisión.** La consulta
traía solo hitos con `fecha >= hoy`, así que un proyecto con todo el calendario
ya pasado mostraba "Sin fecha" — mentira, y justo al revés de lo que importa:
ese es el que hay que mirar. Ahora se enseña la próxima fecha y, si no queda
ninguna, la última, marcada como "última" y en tono apagado. **No en rojo**: los
hitos no tienen estado de "hecho", así que la app no sabe si esa entrega se
cumplió o se le fue, y pintarla de alarma sería afirmar algo que no consta.

También corregida una regla de CSS del paso 2 que escondía la fecha en móvil;
tenía sentido cuando vivía apretada en una fila, no ahora que tiene su propia
línea dentro de la pastilla. Queda acotada a `.file .hito-proximo`.

**Verificado**: las 6 pastillas son enlaces a su ficha, todas muestran fecha,
y el layout responde bien en 1280 y en 375 (una columna).

**En la base local** hay ahora 6 proyectos de ejemplo repartidos por las cinco
etapas con sus asignaciones, para poder ver la pantalla con contenido real. No
están en el seed: se crearon con un script de usar y tirar.

**Pendiente que ha salido de aquí**: los hitos necesitan un estado de
**completado**. Sin él no se puede distinguir "esta fecha pasó" de "esto se
entregó", y el calendario del paso 4 va a tropezar con lo mismo.

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
