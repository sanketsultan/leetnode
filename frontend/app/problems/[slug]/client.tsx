'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ProblemPanel from '../../../components/ProblemPanel';
import ResizableSplit from '../../../components/ResizableSplit';
import { Problem, createSession, getSession, deleteSession } from '../../../lib/api';
import { analytics } from '../../../lib/analytics';

const Terminal = dynamic(() => import('../../../components/Terminal'), { ssr: false });

// ── Session persistence ────────────────────────────────────────────────────────
// Store active session in localStorage so a page refresh reconnects to the
// same container (container stays alive until its TTL, ~20 min).
interface StoredSession {
  sessionId: string;
  wsUrl: string;
  expiresAt: string; // ISO string
}

function sessionKey(slug: string) { return `leetnode:session:${slug}`; }

function saveSession(slug: string, s: StoredSession) {
  try { localStorage.setItem(sessionKey(slug), JSON.stringify(s)); } catch {}
}

function loadSession(slug: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(slug));
    if (!raw) return null;
    const s: StoredSession = JSON.parse(raw);
    // Don't reconnect if already past expiry
    if (new Date(s.expiresAt) < new Date()) { clearSession(slug); return null; }
    return s;
  } catch { return null; }
}

function clearSession(slug: string) {
  try { localStorage.removeItem(sessionKey(slug)); } catch {}
}

interface Props { problem: Problem; }

export default function ProblemPageClient({ problem }: Props) {
  const [sessionId,      setSessionId     ] = useState<string | null>(null);
  const [wsUrl,          setWsUrl         ] = useState<string | null>(null);
  const [sessionStatus,  setSessionStatus ] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage,   setErrorMessage  ] = useState('');
  const [sessionReadyAt, setSessionReadyAt] = useState<number>(0);
  const [isResetting,    setIsResetting   ] = useState(false);

  // Keep a ref so cleanup callbacks always see the current sessionId
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  // ── Start or reconnect a session ─────────────────────────────────────────
  const startSession = useCallback(async (opts: { isReset?: boolean } = {}) => {
    setSessionStatus('loading');
    setErrorMessage('');

    // Try to reconnect to existing session (skip on intentional reset)
    if (!opts.isReset) {
      const stored = loadSession(problem.slug);
      if (stored) {
        const live = await getSession(stored.sessionId);
        if (live && live.status === 'ready') {
          setSessionId(live.sessionId);
          setWsUrl(live.wsUrl);
          setSessionStatus('ready');
          setSessionReadyAt(Date.now());
          analytics.sessionStarted(problem.slug);
          return;
        }
        clearSession(problem.slug);
      }
    }

    // Create a fresh session
    try {
      const session = await createSession(problem.slug);
      setSessionId(session.sessionId);
      setWsUrl(session.wsUrl);
      setSessionStatus('ready');
      setSessionReadyAt(Date.now());
      saveSession(problem.slug, {
        sessionId: session.sessionId,
        wsUrl:     session.wsUrl,
        expiresAt: session.expiresAt,
      });
      analytics.sessionStarted(problem.slug);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setSessionStatus('error');
      setErrorMessage(msg);
      analytics.sessionError(problem.slug, msg);
    }
  }, [problem.slug]);

  // ── Reset: destroy + recreate ────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    if (isResetting) return;
    setIsResetting(true);
    const oldId = sessionIdRef.current;
    clearSession(problem.slug);
    setSessionId(null);
    setWsUrl(null);
    if (oldId) { deleteSession(oldId).catch(() => {}); }
    await startSession({ isReset: true });
    setIsResetting(false);
  }, [isResetting, problem.slug, startSession]);

  // ── Mount: start / reconnect ─────────────────────────────────────────────
  useEffect(() => {
    analytics.problemViewed(problem.slug, problem.difficulty, problem.category);
    startSession();

    // On page close: leave session alive for reconnect (server TTL handles cleanup).
    // On browser tab close we DO clear — use pagehide with persisted=false.
    function handlePageHide(e: PageTransitionEvent) {
      // persisted=true means bfcache (user pressed Back), keep session
      // persisted=false means tab is truly closing — clear so they get fresh next time
      if (!e.persisted) {
        clearSession(problem.slug);
        const id = sessionIdRef.current;
        if (id) navigator.sendBeacon(`/api/sessions/${id}/delete`);
      }
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Layout ────────────────────────────────────────────────────────────────
  const left = (
    <div className="h-full" style={{ borderRight: '1px solid var(--border)' }}>
      <ProblemPanel
        problem={problem}
        sessionId={sessionId}
        sessionStatus={sessionStatus}
        errorMessage={errorMessage}
        sessionReadyAt={sessionReadyAt}
        onReset={handleReset}
        isResetting={isResetting}
      />
    </div>
  );

  const right = (
    <div className="h-full flex flex-col" style={{ background: '#0b0b0b' }}>
      {/* Terminal chrome bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f56' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#27c93f' }} />
          </div>
          <span className="text-xs font-mono ml-1" style={{ color: 'var(--text-faint)' }}>bash</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={isResetting || sessionStatus === 'loading'}
            title="Reset container — starts fresh from the broken state"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', fontSize: '0.6875rem',
              fontFamily: 'monospace', opacity: isResetting ? 0.4 : 1,
              transition: 'color 0.15s',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
            {isResetting ? '↺ resetting…' : '↺ reset'}
          </button>
          {/* Status */}
          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            {sessionStatus === 'loading' ? 'starting…' :
             sessionStatus === 'ready'   ? '● connected' :
             sessionStatus === 'error'   ? '✕ error' : ''}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Terminal wsUrl={wsUrl} status={sessionStatus} errorMessage={errorMessage} />
      </div>
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 3.5rem)' }}>
      <ResizableSplit left={left} right={right} defaultLeftWidth={36} />
    </div>
  );
}
