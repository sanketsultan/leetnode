export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  FEEDBACK_TO: string;
  ALLOWED_ORIGIN: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cors(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || 'https://leetnode.io';
    const headers = cors(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    let body: { email?: string; message?: string; page?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, headers);
    }

    const { email = '', message = '', page = '' } = body;

    // Validate
    if (!email.trim()) return json({ error: 'Email is required' }, 400, headers);
    if (!EMAIL_RE.test(email.trim())) return json({ error: 'Please enter a valid email address' }, 400, headers);
    if (!message.trim()) return json({ error: 'Message is required' }, 400, headers);
    if (message.trim().length < 10) return json({ error: 'Feedback must be at least 10 characters' }, 400, headers);
    if (message.trim().length > 2000) return json({ error: 'Feedback must be under 2000 characters' }, 400, headers);

    const cleanEmail   = email.trim().toLowerCase();
    const cleanMessage = message.trim();
    const cleanPage    = page?.trim() || 'unknown';

    // 1. Save to D1
    try {
      await env.DB.prepare(
        'INSERT INTO feedback (email, message, page) VALUES (?, ?, ?)'
      ).bind(cleanEmail, cleanMessage, cleanPage).run();
    } catch (err) {
      console.error('[D1] Insert failed:', err);
      // Don't fail the whole request if DB is down — still send email
    }

    // 2. Send email via Resend
    if (env.RESEND_API_KEY && env.FEEDBACK_TO) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LeetNode Feedback <connect@leetnode.io>',
            to: [env.FEEDBACK_TO],
            replyTo: cleanEmail,
            subject: `[Feedback] from ${cleanEmail}`,
            html: buildHtml(cleanEmail, cleanPage, cleanMessage),
            text: `From: ${cleanEmail}\nPage: ${cleanPage}\n\n${cleanMessage}`,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          console.error('[Resend] Error:', err);
        }
      } catch (err) {
        console.error('[Resend] Fetch failed:', err);
      }
    }

    return json({ ok: true }, 200, headers);
  },
};

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function buildHtml(email: string, page: string, message: string): string {
  return `
    <div style="font-family:monospace;background:#07071a;color:#e2e8f0;padding:24px;border-radius:8px;max-width:600px">
      <div style="font-size:11px;color:#6366f1;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px;font-weight:700">
        LeetNode Feedback
      </div>
      <table style="width:100%;font-size:13px;margin-bottom:20px;border-collapse:collapse">
        <tr>
          <td style="color:#6b7280;padding:4px 12px 4px 0;width:60px;white-space:nowrap">From</td>
          <td><a href="mailto:${email}" style="color:#a5b4fc;text-decoration:none">${email}</a></td>
        </tr>
        <tr>
          <td style="color:#6b7280;padding:4px 12px 4px 0;white-space:nowrap">Page</td>
          <td style="color:#9ca3af">${page}</td>
        </tr>
      </table>
      <div style="background:#0d0d1f;border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:16px;font-size:13px;line-height:1.7;color:#d1d5db;white-space:pre-wrap">${message}</div>
      <div style="margin-top:16px;font-size:11px;color:#374151">
        Reply to this email to respond directly to ${email}
      </div>
    </div>
  `.trim();
}
