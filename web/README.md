# Sala de Producción · Jakiens (web)

Next.js 16 + PostgreSQL (Prisma 7) + TypeScript. Ver [../REQUISITOS.md](../REQUISITOS.md) para el alcance funcional y el roadmap.

## Arrancar en local

```bash
npm install
npx prisma dev -d          # Postgres local de Prisma, sin Docker
npx prisma migrate dev     # crea las tablas
npx prisma db seed         # carga el proyecto de ejemplo (CHB-2607)
npm run dev
```

Abre http://localhost:3000 — entra como producción con:

- **Email**: `aitor@jakiens.com`
- **Contraseña**: `cambia-esta-clave-2026` (temporal — cámbiala a mano en la tabla `ProductionUser` o añade una pantalla de cambio de contraseña antes de compartir el acceso)

## Qué hay conectado de verdad

- **Equipo**: alta de colaboradores, confirmación, convocatoria por WhatsApp (`wa.me`) con enlace mágico real a la ficha del colaborador.
- **Preproducción**: briefing, presupuesto y necesidades por perfil (fechas quedan de momento en texto fijo del proyecto de ejemplo).
- **Materiales**: subida y descarga de archivos reales (guardados en `storage/uploads/`, fuera de `public/` y con comprobación de permisos en la descarga).
- **Acceso de colaborador**: enlace de un solo uso por proyecto+persona (`/f/[token]`), sin contraseña, con caducidad de 45 días.
- **Altas laborales / Rodaje / Cierre**: solo placeholders ("Próximamente") — dependen de la plantilla de alta real, el email de gestoría y las credenciales de OK Ticket (ver REQUISITOS.md).

## Variables de entorno (`.env`, no versionado)

```
DATABASE_URL=...       # la da `npx prisma dev` en local; en producción, tu Postgres real
SESSION_SECRET=...     # cambiar por un valor aleatorio largo antes de desplegar
APP_BASE_URL=...       # usada para construir el enlace de ficha en el mensaje de WhatsApp
```

## Pendiente antes de desplegar

1. Postgres real (Neon/Supabase recomendado) en vez del `prisma dev` local.
2. Cuenta de Vercel + CNAME de `worktool.jakiens.com` apuntando ahí.
3. Cambiar `SESSION_SECRET` y la contraseña temporal de producción.
4. Mover el almacenamiento de archivos de disco local a un bucket (Cloudflare R2 / Backblaze B2) si se despliega en Vercel, ya que su filesystem no es persistente entre despliegues.
