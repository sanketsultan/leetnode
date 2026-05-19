/**
 * Unit tests for PTY stream utility functions.
 *
 * Each test group documents a real bug that was found and fixed, with the
 * exact symptom described so regressions are immediately obvious.
 */

import { stripDockerHeaders, filterEscapeSequences } from '../services/ptyUtils';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a Docker multiplexed stream frame. */
function dockerFrame(streamType: 1 | 2, payload: Buffer | string): Buffer {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const header = Buffer.alloc(8);
  header[0] = streamType;
  header.writeUInt32BE(data.length, 4);
  return Buffer.concat([header, data]);
}

// ─── stripDockerHeaders ──────────────────────────────────────────────────────

describe('stripDockerHeaders', () => {
  /**
   * BUG: Dockerode 4.x sends 8-byte Docker multiplexed stream headers even
   * when Tty=true. The last byte of the size field (e.g. 0x50='P', 0x48='H')
   * was rendered as a stray character right before the shell prompt.
   */
  it('strips a single stdout frame and returns only the payload', () => {
    const payload = Buffer.from('\x1b[01;32muser@abc123\x1b[0m:~$ ');
    const chunk = dockerFrame(1, payload);
    expect(stripDockerHeaders(chunk)).toEqual(payload);
  });

  it('strips a stderr frame (stream type 2)', () => {
    const payload = Buffer.from('some error output');
    const chunk = dockerFrame(2, payload);
    expect(stripDockerHeaders(chunk)).toEqual(payload);
  });

  it('strips multiple consecutive frames in one chunk', () => {
    const p1 = Buffer.from('banner line\r\n');
    const p2 = Buffer.from('user@host:~$ ');
    const chunk = Buffer.concat([dockerFrame(1, p1), dockerFrame(1, p2)]);
    expect(stripDockerHeaders(chunk)).toEqual(Buffer.concat([p1, p2]));
  });

  it('reproduces the P-before-prompt bug: size 0x50 used to leak as "P"', () => {
    // A payload exactly 80 bytes long causes size field last byte = 0x50 = 'P'
    const payload = Buffer.from('x'.repeat(80));
    const chunk = dockerFrame(1, payload);
    // Before the fix, the raw chunk was passed through and 'P' appeared on screen
    const result = stripDockerHeaders(chunk);
    expect(result).toEqual(payload);
    expect(result.toString()).not.toMatch(/^P/);
  });

  it('reproduces the H-before-prompt bug: size 0x48 used to leak as "H"', () => {
    const payload = Buffer.from('x'.repeat(72));
    const chunk = dockerFrame(1, payload);
    const result = stripDockerHeaders(chunk);
    expect(result).toEqual(payload);
    expect(result.toString()).not.toMatch(/^H/);
  });

  it('passes through non-Docker data unchanged (raw TTY bytes)', () => {
    const raw = Buffer.from('\x1b[01;32muser@host\x1b[0m:~$ ');
    expect(stripDockerHeaders(raw)).toBe(raw); // same reference = untouched
  });

  it('passes through data that starts with a printable char', () => {
    const raw = Buffer.from('hello world');
    expect(stripDockerHeaders(raw)).toBe(raw);
  });

  it('passes through a chunk shorter than 8 bytes', () => {
    const raw = Buffer.from('\r\n');
    expect(stripDockerHeaders(raw)).toBe(raw);
  });

  it('handles a frame whose payload is larger than remaining chunk bytes gracefully', () => {
    // Truncated frame: header says 100 bytes but only 10 bytes follow
    const header = Buffer.alloc(8);
    header[0] = 1;
    header.writeUInt32BE(100, 4);
    const partial = Buffer.from('helloworld'); // 10 bytes
    const chunk = Buffer.concat([header, partial]);
    const result = stripDockerHeaders(chunk);
    // Should return whatever payload bytes are available, not crash
    expect(result.toString()).toBe('helloworld');
  });
});

// ─── filterEscapeSequences ───────────────────────────────────────────────────

