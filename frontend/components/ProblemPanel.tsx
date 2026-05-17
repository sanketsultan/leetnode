'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Problem, verifySession } from '../lib/api';

interface ProblemPanelProps {
  problem: Problem;
  sessionId: string | null;
  sessionStatus: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const difficultyColors: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  hard: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export default function ProblemPanel({ problem, sessionId, sessionStatus, errorMessage }: ProblemPanelProps) {
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(problem.timeLimit * 1000);

  // Countdown timer
  useEffect(() => {
    if (sessionStatus !== 'ready') return;
    const interval = setInterval(() => {
      setTimeRemaining((t) => Math.max(0, t - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus]);

  async function handleVerify() {
    if (!sessionId || verifyStatus === 'checking') return;
    setVerifyStatus('checking');
    setVerifyMessage('');
    try {
      const result = await verifySession(sessionId);
      setVerifyStatus(result.success ? 'success' : 'failed');
      setVerifyMessage(result.message);
    } catch (err) {
      setVerifyStatus('failed');
      setVerifyMessage(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${difficultyColors[problem.difficulty] || ''}`}>
            {problem.difficulty}
          </span>
          <span className="text-xs text-slate-500">{problem.category}</span>
        </div>
        <h1 className="text-xl font-bold text-white">{problem.title}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          {problem.tags.map((tag) => (
            <span key={tag} className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Session status bar */}
      <div className="px-5 py-2 border-b border-slate-800 flex-shrink-0 flex items-center justify-between text-sm">
        {sessionStatus === 'loading' && (
          <span className="flex items-center gap-2 text-yellow-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Starting container...
          </span>
        )}
        {sessionStatus === 'ready' && (
          <span className="flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Connected
          </span>
        )}
        {sessionStatus === 'error' && (
          <span className="text-red-400">Error: {errorMessage}</span>
        )}
        {sessionStatus === 'idle' && <span className="text-slate-600">—</span>}

        {sessionStatus === 'ready' && (
          <span className={`font-mono text-xs ${timeRemaining < 300000 ? 'text-red-400' : 'text-slate-400'}`}>
            {formatTime(timeRemaining)}
          </span>
        )}
      </div>

      {/* Problem description */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-none text-sm text-slate-300 leading-relaxed">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-white font-semibold text-base mt-6 mb-2 first:mt-0 pb-1 border-b border-slate-800">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-white font-semibold text-sm mt-4 mb-1.5">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-slate-300 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 space-y-1 list-disc list-inside text-slate-300">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 space-y-1 list-decimal list-inside text-slate-300">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) return <code className={className}>{children}</code>;
                return (
                  <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto mb-3 text-xs font-mono text-slate-300">
                  {children}
                </pre>
              ),
              strong: ({ children }) => (
                <strong className="text-white font-semibold">{children}</strong>
              ),
            }}
          >
            {problem.description}
          </ReactMarkdown>
        </div>

        {/* Hints */}
        {problem.hints && problem.hints.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowHints(!showHints)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Hints
              {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHints && (
              <div className="mt-3 space-y-3">
                {problem.hints.slice(0, hintsRevealed).map((hint, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-sm text-slate-300">
                    <span className="text-xs text-slate-500 block mb-1">Hint {i + 1}</span>
                    {hint}
                  </div>
                ))}

                {hintsRevealed < problem.hints.length && (
                  <button
                    onClick={() => setHintsRevealed((n) => n + 1)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {hintsRevealed === 0 ? 'Show first hint' : 'Show next hint'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verify section */}
      <div className="p-5 border-t border-slate-800 flex-shrink-0">
        {verifyStatus === 'success' && (
          <div className="mb-3 flex items-start gap-2 p-3 bg-green-900/20 border border-green-700/50 rounded-lg text-sm text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{verifyMessage}</span>
          </div>
        )}
        {verifyStatus === 'failed' && (
          <div className="mb-3 flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-sm text-red-400">
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{verifyMessage}</span>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={!sessionId || sessionStatus !== 'ready' || verifyStatus === 'checking'}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all
            disabled:opacity-40 disabled:cursor-not-allowed
            bg-blue-600 hover:bg-blue-500 text-white
            flex items-center justify-center gap-2"
        >
          {verifyStatus === 'checking' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            'Check Solution'
          )}
        </button>
      </div>
    </div>
  );
}
