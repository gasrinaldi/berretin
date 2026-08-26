// Aviso administrativo por email (Resend, HTTP directo — sin SDK ni React
// Email) cuando se guarda un aporte o un reporte nuevo. Se llama una sola
// vez, siempre después de un INSERT ya confirmado en Supabase, y nunca
// bloquea ni revierte esa respuesta: si Resend falla, el aporte/reporte
// queda guardado igual y el remitente sigue viendo éxito. No hay reintento
// automático acá adentro — una llamada por insert confirmado es la única
// forma de que exista, así que no hay forma de que esto duplique un aviso
// por su cuenta; que no se dupare por reintentos del remitente ya lo cubre
// el rate limit existente en contribute-actions.ts/community-actions.ts
// (un doble envío rápido nunca llega a un segundo INSERT).
//
// content, alias, ubicación, década y el email del remitente NUNCA viajan
// acá: el aviso es solo "hay algo nuevo para moderar", no una copia del
// aporte. Tampoco se loguean claves, IP ni hashes — solo un mensaje breve
// si falla el envío.

type NotifyKind = "contribution" | "report";

type NotifyPayload = {
  kind: NotifyKind;
  word: string;
  detail: string;
  createdAt: Date;
};

const ADMIN_PATH: Record<NotifyKind, string> = {
  contribution: "/admin/aportes",
  report: "/admin/reportes",
};

const KIND_LABEL: Record<NotifyKind, string> = {
  contribution: "Nuevo aporte",
  report: "Nuevo reporte",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function isEnabled(): boolean {
  return process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
}

function getConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const siteUrl = process.env.SITE_URL;
  if (!apiKey || !from || !to || !siteUrl) return null;
  return { apiKey, from, to, siteUrl };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildEmail(payload: NotifyPayload, siteUrl: string) {
  const link = new URL(ADMIN_PATH[payload.kind], siteUrl).toString();
  const label = KIND_LABEL[payload.kind];
  const when = DATE_FORMATTER.format(payload.createdAt);

  const subject = `${label} · ${payload.word}`;
  const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:480px">
<p style="margin:0 0 16px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a6a2f">Berretín · moderación</p>
<p style="margin:0 0 4px"><strong>${escapeHtml(label)}</strong></p>
<p style="margin:0 0 4px">Palabra: <strong>${escapeHtml(payload.word)}</strong></p>
<p style="margin:0 0 4px">Tipo: ${escapeHtml(payload.detail)}</p>
<p style="margin:0 0 20px">Fecha: ${escapeHtml(when)}</p>
<p style="margin:0"><a href="${link}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#f5f0e1;text-decoration:none;border-radius:4px;font-size:14px">Ir a moderación</a></p>
</div>`;

  return { subject, html };
}

// Nunca lanza: cualquier falla (config incompleta, red, respuesta no-OK de
// Resend) queda contenida acá adentro. Los llamadores solo deben esperar
// esta promesa para que el runtime serverless no la corte a mitad de
// camino al cerrar la respuesta — no para decidir nada con el resultado.
export async function notifyAdmin(payload: NotifyPayload): Promise<void> {
  if (!isEnabled()) return;

  const config = getConfig();
  if (!config) return;

  try {
    const { subject, html } = buildEmail(payload, config.siteUrl);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: config.from, to: config.to, subject, html }),
    });

    if (!res.ok) {
      console.error(`[admin-notify] Resend devolvió ${res.status} al avisar "${payload.kind}".`);
    }
  } catch {
    console.error(`[admin-notify] No se pudo enviar el aviso de "${payload.kind}".`);
  }
}
