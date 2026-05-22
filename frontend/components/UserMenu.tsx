'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  login?: string;
  avatar?: string;
}

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn('github')}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '0.3rem 0.75rem',
          color: 'var(--text)', fontSize: '0.8125rem', cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--text-muted)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text)';
        }}>
        {/* GitHub mark */}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
            0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
            -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
            .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
            -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
            .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
            .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
            0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Sign in
      </button>
    );
  }

  const user = session.user as ExtendedUser;
  const handle = user.login ?? user.name ?? 'you';
  const avatar = user.avatar ?? user.image;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 6, padding: '0.25rem 0.5rem 0.25rem 0.35rem',
          cursor: 'pointer', transition: 'border-color 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
        {avatar ? (
          <img src={avatar} alt={handle} width={22} height={22}
            style={{ borderRadius: '50%', display: 'block' }} />
        ) : (
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 600,
          }}>
            {handle[0]?.toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: '0.8125rem', color: 'var(--text)', maxWidth: 100,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {handle}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{
            padding: '0.6rem 0.9rem', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
              Signed in as
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
              @{handle}
            </div>
          </div>
          {[
            { href: '/profile',     label: 'My profile' },
            { href: '/leaderboard', label: 'Leaderboard' },
          ].map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)} style={{
              display: 'block', padding: '0.5rem 0.9rem',
              fontSize: '0.8125rem', color: 'var(--text)',
              textDecoration: 'none', transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {label}
            </a>
          ))}
          <button
            onClick={() => { setOpen(false); signOut(); }}
            style={{
              display: 'block', width: '100%', padding: '0.5rem 0.9rem',
              fontSize: '0.8125rem', color: '#f87171', background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.1s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
