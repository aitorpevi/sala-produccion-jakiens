# Sala de Producción · Jakiens — Hoja de requerimientos

Estado: borrador v0.1 · basado en el prototipo `intranet-jakiens.html` (chat "Aplicaciones y sitios web")

## Pendiente de confirmar

- **`worktool.jakiens.com`**: de momento la app vive en `sala-produccion-jakiens.vercel.app` (decisión tuya, ver sección 7) — mover el CNAME cuando queráis.
- **OK Ticket**: credenciales/documentación de su API — bloquea la fase Cierre y el campo `okTicketId` del directorio de colaboradores (ya preparado en el modelo, sin conectar).
- **Gestoría**: plantilla `.xlsx` real de alta de Jakiens + email de envío — bloquea la fase Altas laborales.
- **Fecha objetivo**: **lunes 23 de agosto**.
- **Equipo interno y permisos**: construido (sección 9).
- **Slack**: notificaciones por webhook construidas (sección 10) — falta que crees el webhook del canal en Slack y lo pegues en la fase Equipo de cada proyecto.
- **WhatsApp de empresa**: recomendación entregada (sección 10) — confirmar si ya usáis el modo multi-dispositivo o hay que configurarlo.
- **Alta de proyecto y directorio de colaboradores**: construido (sección 11).

## 1. Objetivo

Sustituir la coordinación de proyectos de producción audiovisual (equipo, briefing, materiales, altas en Seguridad Social, rodaje, cierre económico) que hoy vive dispersa en WhatsApp/email/Excel por una intranet única por proyecto, con una vista de **Producción** (control total) y una vista por **colaborador** (solo su información).

Primer hito: tener el backend y el frontend funcionales —aunque sea con integraciones de pago aún pendientes de contratar— para enseñarlo al equipo a la vuelta de vacaciones.

## 2. Roles y acceso

| Rol | Acceso | Autenticación |
|---|---|---|
| **Producción** | Todos los proyectos, todas las fases, todos los colaboradores | Login clásico (email + contraseña, o SSO si Jakiens ya usa Google Workspace) |
| **Colaborador** | Un proyecto, solo las fases para las que tiene permiso (`permisos[]`), solo sus propios datos | Enlace mágico sin contraseña, con el patrón que ya usa el prototipo: `sala.jakiens.com/f/{codigoProyecto}/{colaboradorId}`. El enlace debe caducar (p. ej. proyecto + 30 días) |

Los permisos por fase se derivan de `permisos: ["Briefing","Materiales","Rodaje","Cierre"]` + el flag `requiereAlta` para la fase de altas laborales, tal como ya modela el prototipo (`phaseAllowed()`).

## 3. Módulos funcionales (las 6 fases)

### 3.1 Equipo
- Alta/edición de colaboradores por proyecto: nombre, rol/perfil, teléfono, tarifa/jornada, jornadas, permisos de acceso, si requiere alta en SS.
- Estado de confirmación (confirmado / sin responder).
- Convocatoria: genera un enlace `wa.me` con el mensaje prellenado (briefing, fechas, link a su ficha) — **envío manual**, producción pulsa "enviar" en su propio WhatsApp (según lo acordado, sin WhatsApp Business API por ahora).
- Convocatoria masiva (repetir el envío individual para todo el equipo pendiente).

### 3.2 Preproducción
- Briefing individual por perfil (texto libre, editable por producción).
- Fechas clave del proyecto (preproducción, rodaje por jornada, entrega de material, primera entrega de montaje).
- Necesidades específicas por perfil (lista libre clave/valor, ej. "Óptica macro · Confirmada").
- Presupuesto: producción ve el desglose completo (tarifa × jornadas de cada colaborador + total); cada colaborador solo ve su propia tarifa y total.

### 3.3 Materiales
- Repositorio de archivos por proyecto con dirección:
  - **Entrada** (`in`): producción sube, colaborador descarga (dossier de arte, tratamiento, guion técnico...).
  - **Salida** (`out`): producción solicita, colaborador sube (ej. planta de iluminación del DOP).
- Visibilidad por lista de destinatarios (`to: [ids]`) — cada colaborador solo ve lo asignado a su perfil.
- Metadatos: nombre, extensión, tamaño, versión.

