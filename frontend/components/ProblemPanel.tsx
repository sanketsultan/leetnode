'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';
import { Problem, verifySession } from '../lib/api';
import { analytics } from '../lib/analytics';
import SupportButton from './SupportButton';

const SOLVED_KEY  = 'leetnode:solved';
const PROFILE_KEY = 'leetnode:profile'; // { login, avatar, solves: [{slug, solvedAt, elapsedS}] }

interface LocalProfile {
  login:  string;
  avatar: string;
  solves: Array<{ slug: string; difficulty: string; solvedAt: string; elapsedS: number }>;
}

// Hints unlock progressively — users can't just skip to the answer
const HINT_UNLOCK_MINUTES = [0, 5, 10]; // hint i unlocks after this many minutes

interface ProblemPanelProps {
  problem: Problem;
  sessionId: string | null;
  sessionStatus: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;
  sessionReadyAt: number;   // Date.now() when session became ready
  onReset: () => void;
  isResetting: boolean;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const difficultyColor: Record<string, string> = {
  easy:   '#22c55e',
  medium: '#f59e0b',
  hard:   '#ef4444',
};

// ── Confetti ───────────────────────────────────────────────────────────────────
const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#f472b6','#34d399'];

function spawnConfetti(container: HTMLElement) {
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    const size = 6 + Math.random() * 6;
    const duration = 1.2 + Math.random() * 1.2;
    const delay = Math.random() * 0.6;
    el.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;
      background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
      left:${Math.random() * 100}%;top:-10px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation:confetti-fall ${duration}s ${delay}s ease-in forwards;
      transform:rotate(${Math.random() * 720}deg);pointer-events:none;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay + 0.1) * 1000);
  }
}

