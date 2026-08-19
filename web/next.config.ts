import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La plantilla de altas de la gestoría se lee del disco en tiempo de ejecución.
  // Sin esto, el trazado de dependencias de Vercel no la ve (no es un import) y
  // la deja fuera del bundle: la generación funcionaría en local y fallaría en
  // producción con ENOENT.
  outputFileTracingIncludes: {
    "/**": ["./src/lib/gestoria/*.xlsx"],
  },
};

export default nextConfig;
