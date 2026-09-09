import "server-only";

/**
 * Slack.
 *
 * Hay dos formas de hablar con Slack aquí, y conviven a propósito:
 *
 *  1. **Bot token** (`SLACK_BOT_TOKEN`). Es el camino bueno. Permite crear el
 *     canal del proyecto, meter al equipo y publicar en cualquier canal sin que
 *     nadie configure nada. Los proyectos nuevos lo usan desde el GO.
 *  2. **Incoming webhook** (`Project.slackWebhookUrl` o `SLACK_WEBHOOK_URL`). Es
 *     lo que había antes: una URL pegada a mano que solo sabe publicar en un
 *     canal concreto. Se conserva para los proyectos que ya la tienen puesta.
 *
 * Regla que atraviesa todo el archivo: **un fallo de Slack nunca rompe la acción
 * real del usuario**. Si el canal no se puede crear, el proyecto se gana igual.
 * Avisar es un extra; producir no.
 */

const API = "https://slack.com/api";

function token() {
  return process.env.SLACK_BOT_TOKEN;
}

export function haySlackApi() {
  return !!token();
}

type RespuestaSlack = { ok: boolean; error?: string; [k: string]: unknown };

/**
 * Llama a la API de Slack.
 *
 * Slack responde 200 con `{ok:false, error:"..."}` en vez de un código HTTP de
 * error, así que mirar `res.ok` no sirve de nada: hay que leer el cuerpo.
 */
