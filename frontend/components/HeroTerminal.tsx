'use client';

import { useState, useEffect, useRef } from 'react';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

type LineType = 'cmd' | 'out' | 'error' | 'warn' | 'highlight' | 'success' | 'verify' | 'comment' | 'blank';

interface TermLine {
  type: LineType;
  text: string;
  pause: number; // ms to wait before this line appears
}

const PROMPT = 'user@prod-01:~$';

// A realistic 502 nginx debug session - the classic SRE war story
const SEQUENCE: TermLine[] = [
  { type: 'cmd',       text: 'curl -sI http://api.internal/health',                    pause: 400 },
  { type: 'error',     text: 'HTTP/1.1 502 Bad Gateway',                               pause: 220 },
  { type: 'out',       text: 'server: nginx/1.24.0',                                   pause: 60  },
  { type: 'out',       text: 'date: Wed, 21 May 2026 09:14:33 GMT',                    pause: 60  },
  { type: 'blank',     text: '',                                                        pause: 500 },
  { type: 'cmd',       text: 'systemctl status nginx',                                  pause: 600 },
  { type: 'out',       text: 'nginx.service - nginx HTTP server',                      pause: 80  },
  { type: 'success',   text: '   Active: active (running)',                             pause: 60  },
  { type: 'blank',     text: '',                                                        pause: 300 },
  { type: 'cmd',       text: 'nginx -t 2>&1',                                          pause: 500 },
  { type: 'error',     text: 'nginx: [warn] connect() failed (111: Connection refused)',pause: 120 },
  { type: 'error',     text: '      while connecting to upstream 127.0.0.1:8080',      pause: 80  },
  { type: 'blank',     text: '',                                                        pause: 400 },
  { type: 'cmd',       text: 'grep proxy_pass /etc/nginx/conf.d/app.conf',             pause: 700 },
  { type: 'highlight', text: '    proxy_pass http://127.0.0.1:8080;',                  pause: 200 },
  { type: 'blank',     text: '',                                                        pause: 300 },
  { type: 'cmd',       text: 'ss -tlnp | grep node',                                   pause: 600 },
  { type: 'out',       text: 'LISTEN 0  511  *:8081  users:(("node",pid=1847,fd=23))', pause: 160 },
  { type: 'comment',   text: '# service binds 8081 - nginx points to 8080',            pause: 600 },
  { type: 'blank',     text: '',                                                        pause: 400 },
  { type: 'cmd',       text: "sed -i 's/8080/8081/g' /etc/nginx/conf.d/app.conf",     pause: 800 },
  { type: 'cmd',       text: 'nginx -t && nginx -s reload',                            pause: 500 },
  { type: 'out',       text: 'nginx: configuration file /etc/nginx/nginx.conf test ok',pause: 160 },
  { type: 'blank',     text: '',                                                        pause: 600 },
  { type: 'cmd',       text: 'curl -s http://api.internal/health',                     pause: 700 },
  { type: 'success',   text: '{"status":"ok","uptime":3721,"version":"2.4.1"}',        pause: 200 },
  { type: 'blank',     text: '',                                                        pause: 300 },
  { type: 'verify',    text: '  Verification passed in 4m 12s',                        pause: 600 },
];

// Phases driven by sequence step for the status indicator
function getPhase(step: number): 0 | 1 | 2 {
  if (step < 5)  return 0; // broken
  if (step < 20) return 1; // investigating
  return 2;                // resolved
}

const PHASE_LABELS = [
  { dot: '#ef4444', text: 'INCIDENT ACTIVE',  bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.3)'   },
  { dot: '#f59e0b', text: 'INVESTIGATING',    bg: 'rgba(245,158,11,0.10)',   border: 'rgba(245,158,11,0.3)'  },
  { dot: '#22c55e', text: 'RESOLVED',         bg: 'rgba(34,197,94,0.10)',    border: 'rgba(34,197,94,0.25)'  },
];

function lineColor(type: LineType): string {
  switch (type) {
    case 'cmd':       return '#f4f4ff';
    case 'out':       return '#6b7280';
    case 'error':     return '#f87171';
    case 'warn':      return '#fbbf24';
    case 'highlight': return '#fde68a';
    case 'success':   return '#4ade80';
    case 'verify':    return '#4ade80';
    case 'comment':   return '#374151';
    default:          return 'transparent';
  }
}

function lineBg(type: LineType): string | undefined {
  if (type === 'highlight') return 'rgba(253,230,138,0.06)';
  if (type === 'verify')    return 'rgba(34,197,94,0.06)';
  return undefined;
}

