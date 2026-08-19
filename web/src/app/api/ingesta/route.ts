import { NextRequest } from "next/server";
import { ingerir, ingerirTodo, FUENTES, type Fuente } from "@/lib/ingesta";

/**
 * Dispara la ingesta de tendencias. La llama el cron de Vercel.
 *
 * Protegida con `CRON_SECRET`: sin ella, cualquiera podría lanzar pasadas
 * continuamente y hacer que las APIs públicas nos bloqueen por abuso. Vercel
 * manda ese secreto en la cabecera Authorization en sus llamadas programadas.
 *
 *   GET /api/ingesta            → todas las fuentes
 *   GET /api/ingesta?fuente=RSS → solo una
 */

// Una pasada completa tarda bastante: varias fuentes exigen espaciar llamadas.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json(
      { error: "Falta CRON_SECRET. Sin ella no se expone la ingesta." },
      { status: 503 },
    );
  }

  const cabecera = request.headers.get("authorization");
  if (cabecera !== `Bearer ${secreto}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const pedida = request.nextUrl.searchParams.get("fuente");

  try {
    if (pedida) {
      const fuente = pedida.toUpperCase() as Fuente;
      if (!FUENTES.includes(fuente)) {
        return Response.json(
          { error: `Fuente desconocida. Opciones: ${FUENTES.join(", ")}` },
          { status: 400 },
        );
      }
      return Response.json({ resultados: [await ingerir(fuente)] });
    }

    return Response.json({ resultados: await ingerirTodo() });
  } catch (e) {
    console.error("[ingesta] la pasada ha fallado:", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
