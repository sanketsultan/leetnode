'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';
import { Problem, verifySession } from '../lib/api';
import { analytics } from '../lib/analytics';

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
        background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 4, color: copied ? '#4ade80' : 'rgba(255,255,255,0.35)',
        cursor: 'pointer', fontSize: 10, fontFamily: 'monospace',
        padding: '2px 7px', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.color = '#d4d4d4'; }}
      onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}>
      {copied ? '✓ copied' : 'copy'}
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

  function markSolved(elapsedS: number) {
    try {
      // Legacy solved list (used by leaderboard component)
      const raw = localStorage.getItem(SOLVED_KEY);
      const solved: string[] = raw ? JSON.parse(raw) : [];
      if (!solved.includes(problem.slug)) {
        solved.push(problem.slug);
        localStorage.setItem(SOLVED_KEY, JSON.stringify(solved));
      }
      setAlreadySolved(true);

      // Rich profile record (includes user identity if signed in)
      if (session?.user) {
        const u = session.user as { login?: string; avatar?: string; name?: string; image?: string };
        const profileRaw = localStorage.getItem(PROFILE_KEY);
        const profile: LocalProfile = profileRaw ? JSON.parse(profileRaw) : {
          login: u.login ?? u.name ?? 'you',
          avatar: u.avatar ?? u.image ?? '',
          solves: [],
        };
        // Update login/avatar in case they changed
        profile.login  = u.login ?? u.name ?? profile.login;
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

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Confetti canvas */}
      <div ref={confettiRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }} />

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium capitalize"
            style={{ color: difficultyColor[problem.difficulty] ?? 'var(--text-muted)' }}>
            {problem.difficulty}
          </span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{problem.category}</span>
          {alreadySolved && (
            <><span style={{ color: 'var(--text-faint)' }}>·</span>
            <span className="text-xs font-medium" style={{ color: '#22c55e' }}>✓ Solved</span></>
          )}
        </div>
        <h1 className="text-base font-semibold leading-snug mb-3" style={{ color: 'var(--text)' }}>
          {problem.title}
        </h1>
        <div className="flex flex-wrap gap-1.5">
          {problem.tags.map(tag => (
            <span key={tag} className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="px-6 py-2 flex items-center justify-between text-xs"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
        <div>
          {sessionStatus === 'loading' && <span style={{ color: 'var(--text-muted)' }}>Starting container…</span>}
          {sessionStatus === 'ready'   && (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--success)' }} />
              Connected
            </span>
          )}
          {sessionStatus === 'error'   && <span style={{ color: 'var(--error)' }}>Error: {errorMessage}</span>}
          {sessionStatus === 'idle'    && <span style={{ color: 'var(--text-faint)' }}>Initializing</span>}
        </div>
        <div className="flex items-center gap-3">
          {sessionStatus === 'ready' && (
            <span className="font-mono" style={{ color: timeRemaining < 300000 ? 'var(--error)' : 'var(--text-muted)' }}>
              {formatTime(timeRemaining)}
            </span>
          )}
        </div>
      </div>

      {/* ── Body: description + hints ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
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
                  <div style={{ position: 'relative' }}>
                    <pre className="text-xs rounded-lg p-4 overflow-x-auto mb-3 font-mono leading-relaxed"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
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
      <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        {verifyStatus === 'success' && (
          <div className="text-xs p-4 rounded-lg mb-3 leading-relaxed"
            style={{ background: '#052e16', border: '1px solid #166534', color: '#4ade80' }}>
            <div className="font-medium mb-1">✓ Problem solved!</div>
            <div style={{ color: '#86efac' }}>{verifyMessage}</div>
          </div>
        )}
        {verifyStatus === 'failed' && (
          <div className="text-xs p-3 rounded-lg mb-3 leading-relaxed"
            style={{ background: '#1c0a09', border: '1px solid #7f1d1d', color: '#f87171' }}>
            {verifyMessage}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={!sessionId || sessionStatus !== 'ready' || verifyStatus === 'checking'}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
          style={{ background: verifyStatus === 'success' ? '#166534' : 'var(--accent)', color: '#fff' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled && verifyStatus !== 'success') e.currentTarget.style.background = 'var(--accent-hover)'; }}
          onMouseLeave={e => { if (verifyStatus !== 'success') e.currentTarget.style.background = 'var(--accent)'; }}>
          {verifyStatus === 'checking' ? 'Checking…' : verifyStatus === 'success' ? '✓ Solved' : 'Check Solution'}
        </button>

        {/* Reset button */}
        <button
          onClick={onReset}
          disabled={isResetting || sessionStatus === 'loading'}
          className="w-full py-2 rounded-lg text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'none',
            border: '1px solid rgba(248,113,113,0.15)',
            color: 'rgba(248,113,113,0.5)',
          }}
          onMouseEnter={e => {
            if (!e.currentTarget.disabled) {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.4)';
              (e.currentTarget as HTMLElement).style.color = '#f87171';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.15)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.5)';
          }}>
          {isResetting ? '↺ Resetting container…' : '↺ Reset to original broken state'}
        </button>
      </div>
    </div>
  );
}
