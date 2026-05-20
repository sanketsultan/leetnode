import { getProblems, Problem } from '../lib/api';

const difficultyColor: Record<string, string> = {
  easy:   '#22c55e',
  medium: '#f59e0b',
  hard:   '#ef4444',
};

const features = [
  {
    icon: '⬡',
    title: 'Real environments',
    body: 'Isolated Docker containers with pre-broken configs. Not simulations — actual broken systems you have to fix.',
  },
  {
    icon: '▸',
    title: 'Instant terminal',
    body: 'Full bash in your browser. No setup, no SSH keys, no waiting. Open a problem and start debugging in seconds.',
  },
  {
    icon: '✓',
    title: 'Verified solutions',
    body: "Click Check Solution and know immediately if your fix works. No guessing, no self-grading.",
  },
];

const steps = [
  { n: '01', title: 'Pick a problem', body: 'Choose from GPU failures, Kubernetes crashes, networking issues, and more.' },
  { n: '02', title: 'Debug in the terminal', body: 'SSH-quality bash access. Use any tool you would reach for on a real server.' },
  { n: '03', title: 'Verify the fix', body: 'Hit Check Solution. A real script validates your work end-to-end.' },
];

export default async function LandingPage() {
  let problems: Problem[] = [];
  try {
    problems = await getProblems();
  } catch { /* backend starting */ }

  const preview = problems.slice(0, 3);

  return (
    <div style={{ color: 'var(--text)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <p style={{
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: '1.5rem',
          fontWeight: 500,
        }}>
          Infrastructure · GPU · Kubernetes
        </p>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          maxWidth: '900px',
          marginBottom: '1.75rem',
        }}>
          Debug real infrastructure.
          <br />
          <span style={{ color: 'var(--text-muted)' }}>In your browser.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: 'var(--text-muted)',
          maxWidth: '520px',
          lineHeight: 1.65,
          marginBottom: '2.5rem',
        }}>
          Isolated Docker environments with pre-broken systems.
          Real terminal access. Verified solutions.
          Practice the skills that matter in production.
        </p>

        <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/problems" style={{
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '0.75rem 1.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 0.15s',
            letterSpacing: '-0.01em',
          }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            Start practicing →
          </a>
          <a href="https://github.com/sanketsultan/leetnode"
            target="_blank" rel="noopener noreferrer"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: '0.75rem 1.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            View on GitHub
          </a>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-faint)',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <div style={{
            width: '1px',
            height: '40px',
            background: 'linear-gradient(to bottom, transparent, var(--border))',
          }} />
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '2rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          textAlign: 'center',
        }}>
          {[
            { value: problems.length || '—', label: 'Problems' },
            { value: problems.length ? new Set(problems.map(p => p.category)).size : '—', label: 'Categories' },
            { value: 'Docker', label: 'Runtime' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '7rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
          marginBottom: '4rem',
        }}>
          Why LeetNode
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
          borderRadius: '1rem',
          overflow: 'hidden',
        }}>
          {features.map(({ icon, title, body }) => (
            <div key={title} style={{
              background: 'var(--bg)',
              padding: '2.5rem 2rem',
            }}>
              <div style={{
                fontSize: '1.5rem',
                marginBottom: '1.25rem',
                color: 'var(--text-muted)',
              }}>
                {icon}
              </div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem',
              }}>
                {title}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                lineHeight: 1.7,
              }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{
        padding: '5rem 1.5rem 7rem',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            marginBottom: '3.5rem',
            textAlign: 'center',
          }}>
            How it works
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {steps.map(({ n, title, body }, i) => (
              <div key={n} style={{
                display: 'grid',
                gridTemplateColumns: '3rem 1fr',
                gap: '1.5rem',
                paddingBottom: i < steps.length - 1 ? '2.5rem' : '0',
                position: 'relative',
              }}>
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: '1.4rem',
                    top: '2.2rem',
                    bottom: '0',
                    width: '1px',
                    background: 'var(--border)',
                  }} />
                )}
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: 'var(--text-faint)',
                  paddingTop: '0.2rem',
                  letterSpacing: '0.05em',
                }}>
                  {n}
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    marginBottom: '0.5rem',
                  }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem preview ───────────────────────────────────────────────── */}
      {preview.length > 0 && (
        <section style={{
          padding: '5rem 1.5rem 7rem',
          borderTop: '1px solid var(--border)',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2.5rem' }}>
            <p style={{
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
            }}>
              Recent problems
            </p>
            <a href="/problems" style={{
              fontSize: '0.8rem',
              color: 'var(--accent)',
              textDecoration: 'none',
            }}>
              View all →
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {preview.map(p => (
              <a key={p.slug} href={`/problems/${p.slug}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                background: 'var(--bg)',
                textDecoration: 'none',
                transition: 'background 0.1s',
                gap: '1rem',
              }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--bg)')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.375rem' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{p.category}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: difficultyColor[p.difficulty], textTransform: 'capitalize' }}>
                    {p.difficulty}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-faint)' }}>
                    {Math.floor(p.timeLimit / 60)}m
                  </span>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>→</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '8rem 1.5rem',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.75rem, 4vw, 3rem)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginBottom: '1.25rem',
          lineHeight: 1.1,
        }}>
          Ready to debug?
        </h2>
        <p style={{
          fontSize: '1rem',
          color: 'var(--text-muted)',
          marginBottom: '2.5rem',
          maxWidth: '420px',
          margin: '0 auto 2.5rem',
          lineHeight: 1.65,
        }}>
          No account required. Pick a problem and start fixing things.
        </p>
        <a href="/problems" style={{
          display: 'inline-block',
          background: 'var(--text)',
          color: 'var(--bg)',
          padding: '0.875rem 2.25rem',
          borderRadius: '0.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}>
          Browse problems →
        </a>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '2rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            LeetNode · beta
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[
              { label: 'Problems', href: '/problems' },
              { label: 'GitHub', href: 'https://github.com/sanketsultan/leetnode' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{
                fontSize: '0.8rem',
                color: 'var(--text-faint)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--text-faint)')}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
