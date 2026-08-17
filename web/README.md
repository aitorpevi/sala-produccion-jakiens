# Sala de Producción · Jakiens (web)

Next.js 16 + PostgreSQL (Prisma 7) + TypeScript. Ver [../REQUISITOS.md](../REQUISITOS.md) para el alcance funcional y el roadmap.

**En producción**: https://sala-produccion-jakiens.vercel.app — despliega automáticamente con cada push a `main` en [github.com/aitorpevi/sala-produccion-jakiens](https://github.com/aitorpevi/sala-produccion-jakiens).

## Arrancar en local

```bash
npm install
npx prisma dev -d          # Postgres local de Prisma, sin Docker — o usa el DATABASE_URL real de abajo
npx prisma migrate dev     # crea las tablas
npx prisma db seed         # carga el proyecto de ejemplo (CHB-2607) y el equipo interno
npm run dev
```

`.env` no está versionado — pide el archivo real (tiene el `DATABASE_URL` de Prisma Postgres) o usa uno propio de `npx prisma dev` para trabajar aislado de producción.

Abre http://localhost:3000 — cada persona del equipo interno tiene su propio login (email `nombre@jakiens.com`, contraseña temporal `jakiens-<nombre>-26`, ej. `aitor@jakiens.com` / `jakiens-aitor-26`). El seed crea las 11 cuentas con su nivel:

- **FULL** (acceso total): Javier, Aina, Chiara, Mikko, Aitor, Maca.
- **LOGISTICS** (Equipo, Preproducción, Materiales y Rodaje; sin Altas/Postproducción/Cierre): Pablo, Carmen.
- **POSTPRODUCTION** (solo Preproducción, Materiales y Postproducción): Malo, Miquel, Lungo.

Son contraseñas temporales — hay que cambiarlas a mano en la tabla `StaffUser` (o construir una pantalla de cambio de contraseña) antes de repartir accesos de verdad.

## Qué hay conectado de verdad

- **Selector de proyectos** (`/p`): lista de proyectos activos para todo el equipo interno; "+ Nuevo proyecto" (solo nivel `FULL`) da de alta un proyecto con su código, fechas clave y, opcionalmente, carpeta de Drive y webhook de Slack.
- **Directorio de colaboradores** (`/colaboradores`, niveles `FULL` y `LOGISTICS`): ficha por persona (contacto + datos fiscales) reutilizable entre proyectos — al añadir equipo a un proyecto se elige del directorio en vez de duplicar a alguien.
- **Equipo**: alta de colaboradores (nuevos o del directorio), confirmación, convocatoria por WhatsApp (`wa.me`) con enlace mágico real a la ficha del colaborador.
- **Preproducción**: briefing, fechas reales del proyecto, y presupuesto por perfil — honorarios y presupuesto de gasto de materiales por separado, con sus totales.
- **Materiales**: subida y descarga de archivos reales (guardados en `storage/uploads/`, fuera de `public/` y con comprobación de permisos en la descarga).
- **Postproducción**: enlace a la carpeta de Drive del proyecto (editable) + listado de peticiones de material con estado pendiente/entregado.
- **Acceso de colaborador**: enlace de un solo uso por proyecto+persona (`/f/[token]`), sin contraseña, con caducidad de 45 días.
- **Altas laborales / Rodaje / Cierre**: solo placeholders ("Próximamente") — dependen de la plantilla real y las credenciales de OK Ticket (ver REQUISITOS.md).
- **Permisos del equipo interno**: cada fase comprueba en el servidor si el `tier` del usuario tiene acceso — no es solo ocultar el enlace, entrar directamente a una URL sin permiso redirige a la primera fase permitida.
- **Notificaciones a Slack**: cada proyecto puede tener un webhook de Slack (configurable desde la fase Equipo, solo nivel `FULL`); avisa al canal cuando se confirma un colaborador, se convoca, se sube material o hay novedades en Postproducción.

## Variables de entorno (`.env`, no versionado)

```
DATABASE_URL=...       # Prisma Postgres en producción; local con `npx prisma dev` si prefieres aislarte
SESSION_SECRET=...     # aleatorio largo, distinto en cada entorno
APP_BASE_URL=...       # usada para construir el enlace de ficha en el mensaje de WhatsApp — debe ser la URL real
```

En Vercel están configuradas en **Settings → Environment Variables** del proyecto.

## Pendiente

1. Mover `sala-produccion-jakiens.vercel.app` a `worktool.jakiens.com` (CNAME en IONOS) cuando se decida.
2. Cambiar las contraseñas temporales del equipo interno antes de repartir accesos de verdad.
3. Mover el almacenamiento de archivos de disco local a un bucket (Cloudflare R2 / Backblaze B2) — el filesystem de Vercel no es persistente entre despliegues, así que los archivos subidos en producción se pierden en cada redeploy.
4. Plantilla `.xlsx` real de alta + credenciales de OK Ticket, para desbloquear Altas laborales y Cierre.