async function llamar(metodo: string, cuerpo: Record<string, unknown>): Promise<RespuestaSlack> {
  const t = token();
  if (!t) return { ok: false, error: "sin_token" };

  try {
    const res = await fetch(`${API}/${metodo}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify(cuerpo),
    });
    const datos = (await res.json()) as RespuestaSlack;
    if (!datos.ok) console.error(`[slack] ${metodo}: ${datos.error}`);
    return datos;
  } catch (e) {
    console.error(`[slack] ${metodo} no se pudo llamar:`, e);
    return { ok: false, error: "fallo_red" };
  }
}

/**
 * Convierte un código de proyecto en un nombre de canal válido.
 *
 * Slack exige minúsculas, sin espacios y como mucho 80 caracteres. El prefijo
 * agrupa los canales de proyecto en el buscador, que con el tiempo es lo que
 * hace la diferencia entre una lista útil y un cajón de sastre.
 */
export function nombreDeCanal(code: string) {
  const limpio = code
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `proj-${limpio}`.slice(0, 80);
}

/**
 * Crea el canal del proyecto.
 *
 * Si el nombre ya está cogido prueba `-2`, `-3`... En Slack un canal archivado
 * sigue reservando su nombre para siempre, así que la colisión no es un caso
 * raro: basta con que un proyecto anterior se llamara igual.
 */
export async function crearCanal(code: string) {
  const base = nombreDeCanal(code);

  for (let intento = 0; intento < 5; intento++) {
    const name = intento === 0 ? base : `${base}-${intento + 1}`;
    const r = await llamar("conversations.create", { name, is_private: false });

    if (r.ok) {
      const canal = r.channel as { id: string; name: string };
      return { id: canal.id, name: canal.name };
    }
    if (r.error !== "name_taken") return null;
  }
  return null;
}

/**
 * Busca a alguien en Slack por su email de trabajo.
 *
 * Devuelve `null` si no está en el workspace, que es lo normal para los
 * producers externos: solo tienen cuenta los de casa.
 */
export async function buscarPorEmail(email: string) {
  const r = await llamar("users.lookupByEmail", { email });
  if (!r.ok) return null;
  return (r.user as { id: string }).id;
}

/**
 * Mete gente en un canal.
 *
 * Se invita de una tacada porque Slack lo admite y así un solo fallo no deja a
 * media plantilla fuera. `already_in_channel` no es un error: significa que el
 * resultado deseado ya se cumple.
 */
export async function invitar(channelId: string, userIds: string[]) {
  if (userIds.length === 0) return true;
  const r = await llamar("conversations.invite", { channel: channelId, users: userIds.join(",") });
  return r.ok || r.error === "already_in_channel";
}

/**
 * Prepara el canal de un proyecto recién ganado: lo crea, mete al equipo y deja
 * un primer mensaje con lo básico.
 *
 * Devuelve el canal creado, o `null` si no se pudo (sin token, sin permisos, o
 * Slack caído). Quien lo llama debe seguir adelante igualmente.
 */
export async function prepararCanalDeProyecto(opciones: {
  code: string;
  nombreProyecto: string;
  cliente: string;
  emails: string[];
  urlFicha?: string;
}) {
  if (!haySlackApi()) return null;

  const canal = await crearCanal(opciones.code);
  if (!canal) return null;

  // Se buscan todos los emails en paralelo y se descartan los que no tienen
  // cuenta. Que falte alguien no debe impedir que entren los demás.
  const ids = (await Promise.all(opciones.emails.map(buscarPorEmail))).filter(
    (id): id is string => !!id,
  );
  await invitar(canal.id, ids);

  const lineas = [
    `*${opciones.nombreProyecto}* · ${opciones.cliente} · \`${opciones.code}\``,
    "Proyecto ganado. Canal abierto desde el gestor de proyectos.",
    opciones.urlFicha ? `Ficha del proyecto: ${opciones.urlFicha}` : null,
  ].filter(Boolean);

  await publicar(canal.id, lineas.join("\n"));
  return canal;
}

/** Publica en un canal usando el token del bot. */
export async function publicar(channelId: string, text: string) {
  const r = await llamar("chat.postMessage", { channel: channelId, text });
  return r.ok;
}

/**
 * Aviso a Slack para un proyecto.
 *
 * Prefiere el canal creado por la app; si el proyecto es de los antiguos y solo
 * tiene webhook, tira de él; y si no hay ninguna de las dos, del canal general.
 * Así conviven los proyectos nuevos y los que ya estaban sin tocar nada.
 */
export async function avisarProyecto(
  project: { slackChannelId?: string | null; slackWebhookUrl?: string | null },
  text: string,
) {
  if (project.slackChannelId && haySlackApi()) {
    if (await publicar(project.slackChannelId, text)) return;
    // Si falla el canal (borrado, bot expulsado), aún puede quedar el webhook.
  }
  await notifySlack(project.slackWebhookUrl, text);
}

/**
 * Aviso por incoming webhook.
 *
 * Se mantiene con la firma de siempre porque lo llaman ya varias pantallas. Si
 * el proyecto no tiene webhook propio, cae al canal general de
 * `SLACK_WEBHOOK_URL`: así un proyecto recién creado no nace mudo.
 */
export async function notifySlack(webhookUrl: string | null | undefined, text: string) {
  const destino = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!destino) return;

  try {
    const res = await fetch(destino, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      // Slack responde 'invalid_token' o 'no_service' con 4xx y cuerpo de texto.
      // Sin esto, un webhook revocado fallaba en silencio para siempre.
      console.error(`[slack] ${res.status}: ${await res.text()}`);
    }
  } catch (e) {
    // Un fallo al avisar a Slack no debe romper la acción real del usuario.
    console.error("[slack] no se pudo enviar el aviso:", e);
  }
}

/**
 * Mensaje privado a una persona, por su email de trabajo.
 *
 * `chat.postMessage` admite un id de usuario como canal y Slack abre el DM solo.
 * Devuelve `false` si no hay token o si esa persona no está en el workspace: el
 * aviso dentro de la app ya se habrá guardado igualmente, así que el trabajo
 * asignado no se pierde por esto.
 */
export async function enviarDM(email: string, text: string) {
  if (!haySlackApi()) return false;
  const userId = await buscarPorEmail(email);
  if (!userId) return false;
  return publicar(userId, text);
}
