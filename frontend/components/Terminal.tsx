'use client';

import { useEffect, useRef } from 'react';

interface TerminalProps {
  wsUrl: string | null;
}

export default function TerminalComponent({ wsUrl }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!wsUrl || !containerRef.current || initialized.current) return;
    initialized.current = true;

    let term: import('@xterm/xterm').Terminal;
    let ws: WebSocket;
    let fitAddon: import('@xterm/addon-fit').FitAddon;

    async function init() {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

      // Dynamically import xterm CSS
      await import('@xterm/xterm/css/xterm.css');

      term = new Terminal({
        cursorBlink: true,
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, monospace',
        fontSize: 14,
        lineHeight: 1.2,
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          selectionBackground: '#264f78',
          black: '#0d1117',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#8b949e',
          brightBlack: '#484f58',
          brightRed: '#ffa198',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#f0f6fc',
        },
        scrollback: 5000,
        allowProposedApi: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(containerRef.current!);
      fitAddon.fit();

      // Connect WebSocket
      ws = new WebSocket(wsUrl!);

      ws.onopen = () => {
        // Send initial size
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'data') {
            term.write(msg.data);
          } else if (msg.type === 'exit') {
            term.write('\r\n\x1b[31mSession ended.\x1b[0m\r\n');
          }
        } catch {
          // Non-JSON message
        }
      };

      ws.onerror = () => {
        term.write('\r\n\x1b[31mConnection error. Please refresh.\x1b[0m\r\n');
      };

      ws.onclose = () => {
        term.write('\r\n\x1b[33mDisconnected.\x1b[0m\r\n');
      };

      // Forward keystrokes to server
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'data', data }));
        }
      });

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      });
      resizeObserver.observe(containerRef.current!);

      return () => resizeObserver.disconnect();
    }

    const cleanup = init();

    return () => {
      cleanup.then((disconnectObserver) => disconnectObserver?.());
      if (ws) ws.close();
      if (term) term.dispose();
      initialized.current = false;
    };
  }, [wsUrl]);

  return (
    <div
      ref={containerRef}
      className="xterm-container w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}