### 3.4 Altas laborales
- Solo visible para colaboradores con `requiereAlta = true`.
- Formulario del colaborador (mismos campos que la hoja tipo actual de Jakiens): nombre, categoría, DNI/NIE, NAF, domicilio, IBAN, % IRPF, fecha alta/baja.
- Al enviarse, el backend **genera el Excel con la plantilla real de Jakiens** y lo envía por email a gestoría automáticamente.
- Producción ve estado por colaborador (pendiente/recibida) y puede mandar recordatorios.
- **Dato sensible**: DNI, IBAN y NAF requieren tratamiento acorde a RGPD (ver sección 6).

### 3.5 Rodaje
- Orden de rodaje (call sheet) por jornada: localización, hora de entrada, amanecer/ocaso, meteo, tabla de call times por persona.
- Orden de trabajo (horario del día).
- Documentos del día (plano de set, accesos...).
- Cada colaborador ve resaltada su propia fila y un bloque con su call time, punto de encuentro y contacto de producción en set.

### 3.6 Cierre
- Producción: tabla de facturas de colaboradores (concepto, importe, estado) + total facturado.
- Gastos de producción: **integración real con OK Ticket** (API) para traer los tickets del proyecto en vez de solo enlazar.
- Colaborador: sube su propia factura en PDF y accede a OK Ticket para registrar sus gastos autorizados.

## 4. Modelo de datos (propuesta inicial)

```
Project        (id, client, name, code, director, agencia, shoot_dates, location, format)
PhaseState     (project_id, phase_key, state: done|live|next)
Person         (id, name, phone, email, default_role)
ProjectMember  (project_id, person_id, role, rate, dias, confirmed, requiere_alta,
                permisos[], call_time, initials)
AccessToken    (project_member_id, token, expires_at)      -- enlace mágico del colaborador
Material       (id, project_id, name, ext, size, version, direction[in|out],
                uploaded_by, url)
MaterialTarget (material_id, project_member_id)             -- a quién se le asigna
AltaLaboral    (project_member_id, dni, naf, domicilio, iban, irpf,
                fecha_alta, fecha_baja, estado, sent_to_gestoria_at)
CallSheetDay   (project_id, fecha, localizacion, primera_hora, amanecer, ocaso, meteo)
ScheduleItem   (callsheet_day_id, hora, descripcion)
Invoice        (project_member_id, concept, amount, state, file_url, received_at)
Expense        (project_id, source: "ok_ticket", external_id, concept, amount, synced_at)
```

## 5. Integraciones externas

| Integración | Decisión | Notas |
|---|---|---|
| WhatsApp | Enlace `wa.me` prellenado, envío manual | Sin coste, sin aprobación de plantillas. Reevaluar WhatsApp Business API si se necesita envío automático más adelante. |
| OK Ticket | Integración real vía API | Falta obtener credenciales/documentación de la API de OK Ticket para definir el conector exacto. |
| Gestoría | Generación automática de Excel (plantilla Jakiens) + envío por email | Necesitamos la plantilla `.xlsx` real de Jakiens y la dirección de gestoría para el envío automático. |

## 6. Requisitos no funcionales

- **Datos personales sensibles** (DNI, IBAN, NAF, domicilio): cifrado en reposo, acceso restringido a producción + el propio colaborador, y registrar quién accede a la ficha de alta. Revisar si el tratamiento requiere actualizar el registro de actividades de tratamiento (RGPD) de Jakiens.
- **Multiproyecto**: el modelo de datos separa `Person` de `ProjectMember` para que un mismo colaborador pueda participar en varios proyectos con tarifas y permisos distintos en cada uno.
- **Backups**: copias diarias de la base de datos (hay datos de facturación y nómina).
- **Entornos**: al menos dev y producción; staging deseable antes de dar acceso al equipo completo.

## 7. Stack técnico (construido y desplegado)

