# Sala de Producción · Jakiens — Hoja de requerimientos

Estado: borrador v0.1 · basado en el prototipo `intranet-jakiens.html` (chat "Aplicaciones y sitios web")

## Pendiente de confirmar

- **Hosting de `jakiens.com`**: por DNS (nameservers `ui-dns.*`, IP en rango IONOS) y cabeceras (WordPress + Apache) todo apunta a un **hosting compartido de IONOS**, no un VPS con Node/Docker. No bloqueamos el arranque por esto: la app nueva se despliega en una plataforma aparte (Vercel/Render) y `worktool.jakiens.com` apunta ahí vía CNAME en el DNS de IONOS, sin tocar el WordPress existente. Si más adelante confirmas que en realidad es un VPS con acceso root, se puede migrar el despliegue allí sin cambiar el stack.
- **OK Ticket**: credenciales/documentación de su API.
- **Gestoría**: plantilla `.xlsx` real de alta de Jakiens + email de envío.
- **Fecha objetivo**: **lunes 23 de agosto** — el equipo necesita ver avances esa semana. Quedan ~9 días naturales, así que el hito de esa fecha es deliberadamente acotado (ver sección 8).
- **Equipo interno y permisos** (sección 9, nueva): ¿entra en el hito del 23/08 o se construye después? ¿Confirmamos añadir Postproducción como fase 7ª?
- **Slack**: ¿solo notificaciones automáticas por webhook, integración completa, o no tocarlo por ahora? (sección 10)
- **WhatsApp de empresa**: confirmar si el número está vinculado como dispositivo multi-sesión en los móviles del equipo interno, o es otro montaje (sección 10).

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

## 7. Stack técnico (a confirmar con el tipo de hosting)

Si el hosting soporta Node.js/Docker (VPS):
- **Frontend + backend**: Next.js (React) — reutiliza directamente la lógica del prototipo (mismo lenguaje, misma estructura de datos), API routes o servicio Node/Express separado.
- **Base de datos**: PostgreSQL + Prisma como ORM.
- **Autenticación**: NextAuth (o similar) para producción; tokens propios de un solo uso/expiración para colaboradores.
- **Envío de email**: Resend o SMTP del propio hosting.
- **Almacenamiento de archivos**: si el disco del VPS no tiene backup gestionado, usar un bucket S3-compatible barato (Cloudflare R2 / Backblaze B2) en vez de guardar solo en local.
- **Despliegue**: Docker + Nginx como reverse proxy en el subdominio `worktool.jakiens.com`, o PM2 si se prefiere sin contenedores.

Si el hosting es compartido (solo PHP/MySQL vía cPanel/Plesk), el stack cambia (ej. Laravel + Livewire/Inertia, MySQL) y habría que reescribir el prototipo en PHP en vez de reutilizar el JS actual — por eso es la pregunta más urgente a resolver.

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

## 9. Equipo interno y permisos (propuesta — pendiente de confirmar)

A diferencia de los colaboradores externos (acceso de un solo proyecto, vía enlace mágico), el equipo interno de Jakiens necesita **cuentas propias, activas en todos los proyectos**, con tres niveles de acceso:

| Nivel | Personas | Rol | Ve | No ve |
|---|---|---|---|---|
| **Total** | Javier, Aina, Chiara, Mikko, Aitor, Maca | CEO, Contabilidad/Finanzas/Laboral, Producción ejecutiva, Dirección creativa, Producción ejecutiva + admin, Producción y contabilidad de proyectos | Las 6 (o 7) fases completas, cifras de Cierre/facturación, contabilidad agregada | — |
| **Parcial · Logística y creativo** | Pablo, Carmen | Producer/localizador; logística | Materiales (documentación creativa), Equipo (contacto y logística con colaboradores), presupuestos **individuales** por colaborador (para negociar tarifas) | Cierre/facturación y contabilidad agregada del proyecto |
| **Parcial · Postproducción** | Malo, Miquel, Lungo | Montaje/edición, IA | Documentos de Preproducción, la fase de Postproducción (propuesta, ver más abajo), necesidades de formato | El resto |

**Implicaciones técnicas** (no construidas todavía — depende de tu respuesta sobre si entra en el hito del 23/08):
- Pasar de un `ProductionUser` único a una tabla de usuarios internos reales, cada uno con email/contraseña propios y un `tier` (o permisos granulares por fase, reutilizando el mismo mecanismo `permisos[]` que ya existe para colaboradores).
- El nivel "Parcial · Logística" necesita una distinción nueva que hoy no existe: acceso a **presupuestos individuales** (tarifa de un colaborador concreto, para negociar) sin acceso a la **contabilidad agregada** (Cierre). Ahora mismo `Preproducción` y `Cierre` ya están separados como fases distintas, así que esta distinción encaja de forma natural sin rediseñar el modelo.
- **Postproducción no existe como fase** en el modelo actual (que cubre preproducción → rodaje → cierre). Lo que necesita el equipo de montaje (documentos de preproducción + "información de postproducción" + necesidades de formato) apunta a una fase 7ª nueva — entregables, enlaces de revisión de montaje, especificaciones de formato/exportación. Si confirmas que sí, la añado al modelo de datos y al phase-strip.

## 10. Arquitectura de comunicación (Slack + WhatsApp)

Hoy conviven dos canales fuera de la intranet:
- **Slack** (equipo interno): un canal por proyecto con distintos niveles de información, mantenido a mano.
- **WhatsApp** (colaboradores externos, ~70% del equipo de cada proyecto): desde un número de empresa compartido, vinculado a los móviles del equipo interno.

**Planteamiento**: la intranet no debería intentar sustituir ninguno de los dos — sustituir el hábito de comunicación de todo un equipo es el camino con más fricción y más lento de adoptar. Mejor que la intranet sea la **fuente de verdad** y ambos canales se alimenten de ella:

- **Slack**: en vez de actualizar el canal a mano, la intranet puede enviar automáticamente notificaciones al canal del proyecto cuando pasa algo relevante (colaborador confirmado, factura recibida, material subido, alta enviada a gestoría...) mediante un **webhook de entrada por proyecto** (se configura un webhook en Slack por canal, sin necesidad de una app/bot completa). Es la opción con mejor relación esfuerzo/beneficio; una integración bidireccional completa (comandos desde Slack, sincronización en ambos sentidos) es mucho más trabajo de construir y mantener, y no parece necesaria para resolver el problema real (evitar duplicar la actualización manual).
- **WhatsApp**: si el número de empresa está añadido como **dispositivo vinculado** (multi-dispositivo) en los móviles del equipo interno, el flujo de "Convocar" que ya existe en la fase Equipo debería encajar sin cambios — cualquiera del equipo pulsa el botón desde su propio móvil, el mensaje sale identificado como el número de empresa, y la conversación queda visible en todos los dispositivos vinculados. Falta confirmar que ese es realmente el montaje actual antes de darlo por bueno.

Pendiente de tu confirmación en ambos puntos antes de tocar el modelo de datos o el roadmap.
