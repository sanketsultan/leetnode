'use client';

import { useState } from 'react';
import FeedbackModal from './FeedbackModal';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: '#0d0d1f',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '999px',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          fontWeight: 600,
          fontFamily: 'inherit',
          letterSpacing: '0.02em',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08)',
          transition: 'border-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.borderColor = 'rgba(99,102,241,0.6)';
          el.style.color = 'var(--text)';
          el.style.boxShadow = '0 4px 32px rgba(99,102,241,0.2), 0 0 0 1px rgba(99,102,241,0.15)';
          el.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.borderColor = 'rgba(99,102,241,0.3)';
          el.style.color = 'var(--text-muted)';
          el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08)';
          el.style.transform = 'translateY(0)';
        }}
      >
        <span style={{
          fontFamily: 'monospace', fontSize: '0.6875rem',
          color: '#6366f1', fontWeight: 700,
        }}>$</span>
        feedback
      </button>

      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
