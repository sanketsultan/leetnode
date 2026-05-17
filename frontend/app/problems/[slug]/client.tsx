'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ProblemPanel from '../../../components/ProblemPanel';
import ResizableSplit from '../../../components/ResizableSplit';
import { Problem, createSession, deleteSession } from '../../../lib/api';

const Terminal = dynamic(() => import('../../../components/Terminal'), { ssr: false });

interface ProblemPageClientProps {
  problem: Problem;
}

export default function ProblemPageClient({ problem }: ProblemPageClientProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let currentSessionId: string | null = null;

    async function startSession() {
      setSessionStatus('loading');
      try {
        const session = await createSession(problem.slug);
        currentSessionId = session.sessionId;
        setSessionId(session.sessionId);
        setWsUrl(session.wsUrl);
        setSessionStatus('ready');
      } catch (err) {
        setSessionStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to start session');
      }
    }

    startSession();

    return () => {
      // Cleanup session on unmount
      if (currentSessionId) {
        deleteSession(currentSessionId).catch(() => {});
      }
    };
  }, [problem.slug]);

  const leftPanel = (
    <div className="border-r border-slate-800 h-full flex flex-col">
      <ProblemPanel
        problem={problem}
        sessionId={sessionId}
        sessionStatus={sessionStatus}
        errorMessage={errorMessage}
      />
    </div>
  );

  const rightPanel = (
    <div className="bg-[#0d1117] h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-slate-500 ml-2 font-mono">bash — leetnode</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <Terminal wsUrl={wsUrl} />
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <ResizableSplit left={leftPanel} right={rightPanel} />
    </div>
  );
}
