'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number; // percent
  minLeft?: number;          // percent
  maxLeft?: number;          // percent
}

export default function ResizableSplit({
  left,
  right,
  defaultLeftWidth = 38,
  minLeft = 20,
  maxLeft = 70,
}: ResizableSplitProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(maxLeft, Math.max(minLeft, pct)));
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minLeft, maxLeft]);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left panel */}
      <div style={{ width: `${leftWidth}%` }} className="flex-shrink-0 overflow-hidden flex flex-col">
        {left}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="w-px flex-shrink-0 cursor-col-resize transition-colors group relative"
        style={{ background: 'var(--border)' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#3b82f6')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--border)')}
      />

      {/* Right panel */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {right}
      </div>
    </div>
  );
}
