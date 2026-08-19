# Protección de datos · Sala de Producción

Estado: v1 · 18 ago 2026

La app trata datos personales de colaboradores externos: nombre, contacto, DNI
o NIE, número de afiliación a la Seguridad Social, IBAN, domicilio y fecha de
nacimiento. Son datos identificativos y financieros de terceros, y una filtración
tiene consecuencias reales para ellos y sanción para la empresa.

Este documento recoge qué protege el código y qué queda en manos de la empresa.

---

## 1. Lo que ya está implementado

### Capa 1 · Cifrado en la aplicación

DNI, NAF, IBAN, domicilio y fecha de nacimiento se guardan cifrados con
**AES-256-GCM** (`src/lib/cifrado.ts`). Lo que hay en Postgres es ilegible:

```
dni  →  v1.4yf7yX7niVcKz1S2.+nDmnx7O6lvunnyrGEJAmQ==.r8JTN+2E3kvb
```

Se cifra en la aplicación y no solo en la base de datos a propósito. El cifrado
en reposo del proveedor protege frente a que alguien se lleve el disco; no
protege frente a una credencial filtrada, un volcado de backup, ni frente al
propio proveedor. La clave vive en `DATOS_PERSONALES_KEY`, fuera de la base de
datos y fuera de git.

GCM además autentica: si alguien modifica un valor directamente en la base de
datos, el descifrado falla en vez de devolver un dato corrupto sin avisar.

El cifrado va enganchado al cliente de Prisma (`src/lib/db.ts`), así que se
aplica a cualquier consulta, también a las que se escriban en el futuro. No
depende de que nadie se acuerde.

**Nombre, email y teléfono quedan en claro** deliberadamente: se usan para
buscar y ordenar en toda la app, y cifrarlos rompería esas consultas sin ganar
nada — el nombre ya aparece en cada orden de rodaje.

### Capa 2 · Minimización de acceso

| Nivel | Ve datos fiscales |
|---|---|
| `FULL` | Sí |
| `LOGISTICS` | **No** |
| `POSTPRODUCTION` | No (sin acceso a altas ni directorio) |
| Colaborador (enlace mágico) | Solo los suyos |

Se cerró un agujero: `LOGISTICS` estaba excluido de la fase de Altas pero
llegaba a los mismos DNI e IBAN por la ficha del colaborador. Ahora el filtro
está **en la acción de servidor**, no solo en la pantalla — ocultar un campo en
el HTML no es control de acceso.

### Capa 3 · Enmascarado por defecto

En la fase de Altas los datos salen enmascarados: `*****86G`, `ES53 **** ****
1005`, y el domicilio solo como «registrado». El dato completo únicamente sale
en el archivo que se manda a la gestoría.

### Capa 4 · Registro de accesos

Tabla `AccesoDatosPersonales`: quién, a qué persona, qué acción, cuándo y desde
qué IP. Se registran las consultas de fichas, las ediciones y —sobre todo— las
**exportaciones**, que es cuando los datos salen del sistema.

El registro **nunca guarda el dato consultado**, solo el hecho de la consulta:
un log que copiase los IBAN sería un segundo sitio del que robarlos.

### Capa 5 · Información al interesado

El formulario del colaborador lleva la información del artículo 13 del RGPD:
responsable, finalidad, base legal, destinatarios, plazo de conservación,
derechos y autoridad de control.

### Capa 6 · Acceso temporal

Los enlaces mágicos de colaborador caducan. Un enlace filtrado no da acceso
indefinido.

### Capa 7 · Materiales

Los archivos se sirven a través de una ruta que comprueba permisos, en vez de
redirigir a la URL de Vercel Blob. Un enlace reenviado no se convierte en acceso
permanente.

---

## 2. Lo que falta y depende de la empresa

Esto no lo resuelve el código. Son obligaciones de Jakiens Video Design SL como
responsable del tratamiento.

| Pendiente | Qué es | Urgencia |
|---|---|---|
| **Contrato de encargo (DPA) con Vercel** | Vercel aloja y procesa los datos: es encargado del tratamiento y hace falta contrato firmado (art. 28 RGPD). Vercel tiene DPA estándar, hay que aceptarlo. | Antes de producción |
| **Contrato de encargo con Prisma/proveedor de Postgres** | Igual que el anterior, para quien aloje la base de datos. | Antes de producción |
| **Contrato de encargo con la gestoría** | Recibe DNI, NAF e IBAN de todo el equipo. Si no hay contrato firmado, el envío no tiene cobertura. | Antes del primer envío |
| **Registro de actividades de tratamiento** | Documento obligatorio (art. 30 RGPD) que describe qué datos se tratan, para qué y durante cuánto. | Alta |
| **Política de conservación** | Cuatro años desde el fin de la relación (prescripción laboral y fiscal). Hace falta decidirlo y aplicarlo: hoy nada se borra solo. | Media |
| **Análisis de riesgos** | No hace falta evaluación de impacto completa (no hay perfilado ni datos de categoría especial), pero sí dejar por escrito el análisis. | Media |
| **Custodia de `DATOS_PERSONALES_KEY`** | Si se pierde, los datos cifrados son irrecuperables. Guardarla en un gestor de contraseñas de empresa, no solo en Vercel. | **Inmediata** |
| **Procedimiento ante brecha** | 72 horas para notificar a la AEPD. Conviene tener escrito quién hace qué. | Media |

### Un aviso operativo

El archivo `(P) ALTAS CREW & CAST ... .xlsx` con los datos de 43 personas está
suelto en `Documents` sin cifrar, y probablemente circule por email. Ahora que
los datos viven en la intranet, ese archivo debería dejar de usarse y borrarse
de donde esté copiado. Cada copia es una superficie de exposición más.

---

## 3. Derechos de los colaboradores

Cualquiera puede pedir acceso, rectificación, supresión, oposición, limitación o
portabilidad. Hoy se atiende a mano contra la base de datos. Si empiezan a
llegar peticiones, merece la pena construir la exportación y el borrado de una
persona como función de la app.

Ojo con la supresión: **no se puede borrar sin más** lo que haya que conservar
por obligación laboral o fiscal durante cuatro años. En ese caso lo que procede
es limitar el tratamiento, no eliminar.

---

## 4. Operativa

**Generar la clave de cifrado** (una sola vez, por entorno):

```bash
openssl rand -hex 32
```

Va en `DATOS_PERSONALES_KEY`. **Rotarla exige volver a cifrar toda la tabla
`Person`**: sin la clave original los datos no se recuperan.

**Cifrar datos que quedaran en claro** (idempotente, se puede repetir):

```bash
npx tsx --env-file=.env scripts/cifrar-datos-existentes.ts
```

**Variables de entorno necesarias en Vercel:**

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Base de datos |
| `DATOS_PERSONALES_KEY` | Cifrado de datos personales |
| `BLOB_READ_WRITE_TOKEN` | Almacenamiento de materiales |
