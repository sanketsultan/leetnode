'use client';

import { useEffect, useRef, useState } from 'react';

interface TerminalProps {
  wsUrl: string | null;
  status?: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage?: string;
}

export default function TerminalComponent({ wsUrl, status, errorMessage }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef     = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const [termReady, setTermReady] = useState(false);

  // ── Effect 1: initialise xterm once ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      const { Terminal }     = await import('@xterm/xterm');
      const { FitAddon }     = await import('@xterm/addon-fit');
      const { WebLinksAddon }= await import('@xterm/addon-web-links');
      await import('@xterm/xterm/css/xterm.css');

      if (cancelled) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontFamily: '"Geist Mono","Cascadia Code","Fira Code","JetBrains Mono",Menlo,monospace',
        fontSize: 13,
        lineHeight: 1.5,
        theme: {
          background:    '#0b0b0b', foreground:   '#d4d4d4',
          cursor:        '#3b82f6', cursorAccent: '#0b0b0b',
          selectionBackground: '#1d3557',
          black: '#1a1a1a',   red:     '#f87171', green:   '#4ade80',
          yellow:'#fbbf24',   blue:    '#60a5fa', magenta: '#c084fc',
          cyan:  '#34d399',   white:   '#d4d4d4',
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

      termRef.current    = term;
      fitAddonRef.current = fitAddon;

      resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN)
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      });
      resizeObserver.observe(containerRef.current!);

      // Signal React that the terminal is ready (triggers Effect 2)
      setTermReady(true);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      wsRef.current?.close();
      wsRef.current = null;
      termRef.current?.dispose();
      termRef.current    = null;
      fitAddonRef.current = null;
      setTermReady(false);
    };
  }, []); // run once on mount

  // ── Effect 2: connect WebSocket once BOTH terminal and wsUrl are ready ───
  useEffect(() => {
    const term = termRef.current;
    if (!termReady || !term) return;

    if (!wsUrl) {
      // Terminal is ready but session not started yet
      term.reset();
      term.write('\x1b[2m  Starting terminal\x1b[0m\x1b[2m…\x1b[0m');
      return;
    }

    // Session is ready — connect
    term.reset();
    term.write('\x1b[2m  Connecting…\x1b[0m');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      fitAddonRef.current?.fit();
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      term.reset(); // clear "Connecting…" — shell prompt arrives naturally
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'data') term.write(msg.data as string);
        else if (msg.type === 'exit') term.write('\r\n\x1b[2m  Session ended\x1b[0m\r\n');
      } catch { /* ignore */ }
    };

    ws.onerror = () => term.write('\r\n\x1b[31m  Connection error\x1b[0m\r\n');
    ws.onclose = () => term.write('\r\n\x1b[2m  Disconnected\x1b[0m\r\n');

    const dataListener = term.onData(data => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'data', data }));
    });

    // Cleanup: close WS and remove the onData listener (prevents stacking)
    return () => {
      dataListener.dispose();
      ws.close();
      wsRef.current = null;
    };
  }, [termReady, wsUrl]); // re-runs when either changes

  // ── Effect 3: show error inside the terminal ─────────────────────────────
  useEffect(() => {
    if (status !== 'error' || !termRef.current) return;
    const term = termRef.current;
    term.reset();
    term.writeln('\r\n\x1b[31m  \u2716 ' + (errorMessage ?? 'Failed to start session') + '\x1b[0m');
    term.writeln('\x1b[2m  Refresh the page to try again.\x1b[0m');
  }, [status, errorMessage]);

  return (
    <div
      ref={containerRef}
      className="xterm-container w-full h-full"
      style={{ background: '#0b0b0b' }}
    />
  );
}
