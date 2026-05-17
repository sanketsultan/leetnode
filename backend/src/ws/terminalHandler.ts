import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { config } from '../config';
import { getSession } from '../services/sessionManager';
import { PtyBridge } from '../services/ptyBridge';
import { TerminalMessage } from '../types';

export function startWebSocketServer(): void {
  const wss = new WebSocketServer({ port: config.WS_PORT });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://localhost:${config.WS_PORT}`);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      ws.close(4000, 'Missing sessionId');
      return;
    }

    const session = getSession(sessionId);

    if (!session) {
      ws.close(4004, 'Session not found or expired');
      return;
    }

    if (session.status !== 'ready') {
      ws.close(4003, 'Session not ready yet');
      return;
    }

    console.log(`[WS] Client connected for session ${sessionId}`);

    const bridge = new PtyBridge(session.containerId, ws);
    bridge.start().catch((err) => {
      console.error(`[WS] Bridge start failed for session ${sessionId}:`, err);
      ws.close(4500, 'Terminal start failed');
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg: TerminalMessage = JSON.parse(raw.toString());

        if (msg.type === 'data' && typeof msg.data === 'string') {
          bridge.write(msg.data);
        } else if (msg.type === 'resize' && msg.cols && msg.rows) {
          bridge.resize(msg.cols, msg.rows).catch(() => {});
        } else if (msg.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        }
      } catch {
        // Malformed message — ignore
      }
    });

    ws.on('close', () => {
      bridge.dispose();
      console.log(`[WS] Client disconnected for session ${sessionId}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error for session ${sessionId}:`, err);
      bridge.dispose();
    });
  });

  console.log(`[WS] WebSocket server listening on port ${config.WS_PORT}`);
}
