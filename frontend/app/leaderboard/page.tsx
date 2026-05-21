'use client';

import { useState, useEffect, useRef } from 'react';

const SOLVED_KEY = 'leetnode:solved';

const MOCK_USERS = [
  { rank: 1,  handle: 'sre_phantom',    solved: 6, streak: 14, score: 1240, specialty: 'Networking' },
  { rank: 2,  handle: 'kernelpanic_',   solved: 6, streak: 9,  score: 1180, specialty: 'Linux' },
  { rank: 3,  handle: 'devops_nakash',  solved: 5, streak: 11, score: 980,  specialty: 'GPU/ML' },
  { rank: 4,  handle: 'kubernetix',     solved: 5, streak: 6,  score: 870,  specialty: 'Production' },
  { rank: 5,  handle: 'null_pointer_',  solved: 4, streak: 8,  score: 760,  specialty: 'Networking' },
  { rank: 6,  handle: 'sk_reddy',       solved: 4, streak: 3,  score: 640,  specialty: 'Linux' },
  { rank: 7,  handle: 'infra_witch',    solved: 3, streak: 5,  score: 560,  specialty: 'Production' },
  { rank: 8,  handle: 'prod_debugger',  solved: 3, streak: 2,  score: 480,  specialty: 'Linux' },
  { rank: 9,  handle: 'ml_oncall',      solved: 2, streak: 4,  score: 320,  specialty: 'GPU/ML' },
  { rank: 10, handle: 'sys_admin_404',  solved: 2, streak: 1,  score: 280,  specialty: 'Linux' },
];

const MAX_SCORE = MOCK_USERS[0].score;
const MAX_SOLVED = 6;

// Generate a deterministic avatar color from handle
function avatarGradient(handle: string) {
  const h1 = (handle.charCodeAt(0) * 47 + 120) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},60%,35%), hsl(${h2},60%,25%))`;
}

// Score counter animation hook
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setVal(Math.round(target * ease));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);
  return val;
}

// Podium card with animated score
function PodiumCard({ user, i }: { user: typeof MOCK_USERS[0]; i: number }) {
  const score = useCountUp(user.score, 1400, 200 + i * 150);
  const isFirst = i === 0;

  const rankColors = ['#a5b4fc', '#9ca3af', '#f59e0b'];
  const rankLabels = ['01', '02', '03'];

  return (
    <div style={{
      background: isFirst
        ? 'linear-gradient(160deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.07) 100%)'
        : 'var(--bg-card)',
      border: `1px solid ${isFirst ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-xl)',
      padding: isFirst ? '2.5rem 1.5rem 1.75rem' : '1.75rem 1.5rem',
      textAlign: 'center',
      order: i === 0 ? 1 : i === 1 ? 0 : 2,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: isFirst ? '0 0 60px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.1)' : 'none',
      transition: 'transform 0.25s, box-shadow 0.25s',
      animation: `podium-in 0.5s ${0.1 + i * 0.12}s both`,
    }}>
      {/* Glow orb behind #1 */}
      {isFirst && (
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Rank number */}
      <div style={{
        fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 700,
        letterSpacing: '0.2em', color: rankColors[i],
        marginBottom: '1rem', position: 'relative',
      }}>
        {rankLabels[i]}
      </div>

      {/* Avatar */}
      <div style={{
        width: isFirst ? '52px' : '44px',
        height: isFirst ? '52px' : '44px',
        borderRadius: '50%',
        background: avatarGradient(user.handle),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isFirst ? '1.125rem' : '0.9375rem',
        fontWeight: 800, color: 'white',
        margin: '0 auto 0.875rem',
        boxShadow: isFirst ? `0 0 0 2px rgba(165,180,252,0.4)` : 'none',
        position: 'relative',
        border: isFirst ? '2px solid rgba(165,180,252,0.3)' : '1px solid rgba(255,255,255,0.05)',
      }}>
        {user.handle[0].toUpperCase()}
      </div>

      {/* Handle */}
      <div style={{
        fontSize: isFirst ? '1rem' : '0.9375rem',
        fontWeight: 700, letterSpacing: '-0.02em',
        marginBottom: '0.25rem', color: 'var(--text)',
        position: 'relative',
      }}>
        {user.handle}
      </div>

      {/* Specialty tag */}
      <div style={{
        fontSize: '0.625rem', color: rankColors[i],
        fontFamily: 'monospace', letterSpacing: '0.06em',
        marginBottom: '1rem', opacity: 0.8,
        position: 'relative',
      }}>
        {user.specialty}
      </div>

      {/* Animated score */}
      <div style={{
        fontSize: isFirst ? '2rem' : '1.625rem',
        fontWeight: 800, letterSpacing: '-0.05em',
        color: isFirst ? '#a5b4fc' : 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
        position: 'relative',
        lineHeight: 1,
      }}>
        {score.toLocaleString()}
      </div>
      <div style={{ fontSize: '0.625rem', color: 'var(--text-faint)', marginTop: '0.25rem', letterSpacing: '0.08em', position: 'relative' }}>
        PTS
      </div>

      {/* Streak chip */}
      {user.streak > 4 && (
        <div style={{
          marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.25rem 0.625rem', borderRadius: '999px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          fontSize: '0.625rem', color: '#f59e0b', fontFamily: 'monospace',
          position: 'relative',
        }}>
          <span style={{ animation: 'pulse-dot 1.5s ease-in-out infinite', display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} />
          {user.streak}d streak
        </div>
      )}

      {/* Solved bar */}
      <div style={{ marginTop: '1rem', position: 'relative' }}>
        <div style={{
          height: '2px', background: 'var(--border-subtle)',
          borderRadius: '999px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            background: isFirst ? 'var(--gradient)' : `hsl(${220 + i * 20},70%,60%)`,
            width: `${(user.solved / MAX_SOLVED) * 100}%`,
            transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
            animation: `bar-grow 1.2s ${0.3 + i * 0.15}s both`,
            transformOrigin: 'left',
          }} />
        </div>
        <div style={{ fontSize: '0.5625rem', color: 'var(--text-faint)', marginTop: '0.375rem', letterSpacing: '0.06em' }}>
          {user.solved}/{MAX_SOLVED} solved
        </div>
      </div>
    </div>
  );
}

