'use client';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/problems';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '2.5rem 3rem', maxWidth: 380, width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
            LeetNode
          </span>
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem',
          color: 'var(--text)' }}>
          Sign in to track progress
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem',
          lineHeight: 1.6 }}>
          Your solves, streaks, and leaderboard ranking are tied to your account.
        </p>

        <button
          onClick={() => signIn('github', { callbackUrl })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.6rem', width: '100%', padding: '0.75rem 1rem',
            background: '#fff', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: '#0d1117', fontSize: '0.9375rem',
            fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
              -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
              .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
              -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
              .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
              .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
              0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Continue with GitHub
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-faint)',
          lineHeight: 1.5 }}>
          We only request your public profile. No write access to your account.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
