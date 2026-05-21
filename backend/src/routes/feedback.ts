import { Router, Request, Response } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { config } from '../config';

const router = Router();

const FeedbackSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  message: z
    .string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be under 2000 characters'),
  page: z.string().optional(),
});

function createTransporter() {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
}

// POST /api/feedback
router.post('/', async (req: Request, res: Response) => {
  const parsed = FeedbackSchema.safeParse(req.body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    res.status(400).json({ error: firstError.message });
    return;
  }

  const { email, message, page } = parsed.data;

  // If email is not configured just log and ack (dev mode)
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.FEEDBACK_TO) {
    console.log('[Feedback] Email not configured — logging only');
    console.log(`  From: ${email}`);
    console.log(`  Page: ${page ?? 'unknown'}`);
    console.log(`  Message: ${message}`);
    res.json({ ok: true });
    return;
  }

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"LeetNode Feedback" <${config.SMTP_USER}>`,
      to: config.FEEDBACK_TO,
      replyTo: email,
      subject: `[LeetNode Feedback] from ${email}`,
      text: [
        `From: ${email}`,
        `Page: ${page ?? 'unknown'}`,
        '',
        message,
      ].join('\n'),
      html: `
        <div style="font-family:monospace;background:#07071a;color:#e2e8f0;padding:24px;border-radius:8px;max-width:600px">
          <div style="font-size:11px;color:#6366f1;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">LeetNode Feedback</div>
          <table style="width:100%;font-size:13px;margin-bottom:20px">
            <tr><td style="color:#6b7280;padding:4px 0;width:60px">From</td><td><a href="mailto:${email}" style="color:#a5b4fc">${email}</a></td></tr>
            <tr><td style="color:#6b7280;padding:4px 0">Page</td><td style="color:#9ca3af">${page ?? 'unknown'}</td></tr>
          </table>
          <div style="background:#0d0d1f;border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:16px;font-size:13px;line-height:1.7;color:#d1d5db;white-space:pre-wrap">${message}</div>
          <div style="margin-top:16px;font-size:11px;color:#374151">Reply to this email to respond directly to the user.</div>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[Feedback] Failed to send email:', err);
    res.status(500).json({ error: 'Failed to send feedback. Please try again.' });
  }
});

export default router;
