import { NextRequest, NextResponse } from 'next/server';
import { appendFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const sanitized = email.trim().toLowerCase().slice(0, 256);
    const line = `${new Date().toISOString()}\t${sanitized}\n`;

    // Append to a local file — swap with Resend/Mailchimp/PostHog later
    const filePath = join(process.cwd(), '..', 'waitlist.txt');
    await appendFile(filePath, line, 'utf8');

    return NextResponse.json({ ok: true });
  } catch {
    // Silently succeed even if file write fails
    return NextResponse.json({ ok: true });
  }
}