// Live activity bar — purely decorative fake live feed
const LIVE_EVENTS = [
  'sre_phantom solved nginx-502 in 4m',
  'kernelpanic_ started k8s-crashloop',
  'devops_nakash solved gpu-oom-killer',
  'null_pointer_ is debugging disk-flood',
  'infra_witch solved logrotate-flood in 8m',
  'sk_reddy started python-memleak',
];

function LiveFeed() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % LIVE_EVENTS.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.625rem',
      padding: '0.5rem 0.875rem',
      background: 'rgba(34,197,94,0.05)',
      border: '1px solid rgba(34,197,94,0.15)',
      borderRadius: '999px',
      fontSize: '0.75rem',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: '#22c55e', flexShrink: 0,
        boxShadow: '0 0 6px #22c55e',
        animation: 'pulse-dot 1.5s ease-in-out infinite',
      }} />
      <span style={{
        color: '#4ade80', fontFamily: 'monospace', fontWeight: 500,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '340px',
      }}>
        {LIVE_EVENTS[idx]}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [localSolved, setLocalSolved] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(SOLVED_KEY);
      if (raw) setLocalSolved(JSON.parse(raw).length);
    } catch {}
  }, []);

  const localScore = localSolved * 160;
  const localRankPosition = MOCK_USERS.findIndex(u => localScore > u.score);
  const displayRank = localRankPosition === -1 ? MOCK_USERS.length + 1 : localRankPosition + 1;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3.5rem 1.5rem', position: 'relative' }}>

      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem', position: 'relative', zIndex: 1,
        animation: 'fade-up 0.5s 0.05s both',
      }}>
        <div>
          <p className="section-label" style={{ marginBottom: '0.5rem' }}>Community</p>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.5rem',
            lineHeight: 1.1,
          }}>
            <span className="gradient-text">Top debuggers.</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '380px' }}>
            Rankings by problems solved, difficulty and solve time. Updated daily.
          </p>
        </div>
        {mounted && <LiveFeed />}
      </div>

      {/* Your stats banner */}
      {localSolved > 0 && (
        <div style={{
          padding: '1.125rem 1.5rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
          animation: 'fade-up 0.4s 0.1s both',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 800, color: 'white', flexShrink: 0,
          }}>
            Y
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
              Your progress (this device)
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {localSolved} problems solved · estimated rank <span style={{ color: 'var(--text)', fontWeight: 700 }}>#{displayRank}</span> · {localScore.toLocaleString()} pts
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <a href="/problems" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}>
              Keep solving -&gt;
            </a>
          </div>
        </div>
      )}

      {/* Podium — top 3 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.875rem',
        marginBottom: '2.5rem',
        position: 'relative', zIndex: 1,
      }}>
        {MOCK_USERS.slice(0, 3).map((user, i) => (
          <PodiumCard key={user.handle} user={user} i={i} />
        ))}
      </div>

      {/* Full table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        position: 'relative', zIndex: 1,
        animation: 'fade-up 0.5s 0.35s both',
      }}>
        {/* Table header */}
        <div className="lb-row-header">
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rank</div>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Debugger</div>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>Solved</div>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>Streak</div>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>Score</div>
        </div>

        {MOCK_USERS.map((user, i) => (
          <div
            key={user.handle}
            className="lb-row"
            style={{ animation: `fade-up 0.35s ${0.4 + i * 0.04}s both` }}
          >
            {/* Rank */}
            <div style={{
              fontSize: '0.75rem', fontWeight: 700,
              color: i === 0 ? '#a5b4fc' : i === 1 ? '#9ca3af' : i === 2 ? '#f59e0b' : 'var(--text-faint)',
              fontFamily: 'monospace', letterSpacing: '0.04em',
            }}>
              {i < 3 ? String(i + 1).padStart(2, '0') : `#${user.rank}`}
            </div>

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: avatarGradient(user.handle),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 800, color: 'white',
                flexShrink: 0,
                boxShadow: i < 3 ? `0 0 0 1px rgba(255,255,255,0.08)` : 'none',
              }}>
                {user.handle[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.handle}
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-faint)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {user.specialty}
                </div>
              </div>
            </div>

            {/* Solved with mini bar */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                {user.solved}
              </div>
              <div style={{ height: '2px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', width: '40px', margin: '0 auto' }}>
                <div style={{
                  height: '100%',
                  background: i < 3 ? 'var(--gradient)' : 'var(--accent)',
                  width: `${(user.solved / MAX_SOLVED) * 100}%`,
                  borderRadius: '999px',
                  animation: `bar-grow 0.8s ${0.5 + i * 0.05}s both`,
                  transformOrigin: 'left',
                }} />
              </div>
            </div>

            {/* Streak */}
            <div style={{ textAlign: 'center' }}>
              {user.streak > 5 ? (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.1875rem 0.5rem', borderRadius: '999px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)',
                  fontSize: '0.625rem', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600,
                }}>
                  {user.streak}d
                </div>
              ) : (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {user.streak}
                </span>
              )}
            </div>

            {/* Score with bar */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                color: i === 0 ? '#a5b4fc' : 'var(--text)',
              }}>
                {user.score.toLocaleString()}
              </div>
              <div style={{ height: '2px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.2rem' }}>
                <div style={{
                  height: '100%',
                  background: i === 0 ? 'var(--gradient)' : `rgba(99,102,241,${0.3 + (1 - i / 10) * 0.5})`,
                  width: `${(user.score / MAX_SCORE) * 100}%`,
                  borderRadius: '999px',
                  animation: `bar-grow 1s ${0.5 + i * 0.05}s both`,
                  transformOrigin: 'left',
                }} />
              </div>
            </div>
          </div>
        ))}

        {/* Local user row */}
        {localSolved > 0 && (
          <div className="lb-row lb-row-you" style={{ animation: 'fade-up 0.4s 0.9s both' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', fontFamily: 'monospace' }}>
              #{displayRank}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 800, color: 'white', flexShrink: 0,
              }}>
                Y
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a5b4fc' }}>you (this device)</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>local session</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#a5b4fc', fontWeight: 600 }}>
              {localSolved}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-faint)' }}>-</div>
            <div style={{ textAlign: 'right', fontSize: '0.9375rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '-0.03em' }}>
              {localScore.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Scoring breakdown */}
      <div style={{
        marginTop: '2.5rem', position: 'relative', zIndex: 1,
        animation: 'fade-up 0.5s 0.5s both',
      }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem', fontWeight: 600 }}>
          How scoring works
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1px',
          background: 'var(--border-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {[
            { label: 'Easy',         pts: '+100', color: '#4ade80' },
            { label: 'Medium',       pts: '+200', color: '#fbbf24' },
            { label: 'Hard',         pts: '+400', color: '#f87171' },
            { label: 'Speed (<5m)',  pts: '+40',  color: '#a5b4fc' },
          ].map(({ label, pts, color }) => (
            <div key={label} style={{
              padding: '1rem 1.25rem',
              background: 'var(--bg-card)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'background 0.15s',
            }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</span>
              <span style={{
                fontSize: '0.875rem', fontWeight: 700, color,
                fontFamily: 'monospace', letterSpacing: '-0.01em',
              }}>{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Auth teaser */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1.5rem 2rem',
        border: '1px dashed rgba(99,102,241,0.2)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        position: 'relative', zIndex: 1,
        animation: 'fade-up 0.5s 0.6s both',
      }}>
        <div style={{
          fontSize: '0.6875rem', fontFamily: 'monospace', color: '#6366f1',
          letterSpacing: '0.12em', marginBottom: '0.5rem', fontWeight: 700,
        }}>
          COMING SOON
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          Global leaderboard with persistent accounts
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
          Persistent streaks, company rankings, and team challenges
        </p>
      </div>

    </div>
  );
}