// ── Copy button for code blocks ───────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      style={{
        position: 'absolute', top: 8, right: 8,
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.12)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'rgba(99,102,241,0.25)'}`,
        borderRadius: 5,
        color: copied ? '#4ade80' : '#a5b4fc',
        cursor: 'pointer', fontSize: 10, fontFamily: 'monospace',
        padding: '3px 8px', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
      }}
      onMouseEnter={e => {
        if (!copied) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.22)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.45)';
          (e.currentTarget as HTMLElement).style.color = '#c4b5fd';
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.12)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.25)';
          (e.currentTarget as HTMLElement).style.color = '#a5b4fc';
        }
      }}>
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          copied
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="3" width="6" height="7" rx="1" stroke="#a5b4fc" strokeWidth="1.2"/>
            <path d="M3 3V2a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H7" stroke="#a5b4fc" strokeWidth="1.2"/>
          </svg>
          copy
        </>
      )}
    </button>
  );
}

export default function ProblemPanel({
  problem, sessionId, sessionStatus, errorMessage,
  sessionReadyAt, onReset, isResetting,
}: ProblemPanelProps) {
  const { data: session } = useSession();
  const [hintsRevealed,   setHintsRevealed ] = useState(0);
  const [showHints,       setShowHints      ] = useState(false);
  const [verifyStatus,    setVerifyStatus   ] = useState<'idle'|'checking'|'success'|'failed'>('idle');
  const [verifyMessage,   setVerifyMessage  ] = useState('');
  const [timeRemaining,   setTimeRemaining  ] = useState(problem.timeLimit * 1000);
  const [elapsedMs,       setElapsedMs      ] = useState(0);
  const [alreadySolved,   setAlreadySolved  ] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  // ── Solved state from localStorage ───────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOLVED_KEY);
      if (raw) {
        const solved: string[] = JSON.parse(raw);
        setAlreadySolved(solved.includes(problem.slug));
      }
    } catch {}
  }, [problem.slug]);

  // ── Countdown + elapsed ───────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus !== 'ready') return;
    const t = setInterval(() => {
      const now = Date.now();
      setTimeRemaining(ms => Math.max(0, ms - 1000));
      setElapsedMs(sessionReadyAt ? now - sessionReadyAt : 0);
    }, 1000);
    return () => clearInterval(t);
  }, [sessionStatus, sessionReadyAt]);

  // ── Progressive hint unlock ───────────────────────────────────────────────
  const elapsedMinutes = elapsedMs / 60000;
  const hintsUnlocked = (problem.hints ?? []).filter(
    (_, i) => elapsedMinutes >= (HINT_UNLOCK_MINUTES[i] ?? 0)
  ).length;
  // Next unlock countdown
  const nextHintIdx = hintsUnlocked;
  const nextHintUnlockAt = HINT_UNLOCK_MINUTES[nextHintIdx] ?? null;
  const nextHintMs = nextHintUnlockAt !== null
    ? Math.max(0, (nextHintUnlockAt * 60000) - elapsedMs)
    : null;

  async function markSolved(elapsedS: number) {
    try {
      // Local solved list (for instant UI feedback without auth)
      const raw = localStorage.getItem(SOLVED_KEY);
      const solved: string[] = raw ? JSON.parse(raw) : [];
      if (!solved.includes(problem.slug)) {
        solved.push(problem.slug);
        localStorage.setItem(SOLVED_KEY, JSON.stringify(solved));
      }
      setAlreadySolved(true);

      // Cache profile locally for leaderboard/profile page
      if (session?.user) {
        const u = session.user as { login?: string; avatar?: string; name?: string; image?: string };
        const profileRaw = localStorage.getItem(PROFILE_KEY);
        const profile: LocalProfile = profileRaw ? JSON.parse(profileRaw) : {
          login: u.login ?? u.name ?? 'you',
          avatar: u.avatar ?? u.image ?? '',
          solves: [],
        };
        profile.login  = u.login  ?? u.name  ?? profile.login;
        profile.avatar = u.avatar ?? u.image ?? profile.avatar;
        if (!profile.solves.find(s => s.slug === problem.slug)) {
          profile.solves.push({
            slug: problem.slug,
            difficulty: problem.difficulty,
            solvedAt: new Date().toISOString(),
            elapsedS,
          });
        }
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

        // Persist to server (fire-and-forget — don't block the UI)
        fetch('/api/user/solves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug:       problem.slug,
            difficulty: problem.difficulty,
            quality:    (problem as typeof problem & { quality?: string }).quality,
            elapsedS,
          }),
        }).catch(() => {/* silently ignore — localStorage is the fallback */});
      }
    } catch {}
  }

  function handleRevealHint() {
    const next = hintsRevealed + 1;
    if (next > hintsUnlocked) return; // can't reveal locked hints
    setHintsRevealed(next);
    analytics.hintRevealed(problem.slug, next - 1);
  }

  async function handleVerify() {
    if (!sessionId || verifyStatus === 'checking') return;
    setVerifyStatus('checking');
    setVerifyMessage('');
    analytics.verifyAttempted(problem.slug);
    try {
      const result = await verifySession(sessionId);
      setVerifyStatus(result.success ? 'success' : 'failed');
      setVerifyMessage(result.message);
      const elapsed = Math.round((Date.now() - sessionReadyAt) / 1000);
      if (result.success) {
        analytics.verifyPassed(problem.slug, elapsed);
        markSolved(elapsed);
        if (confettiRef.current) spawnConfetti(confettiRef.current);
      } else {
        analytics.verifyFailed(problem.slug, result.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setVerifyStatus('failed');
      setVerifyMessage(msg);
      analytics.verifyFailed(problem.slug, msg);
    }
  }

  // ── Code block text extractor ─────────────────────────────────────────────
  function extractText(node: React.ReactNode): string {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node && typeof node === 'object' && 'props' in (node as object)) {
      return extractText((node as React.ReactElement).props.children);
    }
    return '';
  }

  const diffColor = difficultyColor[problem.difficulty] ?? '#6366f1';

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Confetti canvas */}
      <div ref={confettiRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }} />

      {/* ── Difficulty accent bar ── */}
      <div style={{ height: '3px', background: diffColor, opacity: 0.8, flexShrink: 0 }} />

      {/* ── Header ── */}
      <div style={{ padding: '1.125rem 1.375rem 1rem', borderBottom: '1px solid var(--border)' }}>
        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'capitalize', letterSpacing: '0.03em',
            color: diffColor, background: `${diffColor}15`, border: `1px solid ${diffColor}30`,
            borderRadius: '4px', padding: '0.125rem 0.5rem',
          }}>
            {problem.difficulty}
          </span>
          <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>·</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{problem.category}</span>
          {alreadySolved && (
            <>
              <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>·</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Solved
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          {problem.title}
        </h1>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {problem.tags.map(tag => (
            <span key={tag} style={{
              fontSize: '0.6875rem', fontFamily: 'monospace',
              padding: '0.1875rem 0.5rem', borderRadius: '4px',
              background: 'var(--bg-subtle)', color: 'var(--text-faint)',
              border: '1px solid var(--border)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        padding: '0.4375rem 1.375rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6875rem' }}>
          {sessionStatus === 'loading' && (
            <>
              <span className="status-loading-dot" style={{
                width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ color: 'var(--text-muted)' }}>Starting container…</span>
            </>
          )}
          {sessionStatus === 'ready' && (
            <>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0,
                boxShadow: '0 0 6px rgba(34,197,94,0.6)',
              }} />
              <span style={{ color: '#4ade80', fontWeight: 500 }}>Container ready</span>
              {sessionId && (
                <span style={{ color: 'var(--text-faint)', fontFamily: 'monospace', fontSize: '0.625rem' }}>
                  · {sessionId.slice(0, 8)}
                </span>
              )}
            </>
          )}
          {sessionStatus === 'error' && (
            <>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: 'var(--error)' }}>{errorMessage ?? 'Container error'}</span>
            </>
          )}
          {sessionStatus === 'idle' && (
            <>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-faint)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-faint)' }}>Initializing…</span>
            </>
          )}
        </div>

        {/* Timer */}
        {sessionStatus === 'ready' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.6875rem' }}>
            <span style={{ color: 'var(--text-faint)', fontFamily: 'monospace' }}>
              {formatTime(elapsedMs)} elapsed
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{
              fontFamily: 'monospace', fontWeight: 600,
              color: timeRemaining < 300000 ? '#f87171' : timeRemaining < 600000 ? '#fbbf24' : 'var(--text-muted)',
            }}>
              {formatTime(timeRemaining)} left
            </span>
          </div>
        )}
      </div>

      {/* ── Body: description + hints ── */}
      {/* user-select:text is explicit here — xterm.js can grab keyboard focus on the
          right panel; without this, Ctrl+C in the description area can misfire.
          The onKeyDown handler copies selected text even when xterm holds document focus. */}
      <div className="flex-1 overflow-y-auto px-6 py-5"
        style={{ userSelect: 'text', WebkitUserSelect: 'text' } as React.CSSProperties}
        onKeyDown={e => {
          // Copy shortcut: works even if xterm.js has document focus
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const sel = window.getSelection()?.toString();
            if (sel) {
              e.stopPropagation();
              navigator.clipboard.writeText(sel).catch(() => {});
            }
          }
        }}>
        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-sm font-semibold mt-6 mb-2 first:mt-0" style={{ color: 'var(--text)' }}>{children}</h2>
              ),
              p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
              ol: ({ children }) => <ol className="mb-3 space-y-1.5 list-decimal list-inside">{children}</ol>,
              ul: ({ children }) => <ul className="mb-3 space-y-1.5 list-disc list-inside">{children}</ul>,
              li: ({ children }) => <li>{children}</li>,
              code: ({ children, className }) => {
                if (className?.includes('language-')) return <code className={className}>{children}</code>;
                return (
                  <code className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--border)', color: '#93c5fd' }}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => {
                const text = extractText(children);
                return (
                  <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                    <pre style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      padding: '0.875rem 1rem',
                      paddingRight: '4.5rem', /* room for copy button */
                      overflowX: 'auto',
                      fontSize: '0.75rem',
                      fontFamily: '"JetBrains Mono","Fira Code","Cascadia Code",Menlo,monospace',
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                    } as React.CSSProperties}>
                      {children}
                    </pre>
                    <CopyButton text={text} />
                  </div>
                );
              },
              strong: ({ children }) => <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{children}</strong>,
            }}>
            {problem.description}
          </ReactMarkdown>
        </div>

        {/* ── Progressive hints ── */}
        {problem.hints && problem.hints.length > 0 && (
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowHints(v => !v)}
              className="flex items-center gap-2 text-xs transition-colors w-full text-left mb-3"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <span>{showHints ? '▾' : '▸'}</span>
              <span>
                Hints ({hintsRevealed}/{problem.hints.length} revealed
                {hintsUnlocked > hintsRevealed ? ` · ${hintsUnlocked - hintsRevealed} available` : ''})
              </span>
            </button>

            {showHints && (
              <div className="space-y-2">
                {problem.hints.map((hint, i) => {
                  const unlocked = i < hintsUnlocked;
                  const revealed = i < hintsRevealed;
                  return (
                    <div key={i}>
                      {revealed ? (
                        /* Revealed hint */
                        <div className="text-xs p-3 rounded-lg leading-relaxed"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          <span className="font-mono text-xs mb-1 block" style={{ color: 'var(--text-faint)' }}>
                            hint {i + 1}
                          </span>
                          {hint}
                        </div>
                      ) : unlocked ? (
                        /* Unlocked but not yet revealed */
                        <button onClick={handleRevealHint}
                          className="text-xs transition-colors text-left w-full p-3 rounded-lg"
                          style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)'}>
                          + reveal hint {i + 1}
                        </button>
                      ) : (
                        /* Locked — show countdown */
                        <div className="text-xs p-3 rounded-lg flex items-center gap-2"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-faint)' }}>
                          <span style={{ fontSize: 10 }}>🔒</span>
                          <span>
                            Hint {i + 1} unlocks
                            {sessionStatus === 'ready' && nextHintMs !== null && nextHintMs > 0
                              ? ` in ${formatTime(nextHintMs)}`
                              : ` after ${HINT_UNLOCK_MINUTES[i]} min`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Verify + Reset ── */}
      <div style={{ padding: '1rem 1.375rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

        {/* Success message */}
        {verifyStatus === 'success' && (
          <div style={{
            borderRadius: '0.625rem',
            background: 'linear-gradient(135deg, #052e16 0%, #041f10 100%)',
            border: '1px solid rgba(34,197,94,0.3)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '0.875rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" stroke="#22c55e" strokeOpacity="0.5"/>
                  <path d="M4 7.5L5.5 9L10 4.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4ade80' }}>Problem solved!</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#86efac', lineHeight: 1.6, marginLeft: '1.375rem' }}>{verifyMessage}</p>
            </div>
            <div style={{ borderTop: '1px solid rgba(34,197,94,0.12)', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(34,197,94,0.04)' }}>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(134,239,172,0.5)' }}>Enjoying LeetNode?</span>
              <SupportButton variant="compact" />
            </div>
          </div>
        )}

        {/* Failure message */}
        {verifyStatus === 'failed' && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '0.625rem',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '0.75rem', color: '#f87171', lineHeight: 1.6,
            display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: '0.125rem' }}>
              <circle cx="7" cy="7" r="6.5" stroke="#ef4444" strokeOpacity="0.5"/>
              <path d="M7 4v4M7 9.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>{verifyMessage}</span>
          </div>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={!sessionId || sessionStatus !== 'ready' || verifyStatus === 'checking'}
          className={verifyStatus === 'checking' ? 'verify-btn-checking' : ''}
          style={{
            width: '100%', padding: '0.6875rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'background 0.15s, opacity 0.15s',
            cursor: (!sessionId || sessionStatus !== 'ready' || verifyStatus === 'checking') ? 'not-allowed' : 'pointer',
            opacity: (!sessionId || sessionStatus !== 'ready' || verifyStatus === 'checking') && verifyStatus !== 'success' ? 0.4 : 1,
            background: verifyStatus === 'success'
              ? 'rgba(34,197,94,0.15)'
              : verifyStatus === 'checking'
              ? 'var(--accent)'
              : 'var(--gradient)',
            color: verifyStatus === 'success' ? '#4ade80' : '#fff',
            border: verifyStatus === 'success' ? '1px solid rgba(34,197,94,0.3)' : 'none',
          }}
          onMouseEnter={e => {
            if (!e.currentTarget.disabled && verifyStatus === 'idle' || verifyStatus === 'failed')
              e.currentTarget.style.opacity = '0.88';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '1';
          }}>
          {verifyStatus === 'checking' && <span className="spinner" />}
          {verifyStatus === 'checking' ? 'Running check…'
            : verifyStatus === 'success' ? '✓ Verified — nice work'
            : 'Check my solution'}
        </button>

        {/* Reset button */}
        <button
          onClick={onReset}
          disabled={isResetting || sessionStatus === 'loading'}
          style={{
            width: '100%', padding: '0.5rem 1rem',
            borderRadius: '0.5rem', fontSize: '0.75rem',
            background: 'none',
            border: '1px solid rgba(248,113,113,0.12)',
            color: 'rgba(248,113,113,0.4)',
            transition: 'all 0.15s',
            cursor: (isResetting || sessionStatus === 'loading') ? 'not-allowed' : 'pointer',
            opacity: (isResetting || sessionStatus === 'loading') ? 0.4 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
          }}
          onMouseEnter={e => {
            if (!e.currentTarget.disabled) {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.35)';
              (e.currentTarget as HTMLElement).style.color = '#f87171';
              (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.05)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.12)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.4)';
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}>
          {isResetting
            ? <><span className="spinner" style={{ borderTopColor: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }} /> Resetting…</>
            : '↺ Reset to broken state'}
        </button>
      </div>
    </div>
  );
}
