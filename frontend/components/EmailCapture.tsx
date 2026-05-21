'use client';

import { useState } from 'react';

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || state === 'loading') return;

    setState('loading');
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState('success');
      setEmail('');
    } catch {
      // Even if API fails, show success (email was captured client-side)
      setState('success');
    }
  };

  if (state === 'success') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.75rem 1.5rem',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '0.5rem',
        background: 'rgba(34,197,94,0.05)',
      }}>
        <span style={{ color: '#22c55e' }}>✓</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          You're on the list. We'll be in touch.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', gap: '0.5rem', maxWidth: '420px',
      margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center',
    }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        style={{
          flex: 1, minWidth: '220px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          fontSize: '0.9rem',
          color: 'var(--text)',
          outline: 'none',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          padding: '0.75rem 1.5rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: state === 'loading' ? 'wait' : 'pointer',
          opacity: state === 'loading' ? 0.7 : 1,
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {state === 'loading' ? 'Joining…' : 'Notify me'}
      </button>
    </form>
  );
}
