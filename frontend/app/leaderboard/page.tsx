'use client';

import { useState, useEffect } from 'react';

const SOLVED_KEY = 'leetnode:solved';

// Realistic mock leaderboard — replace with real data when auth ships
const MOCK_USERS = [
  { rank: 1,  handle: 'sre_phantom',    solved: 6, streak: 14, score: 1240 },
  { rank: 2,  handle: 'kernelpanic_',   solved: 6, streak: 9,  score: 1180 },
  { rank: 3,  handle: 'devops_nakash',  solved: 5, streak: 11, score: 980  },
  { rank: 4,  handle: 'kubernetix',     solved: 5, streak: 6,  score: 870  },
  { rank: 5,  handle: 'null_pointer_',  solved: 4, streak: 8,  score: 760  },
  { rank: 6,  handle: 'sk_reddy',       solved: 4, streak: 3,  score: 640  },
  { rank: 7,  handle: 'infra_witch',    solved: 3, streak: 5,  score: 560  },
  { rank: 8,  handle: 'prod_debugger',  solved: 3, streak: 2,  score: 480  },
  { rank: 9,  handle: 'ml_oncall',      solved: 2, streak: 4,  score: 320  },
  { rank: 10, handle: 'sys_admin_404',  solved: 2, streak: 1,  score: 280  },
];

export default function LeaderboardPage() {
  const [localSolved, setLocalSolved] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOLVED_KEY);
      if (raw) setLocalSolved(JSON.parse(raw).length);
    } catch {}
  }, []);

  // Calculate local user's rank
  const localScore = localSolved * 160;
  const localRankPosition = MOCK_USERS.findIndex(u => localScore > u.score);
  const displayRank = localRankPosition === -1 ? MOCK_USERS.length + 1 : localRankPosition + 1;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="section-label" style={{ marginBottom: '0.5rem' }}>Community</p>
        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
          fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.75rem',
        }}>
          <span className="gradient-text">Top debuggers.</span>
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '500px', lineHeight: 1.65 }}>
          Rankings update daily. Score is based on problems solved, difficulty, and solve time.
        </p>
      </div>

      {/* Your stats banner */}
      {localSolved > 0 && (
        <div style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          background: 'var(--accent-dim)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginBottom: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
              Your progress (this device)
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {localSolved} problems solved · estimated rank #{displayRank}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <a href="/problems" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem' }}>
              Keep solving →
            </a>
          </div>
        </div>
      )}

      {/* Podium — top 3 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {MOCK_USERS.slice(0, 3).map((user, i) => (
          <div key={user.handle} style={{
            background: i === 0
              ? 'linear-gradient(160deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)'
              : 'var(--bg-card)',
            border: i === 0 ? '1px solid var(--border-accent)' : '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            textAlign: 'center',
            order: i === 0 ? 1 : i === 1 ? 0 : 2,
            paddingTop: i === 0 ? '2.25rem' : '1.5rem',
            boxShadow: i === 0 ? '0 0 40px rgba(99,102,241,0.1)' : 'none',
          }}>
            <div style={{
              fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 700,
              letterSpacing: '0.08em', color: i === 0 ? 'var(--text)' : 'var(--text-faint)',
              marginBottom: '0.75rem',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{
              fontSize: '0.9375rem', fontWeight: 700,
              letterSpacing: '-0.01em', marginBottom: '0.25rem',
            }}>
              {user.handle}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '0.75rem' }}>
              {user.solved} solved
            </div>
            <div style={{
              fontSize: i === 0 ? '1.75rem' : '1.375rem',
              fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)',
            }}>
              {user.score.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.125rem' }}>
              pts
            </div>
            {user.streak > 5 && (
              <div style={{
                marginTop: '0.75rem', fontSize: '0.6875rem', fontFamily: 'monospace',
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.1875rem 0.5rem', borderRadius: '999px',
                background: 'var(--bg-subtle)', color: 'var(--text-faint)',
                border: '1px solid var(--border)',
              }}>
                {user.streak}d streak
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div className="lb-row-header">
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rank</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>User</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>Solved</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>Streak</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>Score</div>
        </div>

        {MOCK_USERS.map((user, i) => (
          <div key={user.handle} className="lb-row">
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: i < 3 ? 'var(--text)' : 'var(--text-faint)', fontFamily: 'monospace' }}>
              {i < 3 ? String(i + 1).padStart(2, '0') : `#${user.rank}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: `hsl(${(user.handle.charCodeAt(0) * 47) % 360}, 45%, 25%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text)',
                flexShrink: 0,
              }}>
                {user.handle[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.handle}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {user.solved}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {user.streak}
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.9375rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {user.score.toLocaleString()}
            </div>
          </div>
        ))}

        {/* Local user row */}
        {localSolved > 0 && (
          <div className="lb-row lb-row-you">
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
              #{displayRank}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent)',
                flexShrink: 0,
              }}>
                Y
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent)' }}>
                you (this device)
              </span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--accent)' }}>
              {localSolved}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              -
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              {localScore.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Auth teaser */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1.5rem',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
          Global leaderboard with accounts coming soon
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
          Persistent progress, streaks, and company rankings
        </p>
      </div>

      {/* Scoring explanation */}
      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Easy problem', pts: '+100 pts' },
          { label: 'Medium problem', pts: '+200 pts' },
          { label: 'Hard problem', pts: '+400 pts' },
          { label: 'Speed bonus (<5 min)', pts: '+40 pts' },
        ].map(({ label, pts }) => (
          <div key={label} style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>{pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
