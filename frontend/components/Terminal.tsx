'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TerminalProps {
  wsUrl: string | null;
  status?: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;
}

const SPINNER_FRAMES = ['|', '/', '-', '\\'];
const BOOT_LINES = [
  'Allocating container',
  'Mounting filesystem',
  'Loading environment',
  'Starting bash session',
];

const FONT_MIN = 10;
const FONT_MAX = 20;
const FONT_DEFAULT = 13;

// ── Boot overlay ──────────────────────────────────────────────────────────────
function BootOverlay({ visible }: { visible: boolean }) {
  const [frame, setFrame]     = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      setFrame(f => (f + 1) % SPINNER_FRAMES.length);
      if (ticks % 15 === 0) setLineIdx(i => Math.min(i + 1, BOOT_LINES.length - 1));
    }, 100);
    return () => clearInterval(iv);
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0b0b0b',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
      alignItems: 'flex-start', padding: '1rem 1.5rem',
      fontFamily: '"Geist Mono","Cascadia Code","Fira Code","JetBrains Mono",Menlo,monospace',
      fontSize: 13, pointerEvents: 'none', zIndex: 10,
    }}>
      <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: 6 }}>
        LeetNode
        <span style={{ color: '#404040', fontWeight: 400, marginLeft: 8 }}>Sandbox</span>
      </div>
      <div style={{ color: '#404040', marginBottom: 16 }}>{'─'.repeat(38)}</div>
      <div style={{ color: '#737373' }}>
        <span style={{ color: '#34d399', marginRight: 8 }}>{SPINNER_FRAMES[frame]}</span>
        {BOOT_LINES[lineIdx]}...
      </div>
    </div>
  );
}

// ── Font size toolbar ─────────────────────────────────────────────────────────
function FontControls({ size, onInc, onDec }: { size: number; onInc: () => void; onDec: () => void }) {
  const btn: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '3px', color: 'var(--text-faint)', cursor: 'pointer',
    fontSize: '10px', lineHeight: 1, padding: '2px 5px', fontFamily: 'monospace',
    transition: 'border-color 0.1s, color 0.1s',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'absolute', bottom: 10, right: 14, zIndex: 20 }}>
      <button style={btn} onClick={onDec} title="Decrease font size"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d4d4d4'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}>
        A−
      </button>
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace' }}>{size}</span>
      <button style={btn} onClick={onInc} title="Increase font size"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d4d4d4'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}>
        A+
      </button>
    </div>
  );
}