- **Frontend + backend**: Next.js 16 (App Router, Turbopack) + TypeScript.
- **Base de datos**: PostgreSQL gestionado por **Prisma Postgres** (región Europa/París), vía Prisma 7 con driver adapter (`@prisma/adapter-pg`).
- **Autenticación**: sesión propia con JWT firmado (`jose`) para el equipo interno (email + contraseña, bcrypt); tokens de un solo uso/expiración (45 días) para colaboradores externos.
- **Almacenamiento de archivos**: disco local del servidor por ahora (`storage/uploads/`) — pendiente mover a un bucket S3-compatible (Cloudflare R2 / Backblaze B2) si el volumen de archivos crece, ya que el filesystem de Vercel no es persistente entre despliegues.
- **Despliegue**: Vercel, desplegando desde GitHub (`aitorpevi/sala-produccion-jakiens`, rama `main`) — cada push a `main` despliega automáticamente. URL actual: **https://sala-produccion-jakiens.vercel.app** (pendiente mover a `worktool.jakiens.com` vía CNAME en IONOS cuando se decida).
- **Notificaciones**: webhook de Slack por proyecto (sin dependencias externas, solo `fetch`).

`jakiens.com` sigue en hosting compartido de IONOS (WordPress) — no se ha tocado, la app nueva vive en Vercel de forma independiente, tal como se planteó.

## 8. Roadmap hacia el lunes 23 de agosto

**Estado a 16/08**: backend (Next.js 16 + Postgres/Prisma) y las fases Equipo, Preproducción y Materiales ya funcionan con datos reales, probadas en local con el proyecto de ejemplo CHB-2607. Ver [web/README.md](web/README.md) para cómo arrancarlo. Queda por hacer: Postgres real + despliegue en Vercel con el CNAME de `worktool.jakiens.com` (puntos 9-10 pendientes de que crees las cuentas correspondientes).


Objetivo: **lunes 23/08** el equipo ve avances reales, no el prototipo estático. Con ~9 días naturales por delante, el alcance de este primer hito es deliberadamente acotado — mejor 3 fases funcionando de verdad que 6 a medias.

**Incluido en el hito del 23/08:**
1. Modelo de datos + esqueleto backend (Postgres + Prisma), auth de producción.
2. Fase 1 · Equipo — CRUD real, convocatoria por `wa.me`.
3. Fase 2 · Preproducción — briefing, fechas, presupuesto real por colaborador.
4. Fase 3 · Materiales — subida/descarga real de archivos.
5. Enlaces mágicos de colaborador (acceso sin contraseña) para las 3 fases anteriores.
6. Desplegado en una URL de pruebas real (Vercel, con el CNAME de `worktool.jakiens.com` si da tiempo a moverlo).

**Deliberadamente fuera del hito del 23/08** (dependen de datos externos que hay que reunir primero):
- Fase 4 · Altas laborales — necesita la plantilla `.xlsx` real de Jakiens y el email de gestoría.
- Fase 6 · Cierre — la integración real con OK Ticket necesita credenciales/API docs.
- Fase 5 · Rodaje — se deja para después de las 3 primeras por prioridad, no por dependencia externa; entra en cuanto haya margen.

**Cómo ayudar a no bloquear lo anterior**: en paralelo a que yo desarrolle, sería útil que fueras reuniendo la plantilla de alta de Jakiens y las credenciales de OK Ticket, así en cuanto volváis de vacaciones esas dos fases se pueden enchufar sin esperar.

## 9. Equipo interno y permisos (construido)

A diferencia de los colaboradores externos (acceso de un solo proyecto, vía enlace mágico), el equipo interno de Jakiens necesita **cuentas propias, activas en todos los proyectos**, con tres niveles de acceso:

| Nivel | Personas | Rol | Ve | No ve |
|---|---|---|---|---|
| **Total** | Javier, Aina, Chiara, Mikko, Aitor, Maca | CEO, Contabilidad/Finanzas/Laboral, Producción ejecutiva, Dirección creativa, Producción ejecutiva + admin, Producción y contabilidad de proyectos | Las 7 fases completas, cifras de Cierre/facturación, contabilidad agregada | — |
| **Parcial · Logística y creativo** | Pablo, Carmen | Producer/localizador; logística | Equipo, Preproducción, Materiales y Rodaje; presupuestos **individuales** por colaborador (para negociar tarifas) | Altas, Postproducción, Cierre/facturación y contabilidad agregada |
| **Parcial · Postproducción** | Malo, Miquel, Lungo | Montaje/edición, IA | Preproducción (deciden ahí junto a Mikko, el realizador y el DOP en distintas fases del proceso), Materiales y Postproducción | El resto |

