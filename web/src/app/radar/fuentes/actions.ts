"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { FUENTES, type Fuente } from "@/lib/ingesta";
import { normalizarUriFeed } from "@/lib/ingesta/blueskyFeed";

/**
 * Editar el radar es una acción con consecuencias: un feed mal puesto ensucia
 * el cerebro para todo el equipo. Igual que dar de alta un proyecto, solo lo
 * hace acceso total; el resto de la plantilla puede ver la pantalla, no
 * tocarla.
 */
async function requireFullParaEditar() {
  const staff = await requireStaff();
  if (staff.tier !== "FULL") redirect("/radar/fuentes?error=Solo acceso total puede editar fuentes.");
  return staff;
}

/**
 * Normaliza el término según lo que espera cada fuente. No es cosmético: un
 * feed de Bluesky guardado como URL del navegador y otro como URI at://
 * apuntando al mismo sitio crearían dos filas para una sola fuente real.
 */
function limpiarTermino(fuente: Fuente, bruto: string): { termino: string } | { error: string } {
  const t = bruto.trim();
  if (!t) return { error: "Falta el término a vigilar." };

  switch (fuente) {
    case "BLUESKY_FEED": {
      const uri = normalizarUriFeed(t);
      if (!uri) {
        return {
          error:
            'No reconozco eso como un feed de Bluesky. Pega la URL de bsky.app/profile/.../feed/... o el URI at://.',
        };
      }
      return { termino: uri };
    }
    case "BLUESKY":
      return { termino: t.replace(/^@/, "") };
    case "REDDIT":
      return { termino: t.replace(/^\/?r\//i, "").replace(/\/$/, "") };
    case "RSS": {
      const url = t.startsWith("http") ? t : `https://${t}`;
      try {
        new URL(url);
      } catch {
        return { error: "Esa URL no parece válida." };
      }
      return { termino: url };
    }
    case "BLUESKY_TRENDS":
      return { error: "Bluesky · tendencias no admite términos: son las tendencias globales de la red." };
    default:
      return { termino: t };
  }
}

export async function crearVigiladoAction(formData: FormData) {
  await requireFullParaEditar();

  const fuente = String(formData.get("fuente") ?? "") as Fuente;
  if (!FUENTES.includes(fuente)) return;

  const resultado = limpiarTermino(fuente, String(formData.get("termino") ?? ""));
  if ("error" in resultado) {
    redirect(`/radar/fuentes?error=${encodeURIComponent(resultado.error)}#${fuente}`);
  }

  const etiqueta = String(formData.get("etiqueta") ?? "").trim() || null;
  const vertical = String(formData.get("vertical") ?? "").trim() || null;
  const idioma = String(formData.get("idioma") ?? "").trim() || null;

  const existente = await db.temaSeguido.findUnique({
    where: { fuente_termino: { fuente, termino: resultado.termino } },
  });

  if (existente) {
    // Ya existía: se reactiva y se actualiza en vez de duplicar o fallar en
    // seco. Es el caso normal de "esto lo habíamos quitado y lo queremos de vuelta".
    await db.temaSeguido.update({
      where: { id: existente.id },
      data: { activo: true, etiqueta, vertical, idioma },
    });
  } else {
    await db.temaSeguido.create({
      data: { fuente, termino: resultado.termino, etiqueta, vertical, idioma },
    });
  }

  revalidatePath("/radar/fuentes");
  revalidatePath("/radar");
}

/**
 * El término en sí (`termino`) no se edita después de crearlo: cambiar en
 * silencio qué URL o cuenta lee una fila existente es más confuso que borrar y
 * volver a crear con el término correcto.
 */
export async function guardarVigiladoAction(formData: FormData) {
  await requireFullParaEditar();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.temaSeguido.update({
    where: { id },
    data: {
      etiqueta: String(formData.get("etiqueta") ?? "").trim() || null,
      vertical: String(formData.get("vertical") ?? "").trim() || null,
      idioma: String(formData.get("idioma") ?? "").trim() || null,
      activo: formData.get("activo") === "on",
    },
  });

  revalidatePath("/radar/fuentes");
  revalidatePath("/radar");
}

/** Borrado real. Las señales ya capturadas se quedan: no dependen de esta fila. */
export async function eliminarVigiladoAction(formData: FormData) {
  await requireFullParaEditar();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.temaSeguido.delete({ where: { id } }).catch(() => {});

  revalidatePath("/radar/fuentes");
  revalidatePath("/radar");
}
