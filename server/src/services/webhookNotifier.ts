/**
 * services/webhookNotifier.ts
 * ------------------------------------------------------------------
 * Alertas fuera de la app: además del sonido/notificación del
 * navegador (que solo funcionan con la pestaña abierta), la app puede
 * avisar a un webhook externo cuando aparece una surebet o cuota de
 * valor nueva que supera el umbral configurado. Pensado sobre todo
 * para servicios de notificación push al móvil sin cuenta ni backend
 * propio, como ntfy.sh (https://ntfy.sh/tu-tema-secreto), pero también
 * admite un webhook de Discord o de Slack.
 *
 * Deduplicación: se guarda en memoria qué IDs ya se notificaron, para
 * no reenviar la misma oportunidad en cada refresco de 30s mientras
 * siga activa. Si una oportunidad deja de aparecer y luego reaparece,
 * se trata como nueva otra vez.
 * ------------------------------------------------------------------
 */

const notifiedIds: Record<string, Set<string>> = {};

function buildPayload(url: string, title: string, text: string): { body: string; headers: Record<string, string> } {
  if (url.includes('discord.com/api/webhooks')) {
    return {
      body: JSON.stringify({ content: `**${title}**\n${text}` }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
  if (url.includes('hooks.slack.com')) {
    return {
      body: JSON.stringify({ text: `*${title}*\n${text}` }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
  // Genérico (ntfy.sh y compatibles): todo en el cuerpo en texto plano.
  // OJO: el título NO se manda en una cabecera HTTP (p.ej. `Title`) porque
  // los valores de cabecera deben ser ByteString/Latin-1, y los títulos de
  // esta app incluyen emojis (ej. "🎯 Nueva oportunidad"), lo que hace que
  // fetch() lance un error en tiempo de ejecución al construir la petición.
  return {
    body: `${title}\n${text}`,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  };
}

/** Lanza si el envío falla (red o respuesta no-2xx). Lo usa `sendTestWebhook`
 * para poder informar de verdad al botón "Enviar prueba" de Configuración. */
async function sendWebhookOrThrow(url: string, title: string, text: string): Promise<void> {
  const { body, headers } = buildPayload(url, title, text);
  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) {
    throw new Error(`El webhook respondió ${res.status}`);
  }
}

/** Envío silencioso usado por las alertas automáticas: un webhook caído o
 * mal configurado nunca debe tumbar la petición del usuario que consulta cuotas. */
async function sendWebhook(url: string, title: string, text: string): Promise<void> {
  try {
    await sendWebhookOrThrow(url, title, text);
  } catch (err) {
    console.error('[webhook] error enviando notificación:', (err as Error).message);
  }
}

interface NotifiableItem {
  id: string;
  eventName: string;
  competition: string;
}

/**
 * Notifica las oportunidades NUEVAS de esta categoría (surebets,
 * cuotas de valor...) desde la última vez que se llamó. `category`
 * mantiene la deduplicación separada entre tipos de alerta.
 */
export function notifyNewOpportunities<T extends NotifiableItem>(
  category: string,
  items: T[],
  webhookUrl: string,
  webhookAlertsEnabled: boolean,
  describe: (item: T) => string
): void {
  if (!webhookAlertsEnabled || !webhookUrl) return;

  const seen = notifiedIds[category] ?? new Set<string>();
  const currentIds = new Set(items.map((i) => i.id));
  const newItems = items.filter((i) => !seen.has(i.id));

  // Solo se conservan como "ya notificados" los que siguen activos en
  // este refresco: si una oportunidad desaparece, la próxima vez que
  // vuelva a aparecer se notificará de nuevo.
  notifiedIds[category] = currentIds;

  if (newItems.length === 0) return;

  const title =
    newItems.length === 1
      ? `🎯 Nueva oportunidad — ${newItems[0].eventName}`
      : `🎯 ${newItems.length} oportunidades nuevas`;
  const text = newItems.map(describe).join('\n');

  void sendWebhook(webhookUrl, title, text);
}

/** Solo para el botón "Enviar prueba" de Configuración: SÍ propaga el error. */
export function sendTestWebhook(webhookUrl: string): Promise<void> {
  return sendWebhookOrThrow(
    webhookUrl,
    '✅ Prueba de Surebets App',
    'Si ves este mensaje, las alertas por webhook están funcionando correctamente.'
  );
}
