# Bitácora

Una entrada por sesión de trabajo, la más reciente arriba. Sirve para que la
sesión del otro ordenador sepa qué pasó sin tener que reconstruirlo del historial
de commits. Qué se hizo, qué se decidió y qué queda abierto.

Las decisiones que siguen vigentes se resumen además en `CLAUDE.md`; aquí queda
el relato con su fecha.

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