// ── Reconnect banner ──────────────────────────────────────────────────────────
function ReconnectBanner({ attempt, max }: { attempt: number; max: number }) {
  return (
    <div style={{
      position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
      borderRadius: 6, padding: '4px 12px', zIndex: 20,
      fontSize: 11, fontFamily: 'monospace', color: '#fbbf24',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span>
      Reconnecting… ({attempt}/{max})
    </div>
  );
}

export default function TerminalComponent({ wsUrl, status, errorMessage }: TerminalProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const termRef        = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitAddonRef    = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [termReady,      setTermReady     ] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [fontSize,       setFontSize      ] = useState(FONT_DEFAULT);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const MAX_RECONNECT = 5;

  // ── Font size ─────────────────────────────────────────────────────────────
  const incFont = useCallback(() => {
    setFontSize(s => {
      const next = Math.min(s + 1, FONT_MAX);
      termRef.current?.options && (termRef.current.options.fontSize = next);
      fitAddonRef.current?.fit();
      return next;
    });
  }, []);
  const decFont = useCallback(() => {
    setFontSize(s => {
      const next = Math.max(s - 1, FONT_MIN);
      termRef.current?.options && (termRef.current.options.fontSize = next);
      fitAddonRef.current?.fit();
      return next;
    });
  }, []);

  // ── Init xterm once ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      const { Terminal }      = await import('@xterm/xterm');
      const { FitAddon }      = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');
      await import('@xterm/xterm/css/xterm.css');
      if (cancelled) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontFamily: '"Geist Mono","Cascadia Code","Fira Code","JetBrains Mono",Menlo,monospace',
        fontSize: FONT_DEFAULT,
        lineHeight: 1.5,
        scrollback: 5000,
        allowProposedApi: true,
        theme: {
          background: '#0b0b0b', foreground: '#d4d4d4',
          cursor: '#3b82f6', cursorAccent: '#0b0b0b',
          selectionBackground: '#1d3557',
          black: '#1a1a1a',  red:     '#f87171', green:   '#4ade80',
          yellow: '#fbbf24', blue:    '#60a5fa', magenta: '#c084fc',
          cyan:   '#34d399', white:   '#d4d4d4',
          brightBlack:  '#404040', brightRed:     '#fca5a5',
          brightGreen:  '#86efac', brightYellow:  '#fde68a',
          brightBlue:   '#93c5fd', brightMagenta: '#d8b4fe',
          brightCyan:   '#6ee7b7', brightWhite:   '#f5f5f5',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      term.open(containerRef.current!);
      fitAddon.fit();

      termRef.current     = term;
      fitAddonRef.current = fitAddon;

      resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      });
      resizeObserver.observe(containerRef.current!);

      setTermReady(true);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      termRef.current?.dispose();
      termRef.current     = null;
      fitAddonRef.current = null;
      setTermReady(false);
      setOverlayVisible(true);
      setReconnectAttempt(0);
    };
  }, []);

  // ── Connect WebSocket (with auto-reconnect) ───────────────────────────────
  const connectWs = useCallback((url: string, attempt = 0) => {
    if (!termRef.current) return;
    const term = termRef.current;
    const ws   = new WebSocket(url);
    wsRef.current = ws;
    let closing = false;

    ws.onopen = () => {
      setReconnectAttempt(0);
      fitAddonRef.current?.fit();
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      setOverlayVisible(false);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'data') term.write(msg.data as string);
        else if (msg.type === 'pong') { /* keepalive */ }
        else if (msg.type === 'exit') term.write('\r\n\x1b[2m  Session ended\x1b[0m\r\n');
      } catch { /* ignore */ }
    };

    ws.onerror = () => {
      if (closing) return;
    };

    ws.onclose = (ev) => {
      if (closing) return;
      // Intentional close codes (session expired, not found, etc.)
      if (ev.code >= 4000 && ev.code < 5000) {
        setOverlayVisible(false);
        term.write(`\r\n\x1b[31m  Session closed (${ev.code}): ${ev.reason || 'ended'}\x1b[0m\r\n`);
        return;
      }
      // Unexpected close — try to reconnect
      if (attempt < MAX_RECONNECT) {
        const next = attempt + 1;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        setReconnectAttempt(next);
        term.write(`\r\n\x1b[33m  Connection lost — reconnecting in ${delay / 1000}s…\x1b[0m\r\n`);
        reconnectTimer.current = setTimeout(() => connectWs(url, next), delay);
      } else {
        setOverlayVisible(false);
        setReconnectAttempt(0);
        term.write('\r\n\x1b[31m  Connection lost. Refresh the page or reset the session.\x1b[0m\r\n');
      }
    };

    const dataListener = term.onData(data => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'data', data }));
    });

    // Keepalive ping every 25s to prevent idle timeout
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'ping' }));
    }, 25000);

    // Allow cleanup to stop the reconnect loop
    (ws as WebSocket & { _dispose?: () => void })._dispose = () => {
      closing = true;
      dataListener.dispose();
      clearInterval(pingInterval);
    };
  }, []);

  useEffect(() => {
    if (!termReady || !wsUrl) return;

    // Close previous connection cleanly
    const prev = wsRef.current as WebSocket & { _dispose?: () => void } | null;
    if (prev) { prev._dispose?.(); prev.close(); wsRef.current = null; }
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    setReconnectAttempt(0);
    setOverlayVisible(true);

    connectWs(wsUrl, 0);

    return () => {
      const ws = wsRef.current as WebSocket & { _dispose?: () => void } | null;
      ws?._dispose?.();
      ws?.close();
      wsRef.current = null;
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    };
  }, [termReady, wsUrl, connectWs]);

  // ── Error state ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'error') return;
    setOverlayVisible(false);
    const term = termRef.current;
    if (!term) return;
    term.writeln('\r\n\x1b[31m  ' + (errorMessage ?? 'Failed to start session') + '\x1b[0m');
    term.writeln('  \x1b[2mRefresh or reset to try again.\x1b[0m');
  }, [status, errorMessage]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <BootOverlay visible={overlayVisible && status !== 'error'} />

      {reconnectAttempt > 0 && (
        <ReconnectBanner attempt={reconnectAttempt} max={MAX_RECONNECT} />
      )}

      <FontControls size={fontSize} onInc={incFont} onDec={decFont} />

      <div
        ref={containerRef}
        className="xterm-container w-full h-full"
        style={{ background: '#0b0b0b' }}
      />
    </div>
  );
}
