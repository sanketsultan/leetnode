import Dockerode from 'dockerode';
import WebSocket from 'ws';
import { getDockerInstance } from './dockerService';

/**
 * Strip Docker multiplexed stream headers from a chunk.
 *
 * Despite Tty=true being set on the exec, Dockerode 4.x still receives
 * Docker's 8-byte frame headers on each data event:
 *   [stream_type: 1B][padding: 3B][payload_size: 4B big-endian]
 * If we don't strip them, the last byte of the size field appears as a
 * stray printable character (e.g. 'P', 'H') right before the shell prompt.
 */
function stripDockerHeaders(chunk: Buffer): Buffer {
  // Fast path: if chunk doesn't start with a Docker stream header pattern,
  // return as-is (stream_type must be 1 or 2, next 3 bytes must be 0).
  if (
    chunk.length < 8 ||
    (chunk[0] !== 1 && chunk[0] !== 2) ||
    chunk[1] !== 0 || chunk[2] !== 0 || chunk[3] !== 0
  ) {
    return chunk;
  }

  const parts: Buffer[] = [];
  let offset = 0;

  while (offset + 8 <= chunk.length) {
    const streamType = chunk[offset];
    const isPadded = chunk[offset + 1] === 0 && chunk[offset + 2] === 0 && chunk[offset + 3] === 0;

    if ((streamType === 1 || streamType === 2) && isPadded) {
      const payloadSize = chunk.readUInt32BE(offset + 4);
      const payloadStart = offset + 8;
      const payloadEnd = payloadStart + payloadSize;
      parts.push(chunk.slice(payloadStart, Math.min(payloadEnd, chunk.length)));
      offset = payloadEnd;
    } else {
      // Not a header — pass the rest through unchanged.
      parts.push(chunk.slice(offset));
      break;
    }
  }

  return parts.length > 0 ? Buffer.concat(parts) : chunk;
}

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

        // Strip OSC sequences (window title etc.) — xterm.js 5.5 has a
        // parser edge case where \x1b]...\a leaks one byte onto the screen.
        // We don't need window titles in the embedded terminal.
        data = data.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '');

        // Strip DCS sequences (sixel, XTGETTCAP responses, etc.)
        data = data.replace(/\x1bP[^\x1b]*(?:\x1b\\)?/g, '');

        // Drop UTF-8 replacement chars that come from pty init bytes
        data = data.replace(/\uFFFD/g, '');

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
