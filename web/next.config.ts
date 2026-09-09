import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La plantilla de altas de la gestoría se lee del disco en tiempo de ejecución.
  // Sin esto, el trazado de dependencias de Vercel no la ve (no es un import) y
  // la deja fuera del bundle: la generación funcionaría en local y fallaría en
  // producción con ENOENT.
  outputFileTracingIncludes: {
    "/**": ["./src/lib/gestoria/*.xlsx"],
  },

  experimental: {
    serverActions: {
      /**
       * Las acciones de servidor vienen con 1 MB de límite de cuerpo, y por ahí
       * pasan las subidas de archivos: un briefing de agencia de 3 MB reventaba
       * con FUNCTION_PAYLOAD_TOO_LARGE (413) antes de llegar al código, así que
       * no había forma de dar un error decente.
       *
       * 4 MB y no más: Vercel corta en 4,5 MB a nivel de plataforma y ahí ya no
       * mandamos nosotros. Para archivos por encima de eso la respuesta no es
       * subir el límite, es no pasar el archivo por la función — está apuntado
       * en BITACORA.md como pendiente.
       */
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
