'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type Seg = {
  text: string;
  color: string;
  italic?: boolean;
  bold?: boolean;
};

export type TermLine = Seg[];

interface Props {
  lines: TermLine[];
  /** ms delay before animation starts once visible (for staggering cards) */
  delay?: number;
  /** ms per character (default 32) */
  speed?: number;
  /** IntersectionObserver threshold (default 0.35) */
  threshold?: number;
  className?: string;
}

export default function AnimatedTerminal({
  lines,
  delay = 0,
  speed = 32,
  threshold = 0.35,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // lineIdx = which line we're currently typing (-1 = not started)
  // charIdx = how many chars revealed on current line
  const [lineIdx, setLineIdx] = useState(-1);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  /* ── start typing when element enters viewport ─────────────────────── */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          setTimeout(() => setLineIdx(0), delay);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, threshold]);

  /* ── advance the typewriter ────────────────────────────────────────── */
  const totalCharsInLine = useCallback(
    (idx: number) => lines[idx]?.reduce((s, seg) => s + seg.text.length, 0) ?? 0,
    [lines]
  );

  useEffect(() => {
    if (lineIdx < 0 || done) return;

    const total = totalCharsInLine(lineIdx);

    if (charIdx < total) {
      // still typing this line
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    }

    // line finished
    if (lineIdx + 1 < lines.length) {
      // short pause then start next line
      const t = setTimeout(() => {
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      }, speed * 4);
      return () => clearTimeout(t);
    }

    // all done
    setDone(true);
  }, [lineIdx, charIdx, done, speed, lines, totalCharsInLine]);

  /* ── render helpers ────────────────────────────────────────────────── */
  function renderLine(line: TermLine, li: number) {
    const charsToShow = li < lineIdx ? Infinity : li === lineIdx ? charIdx : 0;
    let remaining = charsToShow;
    const nodes: React.ReactNode[] = [];

    for (let si = 0; si < line.length; si++) {
      const seg = line[si];
      if (remaining <= 0) break;
      const visible = seg.text.slice(0, remaining);
      remaining -= seg.text.length;
      nodes.push(
        <span
          key={si}
          style={{
            color: seg.color,
            fontStyle: seg.italic ? 'italic' : undefined,
            fontWeight: seg.bold ? 700 : undefined,
          }}
        >
          {visible}
        </span>
      );
    }

    const isCurrent = li === lineIdx && !done;

    return (
      <div key={li}>
        {nodes}
        {isCurrent && <span className="term-cursor" />}
      </div>
    );
  }

  return (
    <div ref={ref} className={`step-snippet ${className ?? ''}`} style={{ minHeight: '6rem' }}>
      {lines.map((line, li) => {
        if (li > lineIdx && lineIdx >= 0) return null;
        if (lineIdx < 0) return null;
        return renderLine(line, li);
      })}
      {done && <span className="term-cursor" style={{ animationDelay: '0s' }} />}
    </div>
  );
}
