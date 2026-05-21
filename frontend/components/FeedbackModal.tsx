'use client';

import { useState, useEffect, useRef } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required';
  if (!EMAIL_RE.test(v.trim())) return 'Please enter a valid email address';
  return '';
}
function validateMessage(v: string) {
  if (!v.trim()) return 'Message is required';
  if (v.trim().length < 10) return 'Must be at least 10 characters';
  return '';
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: Props) {
  const [email,      setEmail    ] = useState('');
  const [message,    setMessage  ] = useState('');
  const [emailErr,   setEmailErr ] = useState('');
  const [msgErr,     setMsgErr   ] = useState('');
  const [status,     setStatus   ] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [serverErr,  setServerErr] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus email on open
  useEffect(() => {
    if (open) {
      setStatus('idle');
      setServerErr('');
      setTimeout(() => emailRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ee = validateEmail(email);
    const me = validateMessage(message);
    setEmailErr(ee);
    setMsgErr(me);
    if (ee || me) return;

    setStatus('sending');
    setServerErr('');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            message: message.trim(),
            page: typeof window !== 'undefined' ? window.location.pathname : undefined,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setServerErr(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(7,7,26,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fade-in 0.18s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '480px',
        background: '#0d0d1f',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '1rem',
        boxShadow: '0 0 0 1px rgba(99,102,241,0.08), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.06)',
        overflow: 'hidden',
        animation: 'podium-in 0.22s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: '#080812',
        }}>
          <div>
            <div style={{
              fontSize: '0.5625rem', fontFamily: 'monospace', letterSpacing: '0.14em',
              color: '#6366f1', fontWeight: 700, marginBottom: '0.25rem',
            }}>
              FEEDBACK
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              Tell us what you think
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', fontSize: '1.25rem', lineHeight: 1,
              padding: '0.25rem', borderRadius: '4px',
              transition: 'color 0.15s',
            }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {status === 'sent' ? (
            /* Success state */
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.25rem',
              }}>
                <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem' }}>[OK]</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Feedback sent!
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                Thanks for taking the time. We read every message.
              </p>
              <button
                onClick={onClose}
                className="btn-primary"
                style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>

              {/* Email */}
              <div style={{ marginBottom: '1.125rem' }}>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: 600,
                  color: emailErr ? '#f87171' : 'var(--text-muted)',
                  marginBottom: '0.4rem', letterSpacing: '0.04em',
                }}>
                  Your email
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (emailErr) setEmailErr(validateEmail(e.target.value)); }}
                  onBlur={() => setEmailErr(validateEmail(email))}
                  placeholder="you@company.com"
                  autoComplete="email"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.625rem 0.875rem',
                    background: '#060610',
                    border: `1px solid ${emailErr ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '0.5rem',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = emailErr ? 'rgba(248,113,113,0.6)' : 'rgba(99,102,241,0.5)'; }}
                  onBlurCapture={e => { e.target.style.borderColor = emailErr ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.07)'; }}
                />
                {emailErr && (
                  <div style={{ fontSize: '0.6875rem', color: '#f87171', marginTop: '0.3rem', fontFamily: 'monospace' }}>
                    {emailErr}
                  </div>
                )}
              </div>

              {/* Message */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: 600,
                  color: msgErr ? '#f87171' : 'var(--text-muted)',
                  marginBottom: '0.4rem', letterSpacing: '0.04em',
                }}>
                  Feedback
                </label>
                <textarea
                  value={message}
                  onChange={e => { setMessage(e.target.value); if (msgErr) setMsgErr(validateMessage(e.target.value)); }}
                  onBlur={() => setMsgErr(validateMessage(message))}
                  placeholder="Bug report, feature idea, or just vibes..."
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.625rem 0.875rem',
                    background: '#060610',
                    border: `1px solid ${msgErr ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '0.5rem',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = msgErr ? 'rgba(248,113,113,0.6)' : 'rgba(99,102,241,0.5)'; }}
                  onBlurCapture={e => { e.target.style.borderColor = msgErr ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.07)'; }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  {msgErr ? (
                    <div style={{ fontSize: '0.6875rem', color: '#f87171', fontFamily: 'monospace' }}>{msgErr}</div>
                  ) : <div />}
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                    {message.length}/2000
                  </div>
                </div>
              </div>

              {/* Server error */}
              {status === 'error' && serverErr && (
                <div style={{
                  padding: '0.625rem 0.875rem', marginBottom: '1rem',
                  background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#f87171',
                  fontFamily: 'monospace',
                }}>
                  {serverErr}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn-primary"
                style={{
                  width: '100%', justifyContent: 'center',
                  fontSize: '0.875rem',
                  opacity: status === 'sending' ? 0.7 : 1,
                  cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                  position: 'relative',
                }}
              >
                {status === 'sending' ? (
                  <>
                    <span style={{ animation: 'pulse-dot 1s ease-in-out infinite', display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'white', marginRight: '0.5rem' }} />
                    Sending...
                  </>
                ) : 'Send feedback'}
              </button>

              <p style={{
                fontSize: '0.6875rem', color: 'var(--text-faint)',
                textAlign: 'center', marginTop: '0.875rem', lineHeight: 1.5,
              }}>
                We will only use your email to reply. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