**Estado**: construido y probado (2026-08-16) con las 11 personas del equipo interno + Aitor, cada una con su propio login y su nivel real aplicado tanto en el menú de fases como en el servidor (si alguien entra a una URL de una fase sin acceso, se le redirige a su primera fase permitida — no es solo ocultar el botón).

- `ProductionUser` → `StaffUser`, con un campo `tier` (`FULL` / `LOGISTICS` / `POSTPRODUCTION`). Login con email + contraseña igual que antes, ahora una cuenta por persona.
- **Postproducción ya existe como fase 6ª y tiene contenido real** (Cierre pasa a ser la 7ª): un enlace a la carpeta de Drive del proyecto (editable por quien tenga acceso a la fase) y un listado de peticiones de material con estado pendiente/entregado — cualquiera con acceso puede añadir una petición o marcarla como entregada.
- Credenciales temporales generadas por el seed — email de cada persona en `nombre@jakiens.com`, contraseña `jakiens-<nombre>-26`. Cámbialas antes de dar acceso real (ver `web/README.md`).

## 10. Arquitectura de comunicación (Slack + WhatsApp)

### Slack — construido

Cada proyecto tiene un campo `slackWebhookUrl` (editable desde la fase Equipo, solo visible para el nivel `FULL`). En cuanto se rellena con la URL de un webhook de entrada de Slack, la intranet avisa automáticamente al canal del proyecto cuando:
- se añade un colaborador nuevo,
- alguien confirma su participación,
- se envía una convocatoria por WhatsApp,
- se sube un material (por producción o por un colaborador),
- se crea o se marca como entregada una petición de material en Postproducción.

Para conectarlo a un canal real: en Slack, crear una **Incoming Webhook** para el canal del proyecto (Slack → Configuración del canal → Integraciones → Webhooks, o app "Incoming Webhooks" desde el directorio de apps de Slack), copiar la URL (`https://hooks.slack.com/services/...`) y pegarla en el panel "Notificaciones a Slack" de la fase Equipo. Si falla el envío (URL mal puesta, canal borrado...), no rompe la acción del usuario — simplemente no llega el aviso.

No construí sincronización bidireccional (comandos desde Slack, etc.) porque no resuelve un problema real aquí — el objetivo era dejar de actualizar el canal a mano, y con el webhook ya queda cubierto.

### WhatsApp — recomendación

Para que **todo el equipo interno (~11-12 personas)** pueda escribir manualmente desde el mismo número de empresa (sin automatizar ni usar plantillas, que es justo vuestro caso de uso):

**Recomendado: WhatsApp Business (la app gratuita) con dispositivos vinculados.**
- Comprad una SIM/línea dedicada para "Jakiens" que no esté ya asociada a otra cuenta de WhatsApp (personal o de empresa) — cada número solo puede tener una cuenta.
- Instalad WhatsApp Business en un móvil "principal", completad el perfil de empresa (nombre, categoría, descripción, web, horario).
- Desde ese móvil, usad **Dispositivos vinculados** para añadir hasta **4 dispositivos más** (total 5, incluyendo el principal) — cualquier persona con un dispositivo vinculado puede leer y escribir como ese mismo número, y todas ven la misma conversación.
- Coste: básicamente el de la línea (línea de datos/voz en España, unos 5-15 €/mes) — la app y el uso normal son gratis.
- Límite real: solo 5 sesiones simultáneas. Si más de 5 personas necesitan enviar mensajes *a la vez* como Jakiens (no solo consultar), esto se queda corto — pero para que uno o dos de producción convoquen colaboradores en cada momento, sobra.
- Requisito técnico: el móvil principal tiene que conectarse a internet al menos una vez cada 14 días o los dispositivos vinculados se desconectan.

**Si en algún momento necesitáis más de 5 personas a la vez, o automatizar envíos**: la alternativa es la WhatsApp Business Platform (API de Meta) combinada con una bandeja compartida tipo **Chatwoot** (gratis si se autoaloja) o **360dialog** (~40-50 €/mes) — pero esto exige verificar la empresa en Meta Business Manager (puede tardar semanas) y es una capa de infraestructura adicional que no hace falta para el caso de uso que describes. Herramientas más orientadas a marketing masivo (Wati, Respond.io, Zoko, 50-160+ €/mes) son claramente más de lo que necesitáis.

