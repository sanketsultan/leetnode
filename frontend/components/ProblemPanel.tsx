'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Problem, verifySession } from '../lib/api';
import { analytics } from '../lib/analytics';

interface ProblemPanelProps {
  problem: Problem;
  sessionId: string | null;
  sessionStatus: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;
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

export default function ProblemPanel({ problem, sessionId, sessionStatus, errorMessage }: ProblemPanelProps) {
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(problem.timeLimit * 1000);
  const [sessionReadyAt] = useState(() => Date.now());

  useEffect(() => {
    if (sessionStatus !== 'ready') return;
    const t = setInterval(() => setTimeRemaining(ms => Math.max(0, ms - 1000)), 1000);
    return () => clearInterval(t);
  }, [sessionStatus]);

  function handleRevealHint() {
    const next = hintsRevealed + 1;
    setHintsRevealed(next);
    analytics.hintRevealed(problem.slug, next - 1); // 0-indexed hint number
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

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Problem header */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium capitalize"
            style={{ color: difficultyColor[problem.difficulty] ?? 'var(--text-muted)' }}>
            {problem.difficulty}
          </span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{problem.category}</span>
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

      {/* Status bar */}
      <div className="px-6 py-2.5 flex items-center justify-between text-xs"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
        {sessionStatus === 'loading' && (
          <span style={{ color: 'var(--text-muted)' }}>Starting container…</span>
        )}
        {sessionStatus === 'ready' && (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            Connected
          </span>
        )}
        {sessionStatus === 'error' && (
          <span style={{ color: 'var(--error)' }}>Error: {errorMessage}</span>
        )}
        {sessionStatus === 'idle' && <span style={{ color: 'var(--text-faint)' }}>Initializing</span>}

        {sessionStatus === 'ready' && (
          <span className="font-mono" style={{ color: timeRemaining < 300000 ? 'var(--error)' : 'var(--text-muted)' }}>
            {formatTime(timeRemaining)}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-sm font-semibold mt-6 mb-2 first:mt-0"
                  style={{ color: 'var(--text)' }}>
                  {children}
                </h2>
              ),
              p: ({ children }) => (
                <p className="mb-3 leading-relaxed">{children}</p>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 space-y-1.5 list-decimal list-inside">{children}</ol>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 space-y-1.5 list-disc list-inside">{children}</ul>
              ),
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
              pre: ({ children }) => (
                <pre className="text-xs rounded-lg p-4 overflow-x-auto mb-3 font-mono leading-relaxed"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {children}
                </pre>
              ),
              strong: ({ children }) => (
                <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{children}</strong>
              ),
            }}>
            {problem.description}
          </ReactMarkdown>
        </div>

        {/* Hints */}
        {problem.hints && problem.hints.length > 0 && (
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowHints(v => !v)}
              className="flex items-center gap-2 text-xs transition-colors w-full text-left"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <span>{showHints ? '▾' : '▸'}</span>
              <span>Hints ({hintsRevealed}/{problem.hints.length} revealed)</span>
            </button>

            {showHints && (
              <div className="mt-3 space-y-2">
                {problem.hints.slice(0, hintsRevealed).map((hint, i) => (
                  <div key={i} className="text-xs p-3 rounded-lg leading-relaxed"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <span className="font-mono text-xs mb-1 block" style={{ color: 'var(--text-faint)' }}>
                      hint {i + 1}
                    </span>
                    {hint}
                  </div>
                ))}
                {hintsRevealed < problem.hints.length && (
                  <button
                    onClick={handleRevealHint}
                    className="text-xs transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
                    + show hint {hintsRevealed + 1}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verify */}
      <div className="px-6 py-5" style={{ borderTop: '1px solid var(--border)' }}>
        {verifyStatus === 'success' && (
          <div className="text-xs p-3 rounded-lg mb-3 leading-relaxed"
            style={{ background: '#052e16', border: '1px solid #166534', color: '#4ade80' }}>
            {verifyMessage}
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
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}>
          {verifyStatus === 'checking' ? (
            <><span className="animate-spin text-xs">⟳</span> Checking…</>
          ) : 'Check Solution'}
        </button>
      </div>
    </div>
  );
}
