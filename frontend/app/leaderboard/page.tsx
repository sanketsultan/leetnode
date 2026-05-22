'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { QUALITIES, QUALITY_MAP } from '../../lib/tracks';
import type { QualityId } from '../../lib/api';

interface LeaderboardEntry {
  login:        string;
  avatar:       string;
  solved:       number;
  score:        number;
  lastSolvedAt: string;
  qualities:    Record<string, number>;
}

const TOTAL_PROBLEMS = 11;

function avatarGradient(login: string) {
  const h1 = (login.charCodeAt(0) * 47 + 120) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},60%,35%), hsl(${h2},60%,25%))`;
}

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p    = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(target * ease));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);
  return val;
}

function Avatar({ login, avatar, size = 44 }: { login: string; avatar?: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (avatar && !err) {
    return (
      <img src={avatar} alt={login} width={size} height={size} onError={() => setErr(true)}
        style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarGradient(login),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: 'white', flexShrink: 0,
    }}>
      {login[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const score   = useCountUp(entry.score, 1400, 200 + rank * 150);
  const isFirst = rank === 1;
  const rankColors = ['', '#a5b4fc', '#9ca3af', '#f59e0b'];

  // Top quality for this user
  const topQuality = Object.entries(entry.qualities).sort((a, b) => b[1] - a[1])[0];
  const qualityData = topQuality ? QUALITY_MAP[topQuality[0] as QualityId] : null;

  return (
    <div style={{
      background: isFirst
        ? 'linear-gradient(160deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.07) 100%)'
        : 'var(--bg-card)',
      border: `1px solid ${isFirst ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-xl)',
      padding: isFirst ? '2.5rem 1.5rem 1.75rem' : '1.75rem 1.5rem',
      textAlign: 'center',
      order: rank === 1 ? 1 : rank === 2 ? 0 : 2,
      position: 'relative', overflow: 'hidden',
      boxShadow: isFirst ? '0 0 60px rgba(99,102,241,0.15)' : 'none',
      animation: `podium-in 0.5s ${0.1 + rank * 0.12}s both`,
    }}>
      {isFirst && (
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', color: rankColors[rank], marginBottom: '1rem', position: 'relative' }}>
        {String(rank).padStart(2, '0')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.875rem', position: 'relative' }}>
        <Avatar login={entry.login} avatar={entry.avatar} size={isFirst ? 52 : 44} />
      </div>
      <div style={{ fontSize: isFirst ? '1rem' : '0.9375rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem', color: 'var(--text)', position: 'relative' }}>
        {entry.login}
      </div>
      {qualityData && (
        <div style={{ fontSize: '0.625rem', color: qualityData.color, fontFamily: 'monospace', letterSpacing: '0.06em', marginBottom: '1rem', opacity: 0.8, position: 'relative' }}>
          {qualityData.title}
        </div>
      )}
      <div style={{ fontSize: isFirst ? '2rem' : '1.625rem', fontWeight: 800, letterSpacing: '-0.05em', color: isFirst ? '#a5b4fc' : 'var(--text)', fontVariantNumeric: 'tabular-nums', position: 'relative', lineHeight: 1 }}>
        {score.toLocaleString()}
      </div>
      <div style={{ fontSize: '0.625rem', color: 'var(--text-faint)', marginTop: '0.25rem', letterSpacing: '0.08em', position: 'relative' }}>PTS</div>
      <div style={{ marginTop: '1rem', position: 'relative' }}>
        <div style={{ height: '2px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            background: isFirst ? 'var(--gradient)' : `hsl(${220 + rank * 20},70%,60%)`,
            width: `${(entry.solved / TOTAL_PROBLEMS) * 100}%`,
            animation: `bar-grow 1.2s ${0.3 + rank * 0.15}s both`, transformOrigin: 'left',
          }} />
        </div>
        <div style={{ fontSize: '0.5625rem', color: 'var(--text-faint)', marginTop: '0.375rem', letterSpacing: '0.06em' }}>
          {entry.solved}/{TOTAL_PROBLEMS} solved
        </div>
      </div>
    </div>
  );
}

const LIVE_EVENTS = [
  'Someone just solved a Perseverance problem',
  'New solver joined the leaderboard',
  'System Thinking problem solved in under 5m',
  'A Curiosity problem just got cracked',
  'Distribution track: new solve',
  'Someone is debugging right now',
];

function LiveFeed() {
  const [idx, setIdx]       = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % LIVE_EVENTS.length); setVisible(true); }, 400);
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.875rem', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '999px', fontSize: '0.75rem' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 6px #22c55e', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
      <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 500, opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
        {LIVE_EVENTS[idx]}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const { data: session }   = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: LeaderboardEntry[]) => { setEntries(Array.isArray(data) ? data : []); })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const isSignedIn = !!session?.user;
  const u = session?.user as { login?: string; image?: string; avatar?: string } | undefined;
  const myLogin  = u?.login ?? u?.name ?? null;
  const myEntry  = myLogin ? entries.find(e => e.login === myLogin) : null;
  const myRank   = myEntry ? entries.indexOf(myEntry) + 1 : null;
  const maxScore = entries[0]?.score ?? 1;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3.5rem 1.5rem', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem', position: 'relative', zIndex: 1, animation: 'fade-up 0.5s 0.05s both' }}>
        <div>
          <p className="section-label" style={{ marginBottom: '0.5rem' }}>Community</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.5rem', lineHeight: 1.1 }}>
            <span className="gradient-text">Top debuggers.</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '380px' }}>
            Real solves. Real GitHub identities. Updated on every solve.
          </p>
        </div>
        {mounted && <LiveFeed />}
      </div>

      {/* Your banner — signed in with a rank */}
      {isSignedIn && myEntry && (
        <div style={{ padding: '1.125rem 1.5rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', animation: 'fade-up 0.4s 0.1s both', position: 'relative', zIndex: 1 }}>
          <Avatar login={myEntry.login} avatar={myEntry.avatar} size={36} />
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>@{myEntry.login}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {myEntry.solved} solved · rank <span style={{ color: 'var(--text)', fontWeight: 700 }}>#{myRank}</span> · {myEntry.score.toLocaleString()} pts
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <a href="/profile" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}>My profile</a>
            <a href="/problems" className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}>Keep solving -&gt;</a>
          </div>
        </div>
      )}

      {/* Sign in CTA */}
      {!isSignedIn && (
        <div style={{ padding: '1rem 1.5rem', marginBottom: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', animation: 'fade-up 0.4s 0.1s both', position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sign in with GitHub to appear on the leaderboard.</span>
          <button onClick={() => signIn('github')} style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
            Sign in -&gt;
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-faint)', position: 'relative', zIndex: 1 }}>
          <p className="text-sm font-mono">Loading leaderboard…</p>
        </div>
      ) : entries.length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: 'center', padding: '5rem 2rem', position: 'relative', zIndex: 1, border: '1px dashed rgba(99,102,241,0.2)', borderRadius: 'var(--radius-xl)', animation: 'fade-up 0.5s 0.2s both' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>No one here yet.</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Be the first on the leaderboard. Solve a problem and your name goes up.</p>
          <a href="/problems" className="btn-primary">Pick a problem -&gt;</a>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {entries.length >= 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '2.5rem', position: 'relative', zIndex: 1 }}>
              {entries.slice(0, 3).map((entry, i) => (
                <PodiumCard key={entry.login} entry={entry} rank={i + 1} />
              ))}
            </div>
          )}

          {/* Full table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', zIndex: 1, animation: 'fade-up 0.5s 0.35s both' }}>
            <div className="lb-row-header">
              {['Rank', 'Debugger', 'Solved', 'Top Quality', 'Score'].map((h, i) => (
                <div key={h} style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : undefined }}>
                  {h}
                </div>
              ))}
            </div>

            {entries.map((entry, i) => {
              const isMe = entry.login === myLogin;
              const topQuality = Object.entries(entry.qualities).sort((a, b) => b[1] - a[1])[0];
              const qData = topQuality ? QUALITY_MAP[topQuality[0] as QualityId] : null;
              return (
                <div key={entry.login} className={`lb-row${isMe ? ' lb-row-you' : ''}`} style={{ animation: `fade-up 0.35s ${0.4 + i * 0.04}s both` }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? '#a5b4fc' : i === 1 ? '#9ca3af' : i === 2 ? '#f59e0b' : 'var(--text-faint)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                    #{i + 1}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <Avatar login={entry.login} avatar={entry.avatar} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isMe ? '#a5b4fc' : 'var(--text)' }}>
                        {entry.login}{isMe ? ' (you)' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>{entry.solved}</div>
                    <div style={{ height: '2px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', width: '40px', margin: '0.2rem auto 0' }}>
                      <div style={{ height: '100%', background: i < 3 ? 'var(--gradient)' : 'var(--accent)', width: `${(entry.solved / TOTAL_PROBLEMS) * 100}%`, borderRadius: '999px', animation: `bar-grow 0.8s ${0.5 + i * 0.05}s both`, transformOrigin: 'left' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {qData ? (
                      <span style={{ fontSize: '0.625rem', padding: '0.1875rem 0.5rem', borderRadius: '4px', background: qData.dimColor, color: qData.color, border: `1px solid ${qData.color}33`, fontWeight: 600 }}>
                        {qData.title}
                      </span>
                    ) : <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>—</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: i === 0 ? '#a5b4fc' : 'var(--text)' }}>
                      {entry.score.toLocaleString()}
                    </div>
                    <div style={{ height: '2px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.2rem' }}>
                      <div style={{ height: '100%', background: i === 0 ? 'var(--gradient)' : `rgba(99,102,241,${0.3 + (1 - i / entries.length) * 0.5})`, width: `${(entry.score / maxScore) * 100}%`, borderRadius: '999px', animation: `bar-grow 1s ${0.5 + i * 0.05}s both`, transformOrigin: 'left' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Scoring breakdown */}
      <div style={{ marginTop: '2.5rem', position: 'relative', zIndex: 1, animation: 'fade-up 0.5s 0.5s both' }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem', fontWeight: 600 }}>How scoring works</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--border-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {[
            { label: 'Easy',        pts: '+100', color: '#4ade80' },
            { label: 'Medium',      pts: '+200', color: '#fbbf24' },
            { label: 'Hard',        pts: '+400', color: '#f87171' },
            { label: 'Speed <5m',   pts: '+40',  color: '#a5b4fc' },
          ].map(({ label, pts, color }) => (
            <div key={label} style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color, fontFamily: 'monospace' }}>{pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