El flujo de "Convocar" que ya existe en la fase Equipo (enlace `wa.me` abierto desde el propio móvil de quien lo pulsa) encaja sin ningún cambio con la opción recomendada — en cuanto deis de alta el número con dispositivos vinculados, ya funciona.

## 11. Alta de proyecto y directorio de colaboradores (construido)

### Selector y alta de proyecto (`/p`, `/p/nuevo`)

Al entrar, cualquier persona del equipo interno ve el listado de proyectos activos (y, aparte, los cerrados). Solo el nivel **Total** ve el botón "+ Nuevo proyecto", porque activar un proyecto es la decisión de kickoff tras ganarlo en firme. El alta recoge, pensado a través de las 7 fases:

- **Núcleo** (usado en todas las fases): cliente, nombre, código (`Project.code`, único), realizador, agencia, localización, formato.
- **Preproducción**: fechas de inicio/fin de preproducción, inicio/fin de rodaje, entrega de material, 1ª entrega de montaje — antes estaban fijas como texto en el prototipo; ahora son datos reales del proyecto y se leen en la fase Preproducción.
- **Postproducción**: enlace a la carpeta de Drive (opcional en el alta, editable después).
- **Comunicación**: webhook de Slack (opcional en el alta, editable después desde Equipo).
- **Equipo, Materiales, Altas, Rodaje, Cierre**: no necesitan nada en el alta — se rellenan según avanza el proyecto.

El proyecto arranca con la fase Equipo en estado "en curso" y el resto en "próxima". Un campo `status` (`activo` | `cerrado`) evita que la lista crezca sin fin — de momento no hay un botón para cerrar un proyecto (la fase Cierre sigue siendo un placeholder), se añadirá cuando se construya esa fase.

**Supuesto que hice**: cualquier nivel de acceso ve todos los proyectos activos, sin asignación de "quién trabaja en cada proyecto" — el nivel decide qué ve *dentro* de un proyecto, no si puede entrar. Si en la práctica hace falta restringir por proyecto (ej. que Malo no vea un proyecto en el que no participa), hay que añadirlo.

### Directorio de colaboradores (`/colaboradores`)

Antes, cada alta de colaborador en la fase Equipo creaba una persona nueva en la base de datos, aunque ya hubiera trabajado antes con Jakiens — con lo cual sus datos fiscales había que volver a pedirlos en cada proyecto. Ahora:

- `Person` (la identidad — nombre, teléfono, email, DNI, NAF, domicilio, IBAN, IRPF) vive independiente de `ProjectMember` (el contrato de ESE proyecto — rol, tarifa, jornadas, presupuesto de gasto, permisos). Un mismo colaborador puede tener historial en varios proyectos con condiciones distintas cada vez, pero sus datos fiscales son los mismos en todos.
- Al añadir a alguien a un proyecto (fase Equipo), el formulario ofrece un desplegable con todo el directorio — si la persona ya existe, se reutiliza; si no, se crea nueva. Probado con dos proyectos reales: añadir al mismo colaborador al segundo proyecto no duplica nada, y su ficha muestra el historial de ambos.
- Ficha de colaborador (`/colaboradores/[id]`, niveles Total y Logística): edición de contacto y datos fiscales + historial de proyectos en los que ha participado.
- Campo `okTicketId` ya preparado en el modelo (sin conectar, a la espera de credenciales) para cuando haya que vincular cada persona con su cuenta de OK Ticket.

### Presupuesto de gasto por partida

Cada partida del equipo (`ProjectMember`) tiene ahora dos números independientes: **honorarios** (`rate × dias`, lo ya existente) y **presupuesto de gasto** (`presupuestoGasto`, nuevo) — para partidas como Arte, Vestuario o Gaffer/material eléctrico, donde hay un coste de materiales aparte de pagar a la persona. Se captura al añadir el colaborador al proyecto y se ve reflejado en el panel de presupuesto de Preproducción, con el total de honorarios, el total de gasto de materiales, y el total combinado, por separado.
