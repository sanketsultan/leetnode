'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { QUALITIES, QUALITY_MAP } from '../../lib/tracks';
import type { QualityId } from '../../lib/api';
import SupportButton from '../../components/SupportButton';

interface Solve {
  slug:       string;
  difficulty: string;
  quality?:   string;
  solvedAt:   string;
  elapsedS:   number;
}

const DIFF_COLOR: Record<string, string> = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' };
const DIFF_PTS:   Record<string, number>  = { easy: 100, medium: 200, hard: 400 };

function calcScore(solve: Solve): number {
  return (DIFF_PTS[solve.difficulty] ?? 100) + (solve.elapsedS > 0 && solve.elapsedS < 300 ? 40 : 0);
}

function fmtTime(s: number): string {
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function slugToTitle(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [solves, setSolves]   = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) { setLoading(false); return; }

    fetch('/api/user/solves')
      .then(r => r.json())
      .then((data: Solve[]) => setSolves(Array.isArray(data) ? data.sort((a, b) => b.solvedAt.localeCompare(a.solvedAt)) : []))
      .catch(() => setSolves([]))
      .finally(() => setLoading(false));
  }, [session, status]);

  const u = session?.user as { login?: string; avatar?: string; name?: string; image?: string } | undefined;
  const login  = u?.login  ?? u?.name  ?? 'anonymous';
  const avatar = u?.avatar ?? u?.image ?? null;

  const totalScore = solves.reduce((sum, s) => sum + calcScore(s), 0);

  // Quality breakdown
  const byQuality = solves.reduce((acc, s) => {
    if (s.quality) acc[s.quality] = (acc[s.quality] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (status === 'loading' || loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-faint)', fontFamily: 'monospace', fontSize: '0.875rem' }}>Loading profile…</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.75rem' }}>Sign in to see your profile</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Your solve history is tied to your GitHub identity.</p>
        <button onClick={() => signIn('github')} className="btn-primary">Sign in with GitHub -&gt;</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3.5rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem', animation: 'fade-up 0.4s both' }}>
        {avatar ? (
          <img src={avatar} alt={login} width={64} height={64} style={{ borderRadius: '50%', border: '2px solid rgba(165,180,252,0.3)' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
            {login[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>GitHub Profile</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.1 }}>@{login}</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <SupportButton variant="compact" />
          <a href="/leaderboard" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}>Leaderboard</a>
          <a href="/problems" className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}>Keep solving -&gt;</a>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '2rem', animation: 'fade-up 0.4s 0.05s both' }}>
        {[
          { n: solves.length, label: 'Problems solved' },
          { n: totalScore.toLocaleString(), label: 'Total score' },
          { n: solves.length > 0 ? fmtTime(Math.round(solves.reduce((s, v) => s + v.elapsedS, 0) / solves.length)) : '—', label: 'Avg solve time' },
        ].map(({ n, label }) => (
          <div key={label} className="hero-stat-card" style={{ borderRadius: 0, border: 'none', padding: '1.25rem' }}>
            <div className="stat-number" style={{ fontSize: '1.5rem' }}>{n}</div>
            <div className="stat-label" style={{ fontSize: '0.5625rem', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Quality breakdown */}
      {solves.length > 0 && (
        <div style={{ marginBottom: '2rem', animation: 'fade-up 0.4s 0.1s both' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.875rem' }}>Quality breakdown</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {QUALITIES.map(q => {
              const count = byQuality[q.id] ?? 0;
              return (
                <div key={q.id} style={{ padding: '1rem 1.25rem', background: count > 0 ? q.dimColor : 'var(--bg-card)', border: `1px solid ${count > 0 ? q.color + '33' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '0.6875rem', color: count > 0 ? q.color : 'var(--text-faint)', fontWeight: 700, marginBottom: '0.375rem' }}>{q.title}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: count > 0 ? q.color : 'var(--text-faint)', lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--text-faint)', marginTop: '0.25rem', letterSpacing: '0.06em' }}>SOLVED</div>
                  {/* Progress bar */}
                  <div style={{ height: '2px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.75rem' }}>
                    <div style={{ height: '100%', background: q.color, width: `${(count / Math.max(q.problemSlugs.length, 1)) * 100}%`, borderRadius: '999px', transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-faint)', marginTop: '0.25rem' }}>{count}/{q.problemSlugs.length} available</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Solve history */}
      <div style={{ animation: 'fade-up 0.4s 0.15s both' }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.875rem' }}>
          Solve history {solves.length > 0 ? `· ${solves.length} problems` : ''}
        </p>

        {solves.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(99,102,241,0.15)', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No solves yet. Pick a problem and get started.</p>
            <a href="/problems" className="btn-primary">Browse problems -&gt;</a>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--bg-card)' }}>
            {solves.map((solve, i) => {
              const q = solve.quality ? QUALITY_MAP[solve.quality as QualityId] : null;
              const pts = calcScore(solve);
              const speedBonus = solve.elapsedS > 0 && solve.elapsedS < 300;
              return (
                <a key={`${solve.slug}-${i}`} href={`/problems/${solve.slug}`}
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', alignItems: 'center', padding: '0.875rem 1.25rem', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Title + quality */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
                      {slugToTitle(solve.slug)}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${solve.difficulty}`}>{solve.difficulty}</span>
                      {q && (
                        <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.4rem', borderRadius: '4px', background: q.dimColor, color: q.color, border: `1px solid ${q.color}22`, fontWeight: 600 }}>
                          {q.title}
                        </span>
                      )}
                      {speedBonus && (
                        <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.4rem', borderRadius: '4px', background: 'rgba(165,180,252,0.08)', color: '#a5b4fc', border: '1px solid rgba(165,180,252,0.2)', fontWeight: 600 }}>
                          ⚡ speed
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Time to solve */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{fmtTime(solve.elapsedS)}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-faint)', marginTop: '0.125rem' }}>solve time</div>
                  </div>
                  {/* Score */}
                  <div style={{ textAlign: 'right', minWidth: 52 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: DIFF_COLOR[solve.difficulty] ?? 'var(--text)', fontFamily: 'monospace' }}>+{pts}</div>
                    <div style={{ fontSize: '0.5625rem', color: 'var(--text-faint)', letterSpacing: '0.06em' }}>PTS</div>
                  </div>
                  {/* Date */}
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>{fmtDate(solve.solvedAt)}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
