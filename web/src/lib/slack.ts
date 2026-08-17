import "server-only";

export async function notifySlack(webhookUrl: string | null | undefined, text: string) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Un fallo al avisar a Slack no debe romper la acción real del usuario.
  }
}
