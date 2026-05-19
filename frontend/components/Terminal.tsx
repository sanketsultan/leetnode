'use client';

import { useEffect, useRef, useState } from 'react';

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

/** Animated overlay — rendered in HTML, never touches xterm.js */
function BootOverlay({ visible }: { visible: boolean }) {
  const [frame, setFrame]   = useState(0);
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

  return (
    <div
      style={{
        position:   'absolute',
        inset:      0,
        background: '#0b0b0b',
        display:    'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding:    '1rem 1.5rem',
        fontFamily: '"Geist Mono","Cascadia Code","Fira Code","JetBrains Mono",Menlo,monospace',
        fontSize:   13,
        pointerEvents: 'none',
        opacity:    visible ? 1 : 0,
        transition: 'opacity 0.15s ease',
        zIndex:     10,
      }}
    >
      <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: 6 }}>
        LeetNode
        <span style={{ color: '#404040', fontWeight: 400, marginLeft: 8 }}>
          GPU Debugging Platform
        </span>
      </div>
      <div style={{ color: '#404040', marginBottom: 16 }}>
        {'--------------------------------------'}
      </div>
      <div style={{ color: '#737373' }}>
        <span style={{ color: '#34d399', marginRight: 8 }}>
          {SPINNER_FRAMES[frame]}
        </span>
        {BOOT_LINES[lineIdx]}...
      </div>
    </div>
  );
}

export default function TerminalComponent({ wsUrl, status, errorMessage }: TerminalProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const termRef       = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitAddonRef   = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const wsRef         = useRef<WebSocket | null>(null);
  const [termReady, setTermReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  // ── Effect 1: initialise xterm once ──────────────────────────────────────
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
        fontSize: 13,
        lineHeight: 1.5,
        theme: {
          background:    '#0b0b0b', foreground:    '#d4d4d4',
          cursor:        '#3b82f6', cursorAccent:  '#0b0b0b',
          selectionBackground: '#1d3557',
          black: '#1a1a1a',  red:     '#f87171', green:   '#4ade80',
          yellow:'#fbbf24',  blue:    '#60a5fa', magenta: '#c084fc',
          cyan:  '#34d399',  white:   '#d4d4d4',
          brightBlack:  '#404040', brightRed:     '#fca5a5',
          brightGreen:  '#86efac', brightYellow:  '#fde68a',
          brightBlue:   '#93c5fd', brightMagenta: '#d8b4fe',
          brightCyan:   '#6ee7b7', brightWhite:   '#f5f5f5',
        },
        scrollback: 5000,
        allowProposedApi: true,
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
        if (wsRef.current?.readyState === WebSocket.OPEN)
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      });
      resizeObserver.observe(containerRef.current!);

      setTermReady(true);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      wsRef.current?.close();
      wsRef.current = null;
      termRef.current?.dispose();
      termRef.current     = null;
      fitAddonRef.current = null;
      setTermReady(false);
      setOverlayVisible(true);
    };
  }, []);

  // ── Effect 2: connect WebSocket when both terminal and wsUrl are ready ────
  useEffect(() => {
    if (!termReady || !wsUrl || !termRef.current) return;

    const term = termRef.current;
    const ws   = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Set before calling ws.close() so onerror/onclose know it was intentional
    // (React Strict Mode cleanup, or component unmount) and don't write
    // spurious "Connection error" / "Disconnected" messages to the terminal.
    let closing = false;

    ws.onopen = () => {
      fitAddonRef.current?.fit();
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      // Hide overlay — xterm.js is clean, shell prompt appears naturally
      setOverlayVisible(false);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'data') term.write(msg.data as string);
        else if (msg.type === 'exit') {
          setOverlayVisible(false);
          term.write('\r\n\x1b[2m  Session ended\x1b[0m\r\n');
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => {
      if (closing) return;
      setOverlayVisible(false);
      term.write('\r\n\x1b[31m  Connection error\x1b[0m\r\n');
    };
    ws.onclose = () => {
      if (closing) return;
      term.write('\r\n\x1b[2m  Disconnected\x1b[0m\r\n');
    };

    const dataListener = term.onData(data => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'data', data }));
    });

    return () => {
      closing = true;
      dataListener.dispose();
      ws.close();
      wsRef.current = null;
    };
  }, [termReady, wsUrl]);

  // ── Effect 3: error state ─────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'error') return;
    setOverlayVisible(false);
    const term = termRef.current;
    if (!term) return;
    term.writeln('\r\n\x1b[31m  ' + (errorMessage ?? 'Failed to start session') + '\x1b[0m');
    term.writeln('  \x1b[2mRefresh the page to try again.\x1b[0m');
  }, [status, errorMessage]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <BootOverlay visible={overlayVisible && status !== 'error'} />
      <div
        ref={containerRef}
        className="xterm-container w-full h-full"
        style={{ background: '#0b0b0b' }}
      />
    </div>
  );
}