export default function HeroTerminal() {
  const [lines,       setLines      ] = useState<TermLine[]>([]);
  const [typingLine,  setTypingLine ] = useState<{ type: LineType; text: string } | null>(null);
  const [step,        setStep       ] = useState(0);
  const [phase,       setPhase      ] = useState<0 | 1 | 2>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const run = async () => {
      while (mountedRef.current) {
        setLines([]);
        setTypingLine(null);
        setStep(0);
        setPhase(0);

        for (let i = 0; i < SEQUENCE.length; i++) {
          if (!mountedRef.current) return;
          const line = SEQUENCE[i];

          await sleep(line.pause);
          if (!mountedRef.current) return;

          setStep(i);
          setPhase(getPhase(i));

          if (line.type === 'cmd') {
            // Type character by character
            for (let c = 0; c <= line.text.length; c++) {
              if (!mountedRef.current) return;
              setTypingLine({ type: 'cmd', text: line.text.slice(0, c) });
              await sleep(28 + Math.random() * 22);
            }
            setTypingLine(null);
            setLines(prev => [...prev, line]);
          } else {
            setLines(prev => [...prev, line]);
          }

          // Auto-scroll
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          });
        }

        // Hold the resolved state for a moment then restart
        await sleep(4500);
      }
    };

    run();
    return () => { mountedRef.current = false; };
  }, []);

  const phaseInfo = PHASE_LABELS[phase];

  return (
    <div style={{
      background: '#080812',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '0.875rem',
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
      fontSize: '0.75rem',
      lineHeight: 1.6,
      boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 32px 64px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.05)',
      userSelect: 'none',
    }}>

      {/* Window chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6875rem 1rem',
        background: '#0d0d1f',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: '0.4375rem', alignItems: 'center' }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map((c, i) => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: c, opacity: 0.7,
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{ fontSize: '0.6875rem', color: '#4b5563', letterSpacing: '0.04em' }}>
          nginx-debug.sh
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.1875rem 0.625rem',
          borderRadius: '999px',
          background: phaseInfo.bg,
          border: `1px solid ${phaseInfo.border}`,
          transition: 'all 0.5s ease',
        }}>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: phaseInfo.dot,
            boxShadow: `0 0 6px ${phaseInfo.dot}`,
            animation: phase < 2 ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: phaseInfo.dot, letterSpacing: '0.08em' }}>
            {phaseInfo.text}
          </span>
        </div>
      </div>

      {/* Metrics bar */}
      <div style={{
        display: 'flex', gap: '1.5rem',
        padding: '0.4375rem 1rem',
        background: '#0a0a1a',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}>
        {[
          { label: '502/min', value: phase === 2 ? '0'      : '142',   alarm: phase < 2 },
          { label: 'P99',     value: phase === 2 ? '84ms'   : '8.4s',  alarm: phase < 2 },
          { label: 'uptime',  value: phase === 2 ? '99.98%' : 'DEGRD', alarm: phase < 2 },
        ].map(({ label, value, alarm }) => (
          <div key={label} style={{ display: 'flex', gap: '0.375rem', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.5625rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </span>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700,
              color: alarm ? '#f87171' : '#4ade80',
              transition: 'color 0.5s ease',
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        style={{
          padding: '1rem',
          height: '340px',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{
            marginBottom: line.type === 'blank' ? '0.25rem' : '0.125rem',
            padding: line.type === 'highlight' || line.type === 'verify'
              ? '0.125rem 0.375rem'
              : undefined,
            borderRadius: line.type === 'highlight' || line.type === 'verify' ? '3px' : undefined,
            background: lineBg(line.type),
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}>
            {line.type === 'cmd' && (
              <span style={{ color: '#6366f1', flexShrink: 0, userSelect: 'none' }}>
                {PROMPT}
              </span>
            )}
            {line.type === 'verify' && (
              <span style={{ color: '#4ade80', flexShrink: 0 }}>
                {'['}PASS{']'}
              </span>
            )}
            <span style={{
              color: lineColor(line.type),
              fontStyle: line.type === 'comment' ? 'italic' : 'normal',
              fontWeight: line.type === 'verify' ? 700 : 'normal',
              whiteSpace: 'pre',
            }}>
              {line.text}
            </span>
          </div>
        ))}

        {/* Currently typing line */}
        {typingLine && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            marginBottom: '0.125rem',
          }}>
            <span style={{ color: '#6366f1', flexShrink: 0 }}>{PROMPT}</span>
            <span style={{ color: lineColor('cmd'), whiteSpace: 'pre' }}>
              {typingLine.text}
              <span style={{ animation: 'cursor-blink 1s step-start infinite' }}>|</span>
            </span>
          </div>
        )}

        {/* Idle cursor when nothing is typing */}
        {!typingLine && lines.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#6366f1' }}>{PROMPT}</span>
            <span style={{ animation: 'cursor-blink 1s step-start infinite', color: '#6366f1' }}>|</span>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div style={{
        padding: '0.3125rem 1rem',
        background: '#0d0d1f',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['bash', 'nginx', 'linux'].map(tag => (
            <span key={tag} style={{ fontSize: '0.5625rem', color: '#2e2e55', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {tag}
            </span>
          ))}
        </div>
        <span style={{ fontSize: '0.5625rem', color: '#2e2e55' }}>
          {lines.length}/{SEQUENCE.filter(l => l.type !== 'blank').length} steps
        </span>
      </div>
    </div>
  );
}
