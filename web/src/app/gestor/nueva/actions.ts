"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { CLAVES_PRODUCTORA, type ClaveProductora } from "@/lib/productoras";
import { fechaDesdeInput } from "@/lib/hitos";

/**
 * Da de alta una oportunidad de venta.
 *
 * A diferencia del alta de `/p/nuevo`, que se rellena tras el GO y arranca la
 * sala de producción, aquí casi nada se sabe todavía: puede no haber realizador,
 * ni formato cerrado, ni fechas de rodaje. Solo se pide lo que de verdad existe
 * cuando aparece una oportunidad —quién la pide, cómo la llamamos y para cuándo
 * hay que presentarla— porque un formulario que exige quince campos el día que
 * entra el brief acaba rellenándose con basura o no rellenándose.
 *
 * Los campos que el modelo tiene como obligatorios y aquí no se piden se
 * guardan vacíos, igual que ya hace `/p/nuevo` cuando se dejan en blanco.
 */
export async function crearOportunidadAction(formData: FormData) {
  const staff = await requireStaff();
  // Quien vuelca las oportunidades es el equipo de venta (Javier y Aitor), que
  // están en el nivel FULL. Carmen deriva el trabajo, pero no origina la ficha.
  if (staff.tier !== "FULL") return;

  const productoraBruta = String(formData.get("productora") ?? "JAKIENS").trim().toUpperCase();
  const productora: ClaveProductora = CLAVES_PRODUCTORA.includes(productoraBruta as ClaveProductora)
    ? (productoraBruta as ClaveProductora)
    : "JAKIENS";

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const client = String(formData.get("client") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const agencia = String(formData.get("agencia") ?? "").trim();
  const director = String(formData.get("director") ?? "").trim();
  const format = String(formData.get("format") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const entrega = fechaDesdeInput(String(formData.get("entregaPropuesta") ?? ""));

  if (!code || !client || !name) {
    redirect("/gestor/nueva?error=faltan_campos");
  }

  if (await db.project.findUnique({ where: { code } })) {
    redirect("/gestor/nueva?error=codigo_duplicado");
  }

  const project = await db.project.create({
    data: {
      productora,
      code,
      client,
      name,
      agencia,
      director,
      format,
      location: "",
      shootLabel: "",
      etapa: "VENTA",
      estado: "OPORTUNIDAD",
    },
  });

  // La fecha de entrega de la propuesta es el primer hito de casi todos los
  // proyectos, y muchas veces el único que se conoce el primer día. Sin ella la
  // oportunidad no aparece en el calendario, que es justo donde tiene que verse.
  if (entrega) {
    await db.hito.create({
      data: {
        projectId: project.id,
        etapa: "VENTA",
        tipo: "ENTREGA_PROPUESTA",
        titulo: "Entrega de propuesta",
        fecha: entrega,
        criticidad: "ALTA",
        notas: notas || null,
        responsableId: staff.id,
      },
    });
  }

  redirect(`/gestor/${project.code}`);
}
