# Sala de Producción · Jakiens — contexto del proyecto

Este archivo lo lee Claude Code automáticamente al abrir el repo, **en cualquier
ordenador**. Es el canal por el que las sesiones del fijo y del MacBook comparten
lo que saben. Si tomas una decisión de diseño que la otra sesión necesitaría
conocer, escríbela aquí. Lo que pasó en una sesión concreta va en `BITACORA.md`.

Alcance funcional y roadmap: [REQUISITOS.md](REQUISITOS.md).
Tratamiento de datos personales: [PROTECCION-DATOS.md](PROTECCION-DATOS.md).

> `REQUISITOS.md` va por delante del código en algunos puntos: describe cosas
> planificadas como si estuvieran hechas. Contrasta siempre con el código.

## Los tres módulos

Una sola app Next.js con tres módulos que comparten base de datos y sesión:

| Módulo | Rutas | Qué hace |
|---|---|---|
| **Radar** | `/radar` | Research y tendencias. Ingesta de Wikipedia, GDELT, Bluesky, HN, RSS, Telegram, YouTube y Reddit. Independiente del resto. |
| **Gestor de proyectos** | `/gestor` | **La única puerta.** Todos los proyectos por etapa, sus fechas y quién trabaja en qué. Arranca en **venta**, antes del GO. |
| **Herramienta de producción** | `/p/[code]/...` | Operativa de un proyecto concreto. Se entra desde su ficha; se desbloquea con el GO. |

`/p` (el selector de proyectos) **ya no es una pantalla**: redirige a `/gestor`.
Eran la misma lista vista dos veces, y dos puertas al mismo sitio hacen que
alguien abra la que no toca, no encuentre lo que busca y pregunte por WhatsApp.
La separación por productora, que sí era útil, vuelve como filtro.

El gestor **no es una app aparte**: son rutas nuevas sobre las mismas tablas. La
ficha de proyecto del gestor y la sala de producción son la misma fila de
`Project`. No hay sincronización entre módulos porque no hay nada que sincronizar.

## Dos ejes de fase — no confundirlos

Es la distinción de diseño más importante del proyecto.

- **Etapa de negocio** (5): `venta · preproducción · rodaje · postproducción · cierre`.
  Dónde está el proyecto en la vida de la compañía. Es lo que muestra el gestor.
- **Fase operativa** (7): `equipo · prepro · materiales · altas · rodaje · postpro · cierre`.
  El desglose del trabajo del producer desde el GO. Vive en `PhaseState` y en
  `src/lib/phases.ts`, y ya funciona.

La fase operativa es un desglose de las etapas post-GO, no una lista paralela.
El gestor lee la etapa; la sala de producción sigue leyendo `PhaseState`.

## Decisiones vigentes

- **Fechas.** Casi todas las fechas del modelo son `String?` (texto libre): se
  eligió a propósito para no pelearse con formatos al escribirlas. La excepción
  es `CallSheetDay.fechaISO`, que se añadió cuando la vista de cliente necesitó
  saber si hoy era día de rodaje. Un calendario maestro no se puede construir
  sobre texto libre, así que **la tabla `Hito` es la única fuente de verdad del
  calendario**, con `DATE` de verdad; los campos de texto se quedan como
  etiqueta legible y se siguen mostrando donde ya se mostraban.
  Un hito con `origen` distinto de `manual` es **derivado**: se regenera desde
  su origen (`scripts/importar-hitos.ts`) y no se edita a mano, porque si el
  producer cambia una jornada en la orden de rodaje el calendario tiene que
  seguirla sola.
- **Etapa y estado.** `Project.etapa` (`src/lib/etapas.ts`) es el eje de negocio;
  `Project.estado` dice si sigue vivo. Un proyecto PERDIDO se archiva y se
  consulta, no se borra. `PhaseState` no sirve para deducir la etapa: se escribe
  al crear el proyecto y **nunca se actualiza** — la barra de fases del
  `AppShell` lee la constante `PHASE_STATE` de `phases.ts`, no la tabla, así que
  hoy todos los proyectos muestran las mismas fases. Es deuda conocida.
- **Presupuesto de venta ≠ presupuesto de coste.** El **coste** (lo que pagamos)
  vive repartido en `ProjectMember.rate`, `dias` y `presupuestoGasto`, y lo ven
  los niveles `FULL` y `LOGISTICS` —Pablo y Carmen negocian tarifas—. La
  **venta** (lo que cobramos) vive en `PresupuestoVenta`, tabla aparte, y la ve
  solo quien tenga `StaffUser.accesoPresupuestoVenta`: Javier, Aitor, Aina,
  Chiara y Maca. Pablo y Carmen ven coste pero **no** ven venta, y por eso el
  permiso va por usuario y no por `tier`. **Mikko tampoco lo ve**, aunque sea
  `FULL`: es dirección creativa y no interviene en la cotización. Confirmado, no
  es un olvido.
  Nota de vocabulario: **"Jakie" es Javier** —el dueño— cuando aparezca en
  conversaciones o documentos. Pablo y Carmen tienen exactamente el mismo rol.
  El dato confidencial **ni se consulta** si quien mira no tiene permiso: traerlo
  y no pintarlo lo dejaría en el HTML del servidor.
- **Equipo interno ≠ colaboradores.** `AsignacionEtapa` reparte trabajo entre el
  equipo de casa (`StaffUser`) por proyecto **y etapa**, porque el equipo cambia
  en cada una. `ProjectMember` es otra cosa: la contratación de colaboradores
  externos, con tarifa, jornadas y alta laboral. No unificarlas.
