'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ProblemPanel from '../../../components/ProblemPanel';
import ResizableSplit from '../../../components/ResizableSplit';
import { Problem, createSession, deleteSession } from '../../../lib/api';
import { analytics } from '../../../lib/analytics';

const Terminal = dynamic(() => import('../../../components/Terminal'), { ssr: false });

interface ProblemPageClientProps {
  problem: Problem;
}

export default function ProblemPageClient({ problem }: ProblemPageClientProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    analytics.problemViewed(problem.slug, problem.difficulty, problem.category);

    let cancelled = false;
    let currentSessionId: string | null = null;
    const sessionStartedAt = Date.now();

    async function startSession() {
      setSessionStatus('loading');
      try {
        const session = await createSession(problem.slug);
        // If cleanup ran while we were awaiting (React Strict Mode double-invoke),
        // discard this session immediately so only one container is ever active.
        if (cancelled) {
          deleteSession(session.sessionId).catch(() => {});
          return;
        }
        currentSessionId = session.sessionId;
        setSessionId(session.sessionId);
        setWsUrl(session.wsUrl);
        setSessionStatus('ready');
        analytics.sessionStarted(problem.slug);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to start session';
        setSessionStatus('error');
        setErrorMessage(msg);
        analytics.sessionError(problem.slug, msg);
      }
    }

    startSession();

    // Reliable cleanup when tab is closed / refreshed
    function handleUnload() {
      const duration = Math.round((Date.now() - sessionStartedAt) / 1000);
      analytics.sessionDuration(problem.slug, duration);
      if (currentSessionId) {
        navigator.sendBeacon(`/api/sessions/${currentSessionId}/delete`);
      }
    }
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleUnload);
      if (currentSessionId) deleteSession(currentSessionId).catch(() => {});
    };
  }, [problem.slug]);

  const left = (
    <div className="h-full" style={{ borderRight: '1px solid var(--border)' }}>
      <ProblemPanel
        problem={problem}
        sessionId={sessionId}
        sessionStatus={sessionStatus}
        errorMessage={errorMessage}
      />
    </div>
  );

  const right = (
    <div className="h-full flex flex-col" style={{ background: '#0b0b0b' }}>
      {/* Terminal chrome bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a3a3a' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a3a3a' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a3a3a' }} />
          </div>
          <span className="text-xs font-mono ml-2" style={{ color: 'var(--text-faint)' }}>
            bash
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          {sessionStatus === 'loading' ? 'starting…' :
           sessionStatus === 'ready'   ? 'connected' :
           sessionStatus === 'error'   ? 'error' : ''}
        </span>
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
