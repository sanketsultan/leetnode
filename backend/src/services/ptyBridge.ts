import Dockerode from 'dockerode';
import WebSocket from 'ws';
import { getDockerInstance } from './dockerService';

export class PtyBridge {
  private ws: WebSocket;
  private containerId: string;
  private execStream: NodeJS.ReadWriteStream | null = null;
  private execInstance: Dockerode.Exec | null = null;
  private disposed = false;

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
      Env: ['TERM=xterm-256color', 'COLORTERM=truecolor', 'HOME=/home/user'],
      User: 'user',
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

      // Container output → WebSocket
      stream.on('data', (chunk: Buffer) => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'data', data: chunk.toString('utf8') }));
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
    if (this.execInstance && !this.disposed) {
      try {
        await this.execInstance.resize({ w: cols, h: rows });
      } catch {
        // Resize can fail if exec hasn't started yet — ignore
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
