/**
 * Pure utility functions for PTY stream processing.
 * Kept separate so they can be unit-tested without Docker/WebSocket setup.
 */

/**
 * Strip Docker multiplexed stream headers from a chunk.
 *
 * Despite Tty=true being set on the exec, Dockerode 4.x still receives
 * Docker's 8-byte frame headers on each data event:
 *   [stream_type: 1B][padding: 3B][payload_size: 4B big-endian]
 * If we don't strip them, the last byte of the size field appears as a
 * stray printable character (e.g. 'P', 'H') right before the shell prompt.
 */
export function stripDockerHeaders(chunk: Buffer): Buffer {
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
    const isPadded =
      chunk[offset + 1] === 0 && chunk[offset + 2] === 0 && chunk[offset + 3] === 0;

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

/**
 * Filter terminal escape sequences from decoded pty output.
 * - OSC sequences  (\x1b]...\x07 or \x1b]...\x1b\)  — window titles etc.
 * - DCS sequences  (\x1bP...\x1b\)                   — XTGETTCAP responses, sixel
 * - U+FFFD replacement chars                          — invalid UTF-8 init bytes
 */
export function filterEscapeSequences(data: string): string {
  // Strip OSC sequences (window title etc.)
  data = data.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '');
  // Strip DCS sequences
  data = data.replace(/\x1bP[^\x1b]*(?:\x1b\\)?/g, '');
  // Drop UTF-8 replacement chars
  data = data.replace(/\uFFFD/g, '');
  return data;
}