describe('filterEscapeSequences', () => {
  /**
   * BUG: xterm.js 5.5 has a parser edge case where OSC sequences
   * (\x1b]...\x07) leak one byte onto the screen.
   */
  it('strips OSC window title sequence with BEL terminator', () => {
    const input = '\x1b]0;user@host: ~\x07\x1b[01;32muser@host\x1b[0m:~$ ';
    const result = filterEscapeSequences(input);
    expect(result).not.toContain('\x1b]');
    expect(result).toContain('user@host');
    expect(result).toBe('\x1b[01;32muser@host\x1b[0m:~$ ');
  });

  it('strips OSC sequence with ST (\\x1b\\) terminator', () => {
    const input = '\x1b]0;user@host: ~\x1b\\\x1b[01;32muser@host\x1b[0m:~$ ';
    const result = filterEscapeSequences(input);
    expect(result).not.toContain('\x1b]');
    expect(result).toBe('\x1b[01;32muser@host\x1b[0m:~$ ');
  });

  /**
   * BUG: DCS sequences (XTGETTCAP responses) from readline/bash init were
   * not stripped, causing stray bytes to appear before the prompt.
   */
  it('strips DCS sequence with ST terminator', () => {
    const input = '\x1bP1+rterm\x1b\\user@host:~$ ';
    const result = filterEscapeSequences(input);
    expect(result).not.toContain('\x1bP');
    expect(result).toBe('user@host:~$ ');
  });

  it('strips multiple DCS sequences in one chunk', () => {
    const input = '\x1bPfoo\x1b\\\x1bPbar\x1b\\user@host:~$ ';
    const result = filterEscapeSequences(input);
    expect(result).toBe('user@host:~$ ');
  });

  /**
   * BUG: pty initialisation sends non-UTF-8 bytes which decode to U+FFFD
   * replacement characters, rendering as '?' boxes in xterm.js.
   */
  it('strips U+FFFD replacement characters', () => {
    const input = '\uFFFD\uFFFDuser@host:~$ ';
    expect(filterEscapeSequences(input)).toBe('user@host:~$ ');
  });

  it('preserves normal ANSI color codes', () => {
    const input = '\x1b[01;32muser@host\x1b[0m:~$ ';
    expect(filterEscapeSequences(input)).toBe(input);
  });

  it('preserves CSI sequences like bracketed paste enable', () => {
    const input = '\x1b[?2004huser@host:~$ ';
    expect(filterEscapeSequences(input)).toBe(input);
  });

  it('returns empty string for input that is only filtered content', () => {
    const input = '\x1b]0;title\x07\uFFFD\uFFFD\x1bPfoo\x1b\\';
    expect(filterEscapeSequences(input)).toBe('');
  });
});

// ─── cross-chunk escape sequence splitting ───────────────────────────────────

describe('cross-chunk pendingEsc logic (simulated)', () => {
  /**
   * BUG: Docker sends escape sequences split across chunk boundaries.
   * A DCS sequence ending with \x1b at the end of chunk N and P... at the
   * start of chunk N+1 was not caught by the per-chunk filter, so 'P' leaked
   * onto the screen before the shell prompt.
   *
   * The fix carries a dangling \x1b from one chunk to the next before filtering.
   */
  function processChunks(chunks: string[]): string[] {
    let pendingEsc = '';
    return chunks.map((raw) => {
      let data = pendingEsc + raw;
      pendingEsc = '';
      if (data.endsWith('\x1b')) {
        pendingEsc = '\x1b';
        data = data.slice(0, -1);
      }
      return filterEscapeSequences(data);
    });
  }

  it('handles DCS sequence split across two chunks', () => {
    // Chunk 0 ends with \x1b (start of DCS), chunk 1 starts with P...
    const chunk0 = 'banner text\x1b';
    const chunk1 = 'P1+rterm\x1b\\user@host:~$ ';
    const [out0, out1] = processChunks([chunk0, chunk1]);
    expect(out0).toBe('banner text');          // \x1b held back
    expect(out1).toBe('user@host:~$ ');        // DCS stripped, no stray P
    expect(out1).not.toMatch(/^P/);
  });

  it('handles OSC sequence split across two chunks', () => {
    const chunk0 = 'text\x1b';
    const chunk1 = ']0;user@host: ~\x07prompt$ ';
    const [out0, out1] = processChunks([chunk0, chunk1]);
    expect(out0).toBe('text');
    expect(out1).toBe('prompt$ ');
  });

  it('passes through a lone \\x1b at end of last chunk without hanging', () => {
    // If no next chunk arrives, the pending \x1b is simply not sent — acceptable
    const chunk0 = 'text\x1b';
    const [out0] = processChunks([chunk0]);
    expect(out0).toBe('text');
  });

  it('does not corrupt normal text split across chunks', () => {
    const chunk0 = 'hel';
    const chunk1 = 'lo world';
    const [out0, out1] = processChunks([chunk0, chunk1]);
    expect(out0 + out1).toBe('hello world');
  });
});
