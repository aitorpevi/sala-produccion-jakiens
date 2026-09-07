import { redirect } from "next/navigation";

/**
 * El selector de proyectos ya no existe como pantalla propia.
 *
 * Era la misma lista que el gestor vista de otra forma: todo lo que salía aquí
 * —preproducción, rodaje, postpo, cierre— aparece allí, agrupado por etapa. Dos
 * puertas al mismo sitio tienen un coste real: alguien abre una, no encuentra lo
 * que busca y acaba preguntando por WhatsApp, que es justo lo que la herramienta
 * viene a quitar.
 *
 * La sala de producción de cada proyecto (`/p/[code]/...`) no cambia: se entra
 * desde su ficha en el gestor.
 *
 * Se redirige en vez de borrar la ruta porque hay enlaces a `/p` repartidos por
 * Slack y por los marcadores de la gente.
 */
export default function SelectorProyectosPage() {
  redirect("/gestor");
}
