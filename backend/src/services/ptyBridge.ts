import Dockerode from 'dockerode';
import WebSocket from 'ws';
import { getDockerInstance } from './dockerService';
import { stripDockerHeaders, filterEscapeSequences } from './ptyUtils';

export class PtyBridge {
  private ws: WebSocket;
  private containerId: string;
  private execStream: NodeJS.ReadWriteStream | null = null;
  private execInstance: Dockerode.Exec | null = null;
  private disposed = false;
  // Stores the last resize received before the exec stream was ready,
  // so we can apply it immediately once the stream starts.
  private pendingSize: { cols: number; rows: number } | null = null;

  constructor(containerId: string, ws: WebSocket) {
    this.containerId = containerId;
    this.ws = ws;
  }

  async start(): Promise<void> {
    if (this.disposed) return;

    const docker = await getDockerInstance();
    const container = docker.getContainer(this.containerId);

    this.execInstance = await container.exec({
      Cmd: ['/bin/bash', '-l'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      // Run as root: problems require root-level operations (restart nginx,
      // run logrotate, edit system configs). The container is the security
      // boundary (no network, capped caps, memory/pid limits) — not the user.
      User: 'root',
      Env: [
        'TERM=xterm-256color',
        'COLORTERM=truecolor',
        'HOME=/home/user',
        'LOGNAME=user',
        'USER=user',
      ],
      WorkingDir: '/home/user',
    });

    this.execInstance.start({ hijack: true, stdin: true }, (err, stream) => {
      if (err || !stream) {
        console.error('[PTY] Failed to start exec stream:', err);
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'error', message: 'Failed to start terminal' }));
        }
        return;
      }

      this.execStream = stream as unknown as NodeJS.ReadWriteStream;

      // Apply any resize that arrived before the exec stream was ready.
      if (this.pendingSize) {
        const { cols, rows } = this.pendingSize;
        this.pendingSize = null;
        this.execInstance!.resize({ w: cols, h: rows }).catch(() => {});
      }

      // Carry a dangling \x1b across chunk boundaries so that escape sequences
      // split between two Docker data events are still correctly filtered.
      let pendingEsc = '';

      // Container output → WebSocket
      stream.on('data', (rawChunk: Buffer) => {
        if (this.ws.readyState !== WebSocket.OPEN) return;

        // Remove Docker multiplexed stream headers (8 bytes each) that Dockerode
        // includes even for TTY exec sessions.
        const chunk = stripDockerHeaders(Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk));

        // Prepend any escape byte saved from the previous chunk, then decode.
        let data = pendingEsc + chunk.toString('utf8');
        pendingEsc = '';

        // If the chunk ends with a bare \x1b (start of an escape sequence whose
        // continuation hasn't arrived yet), save it and strip it here so the
        // regexes below can match the full sequence once the next chunk arrives.
        if (data.endsWith('\x1b')) {
          pendingEsc = '\x1b';
          data = data.slice(0, -1);
        }

        data = filterEscapeSequences(data);

        if (data.length > 0) {
          this.ws.send(JSON.stringify({ type: 'data', data }));
        }
      });

      stream.on('end', () => {
        if (!this.disposed && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'exit' }));
        }
        this.dispose();
      });

      stream.on('error', (err: Error) => {
        console.error('[PTY] Stream error:', err);
        this.dispose();
      });

      console.log(`[PTY] Started exec stream for container ${this.containerId.slice(0, 12)}`);
    });
  }

  write(data: string): void {
    if (this.execStream && !this.disposed) {
      (this.execStream as unknown as NodeJS.WritableStream).write(data);
    }
  }

  async resize(cols: number, rows: number): Promise<void> {
    if (this.disposed) return;
    // Always save the latest size — if the exec stream isn't open yet the
    // start() callback will apply it immediately once the stream is ready.
    this.pendingSize = { cols, rows };
    if (this.execInstance && this.execStream) {
      try {
        await this.execInstance.resize({ w: cols, h: rows });
        this.pendingSize = null;
      } catch {
        // Will be applied in start() callback
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.execStream) {
      try {
        (this.execStream as unknown as NodeJS.WritableStream).end();
      } catch {
        // Already closed
      }
      this.execStream = null;
    }

    console.log(`[PTY] Disposed exec stream for container ${this.containerId.slice(0, 12)}`);
  }
}