- **Cifrado en la aplicación, no solo en la base.** `src/lib/db.ts` cifra y
  descifra de forma transparente vía extensión de Prisma. Escribas la consulta
  que escribas, los campos de `CAMPOS_CIFRADOS` salen descifrados y entran
  cifrados. No hace falta acordarse.
- **Los permisos se comprueban en el servidor**, no ocultando enlaces. Todo pasa
  por `src/lib/access.ts`. Entrar a una URL sin permiso redirige.
- **La sala de producción se abre con el GO.** Mientras `etapa` es VENTA,
  `requireStaffAccess` redirige de `/p/[code]/*` a `/gestor/[code]`, y `/p` no
  lista oportunidades. El GO (`marcarGanadoAction`) es el único sitio que pasa un
  proyecto de venta a preproducción y crea sus siete `PhaseState`.
- **El canal de Slack se crea en el GO, no al abrir la oportunidad.** Se abren
  oportunidades que no se ganan, y cada una dejaría un canal muerto: Slack deja
  archivar, pero el nombre queda reservado para siempre. Entra todo el equipo
  interno que tenga cuenta, no solo los asignados — en el GO aún no se ha
  repartido la preproducción. Todo esto degrada en silencio: sin
  `SLACK_BOT_TOKEN` el proyecto se gana igual y los avisos van por webhook.
  Regla general de `src/lib/slack.ts`: **un fallo de Slack nunca rompe la acción
  real**. Avisar es un extra; producir no.
- **El código del proyecto se genera solo y no cambia nunca** (`src/lib/codigo.ts`).
  Vive en la URL, en 11 carpetas de ruta, y en los enlaces que la gente pega en
  Slack. El identificador que usa la gente es `refPresupuesto`, la referencia del
  PPTO, que se captura al subir el PDF y es la que se muestra.
- **El gestor lo ve todo el equipo interno**, sea cual sea su nivel: el objetivo
  de la herramienta es que cualquiera sepa qué hay encima de la mesa. Los niveles
  filtran lo que se puede hacer DENTRO de un proyecto, no si el proyecto existe.
  Crear oportunidades y mover etapa/estado es solo `FULL`.

## Niveles de acceso del equipo interno

`StaffTier` en `src/lib/phases.ts`:

- **FULL** — Javier, Aina, Chiara, Mikko, Aitor, Maca. Todo, incluidas cifras.
- **LOGISTICS** — Pablo, Carmen. Equipo, prepro, materiales, rodaje y postpro.
- **POSTPRODUCTION** — Malo, Miquel, Lungo. Prepro, materiales y postpro.
- **EXTERNO** — Toni, Andrea, Guillem. Las mismas fases que un producer de casa,
  pero **solo en los proyectos donde están asignados**. Ese acotado es de alcance
  y no de fase: vive en `filtroProyectosVisibles` y `puedeVerProyecto`
  (`access.ts`), y se aplica en la consulta, no filtrando en memoria. A un
  proyecto ajeno responde **404 y no 403**: un 403 confirma que existe.

Fuera del equipo interno hay dos accesos más, ambos sin cuenta: colaborador
externo por enlace mágico (`/f/[token]`, `AccessToken`) y cliente/agencia en
modo consulta (`/c/[token]`, `ClientAccess`).

## Arrancar en local

Node vive en `~/.local/node` (instalado sin tocar el sistema, ya en el `PATH`
vía `~/.zshrc`). Desde `web/`:

```bash
npm install
npx prisma dev --name local   # Postgres local, sin Docker
npx prisma migrate deploy
npx prisma db seed            # equipo real + proyecto de ejemplo CHB-2607
npm run dev
```

Login local: `nombre@jakiens.com` / `jakiens-<nombre>-26`.

**Trabaja siempre contra el Postgres local.** La base de producción tiene datos
reales de proyectos y datos personales del equipo; no es sitio para probar
migraciones de esquema.

## Variables de entorno

`.env` no se versiona. El código usa ocho variables — el `README` solo documenta
tres, ojo:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres. Local en desarrollo; Prisma Postgres en Vercel. |
| `SESSION_SECRET` | Firma del JWT de sesión. Distinto en cada entorno. |
| `DATOS_PERSONALES_KEY` | **Crítica.** Clave AES-256 de los datos personales cifrados. |
| `APP_BASE_URL` | Enlaces de ficha en los mensajes de WhatsApp. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, para los archivos subidos. |
| `CRON_SECRET` | Protege el endpoint de ingesta del Radar. |
| `YOUTUBE_API_KEY` | Fuente de YouTube del Radar. |
| `SLACK_WEBHOOK_URL` | Webhook por defecto (cada proyecto puede tener el suyo). |
| `SLACK_BOT_TOKEN` | Token del bot (`xoxb-…`). Sin él, la app no crea canales y los avisos siguen yendo por webhook. |

> **`DATOS_PERSONALES_KEY` no tiene copia de seguridad automática.** Si se pierde
> o se rota, los DNI, NAF, IBAN, domicilios y restricciones alimentarias que hay
> cifrados en producción quedan ilegibles para siempre. Debe estar guardada
> fuera de Vercel, en un gestor de contraseñas.

## Trabajar desde dos ordenadores

GitHub es la única copia buena. `git pull` antes de empezar, `git push` al
terminar, y nunca los dos ordenadores a la vez sin haber subido lo anterior.

**Cada push a `main` despliega a producción en Vercel.** Para cambios que puedan
romper algo, rama aparte y fusionar cuando esté verificado.

Antes de hacer push, añade tu entrada a `BITACORA.md`.
