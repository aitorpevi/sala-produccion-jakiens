import "server-only";

/**
 * Aviso a Slack.
 *
 * Cada proyecto puede tener su propio canal (`Project.slackWebhookUrl`). Si no
 * lo tiene, cae al canal general de `SLACK_WEBHOOK_URL`. Así un proyecto recién
 * creado ya notifica sin configurar nada — antes nacía mudo hasta que alguien
 * se acordaba de pegarle el webhook a mano.
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
