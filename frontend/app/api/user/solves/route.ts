import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3001';

type SessionUser = { login?: string; avatar?: string; name?: string; image?: string };

// POST /api/user/solves — record a solve (requires GitHub session)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const u = session.user as SessionUser;
  const login  = u.login  ?? u.name  ?? 'anonymous';
  const avatar = u.avatar ?? u.image ?? '';

  const body = await req.json() as { slug?: string; difficulty?: string; quality?: string; elapsedS?: number };

  const res = await fetch(`${BACKEND}/api/solves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, avatar, ...body }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}

// GET /api/user/solves — fetch current user's solve history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const u = session.user as SessionUser;
  const login = u.login ?? u.name ?? 'anonymous';

  const res = await fetch(`${BACKEND}/api/solves/user/${encodeURIComponent(login)}`);
  const data = await res.json();
  return NextResponse.json(data);
}
