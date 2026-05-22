'use client';

const BMAC_URL = 'https://buymeacoffee.com/sanketsultx';

interface Props {
  variant?: 'full' | 'compact' | 'inline';
}

export default function SupportButton({ variant = 'full' }: Props) {
  if (variant === 'inline') {
    return (
      <a
        href={BMAC_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          fontSize: '0.75rem', color: 'var(--text-muted)',
          textDecoration: 'none', transition: 'color 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#FFDD00')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
        ☕ Buy me a coffee
      </a>
    );
  }

  if (variant === 'compact') {
    return (
      <a
        href={BMAC_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 0.875rem',
          background: 'rgba(255,221,0,0.08)',
          border: '1px solid rgba(255,221,0,0.2)',
          borderRadius: '999px',
          fontSize: '0.75rem', fontWeight: 600,
          color: '#FFDD00', textDecoration: 'none',
          transition: 'all 0.15s',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,221,0,0.15)';
          e.currentTarget.style.borderColor = 'rgba(255,221,0,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,221,0,0.08)';
          e.currentTarget.style.borderColor = 'rgba(255,221,0,0.2)';
        }}>
        ☕ Buy me a coffee
      </a>
    );
  }

  // full
  return (
    <a
      href={BMAC_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.625rem 1.25rem',
        background: '#FFDD00',
        borderRadius: '999px',
        fontSize: '0.875rem', fontWeight: 700,
        color: '#000', textDecoration: 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 2px 12px rgba(255,221,0,0.3)',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,221,0,0.45)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,221,0,0.3)';
      }}>
      ☕ Buy me a coffee
    </a>
  );
}
