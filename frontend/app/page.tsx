import { getProblems, Problem } from '../lib/api';
import ProblemsClient from './problems/client';
import { QUALITIES } from '../lib/tracks';
import HeroTerminal from '../components/HeroTerminal';
import AnimatedTerminal from '../components/AnimatedTerminal';
import SupportButton from '../components/SupportButton';

export default async function HomePage() {
  let problems: Problem[] = [];
  try { problems = await getProblems(); } catch {}

  return (
    <div style={{ color: 'var(--text)', position: 'relative', overflow: 'hidden' }}>

      {/* Aurora blobs — subtle, not competing with content */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="aurora-1" style={{
          position: 'absolute', top: '-20%', left: '5%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div className="aurora-2" style={{
          position: 'absolute', top: '20%', right: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div className="aurora-3" style={{
          position: 'absolute', bottom: '10%', left: '30%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem 4rem', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="hero-grid">

          {/* Left column: copy */}
          <div>
            <div className="hero-badge anim-fade-up">
              <span className="hero-badge-dot" />
              Engineering Character Training Platform
            </div>

            <h1 className="anim-fade-up-1" style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: '-0.05em',
              marginBottom: '1.5rem',
            }}>
              Train the instincts
              <br />
              <span className="gradient-text">great engineers have.</span>
            </h1>

            <p className="anim-fade-up-2" style={{
              fontSize: '1rem',
              color: 'var(--text-muted)',
              lineHeight: 1.75,
              maxWidth: '440px',
              marginBottom: '2.25rem',
              letterSpacing: '-0.01em',
            }}>
              Four qualities separate exceptional engineers from good ones.
              We built real broken systems — one for each.
              No tutorials. No hand-holding. Just you and the terminal.
            </p>

            <div className="anim-fade-up-3" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
              <a href="/problems" className="btn-primary">
                Start training
                <span style={{ opacity: 0.75 }}>-&gt;</span>
              </a>
              <a href="#qualities" className="btn-outline">See the qualities</a>
            </div>

            {/* Stats row */}
            <div className="anim-fade-up-4" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1px',
              background: 'var(--border-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              {[
                { n: problems.length || '11', label: 'Problems' },
                { n: '4',                     label: 'Qualities' },
                { n: '< 5s',                  label: 'Boot time' },
                { n: '$0',                    label: 'To start' },
              ].map(({ n, label }) => (
                <div key={label} className="hero-stat-card" style={{ borderRadius: 0, border: 'none', padding: '1rem' }}>
                  <div className="stat-number" style={{ fontSize: '1.625rem' }}>{n}</div>
                  <div className="stat-label" style={{ fontSize: '0.5625rem', marginTop: '0.25rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: animated terminal */}
          <div className="hero-terminal-col anim-fade-in" style={{ animationDelay: '0.2s', paddingTop: '0.5rem' }}>
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* ── Four Qualities ──────────────────────────────────────────────── */}
      <section id="qualities" style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '6rem 2rem',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <div style={{ marginBottom: '3.5rem' }}>
            <p className="section-label" style={{ marginBottom: '0.5rem' }}>The four qualities</p>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.75rem',
            }}>
              What great engineers{' '}
              <span className="gradient-text-static">have in common.</span>
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.7 }}>
              Algorithms can be studied. These qualities have to be practiced.
              Every problem on this platform develops one of them.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1px',
            background: 'var(--border-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}>
            {QUALITIES.map((q, i) => (
              <a key={q.id} href={`/problems?quality=${q.id}`} className="track-card" style={{ position: 'relative' }}>
                {/* Quality number */}
                <div style={{
                  fontSize: '0.6875rem', fontFamily: 'monospace',
                  color: q.color, marginBottom: '1.25rem',
                  letterSpacing: '0.1em', fontWeight: 700, opacity: 0.8,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '1.0625rem', fontWeight: 700,
                  letterSpacing: '-0.03em', marginBottom: '0.375rem', color: 'var(--text)',
                }}>
                  {q.title}
                </h3>

                {/* Tagline */}
                <p style={{
                  fontSize: '0.75rem', color: q.color, fontStyle: 'italic',
                  marginBottom: '0.875rem', letterSpacing: '-0.01em',
                }}>
                  {q.tagline}
                </p>

                {/* Description */}
                <p style={{
                  fontSize: '0.8125rem', color: 'var(--text-muted)',
                  lineHeight: 1.7, marginBottom: '1.5rem',
                }}>
                  {q.description}
                </p>

                {/* Develops chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.25rem' }}>
                  {q.develops.map(d => (
                    <span key={d} style={{
                      fontSize: '0.625rem', padding: '0.1875rem 0.5rem',
                      borderRadius: '4px', fontFamily: 'monospace',
                      background: q.dimColor,
                      color: q.color,
                      border: `1px solid ${q.color}22`,
                      letterSpacing: '0.02em',
                    }}>
                      {d}
                    </span>
                  ))}
                </div>

                {/* Footer: problem count */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.6875rem', color: q.color,
                    background: q.dimColor, border: `1px solid ${q.color}33`,
                    padding: '0.1875rem 0.625rem', borderRadius: '999px', fontWeight: 500,
                  }}>
                    {q.problemSlugs.length} {q.problemSlugs.length === 1 ? 'problem' : 'problems'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                    {q.cmd}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problems ────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border-subtle)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem 0' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', marginBottom: '1.5rem',
            flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Problem library</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.04em' }}>
                Pick your problem.
              </h2>
            </div>
            <a href="/problems" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3125rem 0.875rem' }}>
              Full library -&gt;
            </a>
          </div>
        </div>
        <ProblemsClient initialProblems={problems} embedded />
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '6rem 2rem',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <div style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
            <p className="section-label" style={{ marginBottom: '0.5rem' }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.75rem' }}>
              Learn by{' '}
              <span className="gradient-text-static">actually doing it.</span>
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              No videos. No multiple choice. A real broken system and you have 30 minutes.
            </p>
          </div>

          <div className="step-grid" style={{ marginBottom: '4rem' }}>

            <div className="step-card">
              <div style={{ fontSize: '0.5625rem', fontFamily: 'monospace', letterSpacing: '0.15em', color: '#6366f1', fontWeight: 700, marginBottom: '1rem', opacity: 0.9 }}>STEP 01</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Pick a quality to train
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                Choose which engineering instinct to sharpen today. Each problem is designed to develop a specific quality.
              </p>
              <AnimatedTerminal delay={0} lines={[
                [{ text: '$ ', color: '#4b5563' }, { text: 'leetnode ', color: '#a5b4fc' }, { text: 'list --quality perseverance', color: '#fde68a' }],
                [{ text: '→ disk-full       [easy]', color: '#4ade80' }],
                [{ text: '→ redis-oom       [medium]', color: '#fbbf24' }],
                [{ text: '→ cuda-oom        [hard]', color: '#f87171' }],
              ]} />
            </div>

            <div className="step-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M12 6l4 4-4 4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="step-card">
              <div style={{ fontSize: '0.5625rem', fontFamily: 'monospace', letterSpacing: '0.15em', color: '#8b5cf6', fontWeight: 700, marginBottom: '1rem', opacity: 0.9 }}>STEP 02</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Debug in a live terminal
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                A real Linux container. Real logs. Real config files. The same commands you'd run on a production box.
              </p>
              <AnimatedTerminal delay={300} lines={[
                [{ text: '$ ', color: '#4b5563' }, { text: 'journalctl ', color: '#a5b4fc' }, { text: '-xe | tail -20', color: '#9ca3af' }],
                [{ text: 'Job for redis.service failed', color: '#f87171' }],
                [{ text: '$ ', color: '#4b5563' }, { text: 'cat ', color: '#a5b4fc' }, { text: '/etc/redis/redis.conf | grep max', color: '#9ca3af' }],
                [{ text: 'maxmemory 1mb  ', color: '#f87171' }, { text: '# too low', color: '#fbbf24' }],
              ]} />
            </div>

            <div className="step-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M12 6l4 4-4 4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="step-card">
              <div style={{ fontSize: '0.5625rem', fontFamily: 'monospace', letterSpacing: '0.15em', color: '#22c55e', fontWeight: 700, marginBottom: '1rem', opacity: 0.9 }}>STEP 03</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Verify your fix
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                Click verify. The backend runs the actual check inside the container. Pass or fail. No guessing.
              </p>
              <AnimatedTerminal delay={600} lines={[
                [{ text: '$ ', color: '#4b5563' }, { text: 'redis-cli ', color: '#a5b4fc' }, { text: 'ping', color: '#fde68a' }],
                [{ text: 'PONG', color: '#4ade80' }],
                [{ text: ' ', color: '#4b5563' }],
                [{ text: '[PASS] ', color: '#22c55e', bold: true }, { text: 'Perseverance +200pts', color: '#4ade80' }],
              ]} />
            </div>
          </div>

          {/* Comparison table */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: '2rem' }}>
            <div className="compare-row" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              <span>What you get</span>
              <span style={{ textAlign: 'center', color: '#a5b4fc' }}>LeetNode</span>
              <span style={{ textAlign: 'center' }}>Video courses</span>
              <span style={{ textAlign: 'center' }}>Quiz sites</span>
            </div>
            {[
              { feature: 'Trains real engineering instincts', leetnode: true,  video: false, quiz: false },
              { feature: 'Real Linux environment',           leetnode: true,  video: false, quiz: false },
              { feature: 'Instant verified feedback',        leetnode: true,  video: false, quiz: true  },
              { feature: 'No setup required',                leetnode: true,  video: true,  quiz: true  },
              { feature: 'Production-grade scenarios',       leetnode: true,  video: false, quiz: false },
              { feature: 'Free to start',                    leetnode: true,  video: false, quiz: true  },
            ].map(({ feature, leetnode, video, quiz }) => (
              <div key={feature} className="compare-row">
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{feature}</span>
                <span style={{ textAlign: 'center', fontSize: '0.875rem', color: leetnode ? '#4ade80' : '#374151' }}>{leetnode ? '+ yes' : '-'}</span>
                <span style={{ textAlign: 'center', fontSize: '0.875rem', color: video ? '#6b7280' : '#374151' }}>{video ? '~ maybe' : '- no'}</span>
                <span style={{ textAlign: 'center', fontSize: '0.875rem', color: quiz ? '#6b7280' : '#374151' }}>{quiz ? '~ partial' : '- no'}</span>
              </div>
            ))}
          </div>

          {/* Trust bar */}
          <div className="trust-bar">
            {[
              { icon: '[ ]', label: 'Real Linux containers', sub: 'Docker, not a simulation' },
              { icon: '<1s', label: 'Instant verification',  sub: 'Runs your actual fix' },
              { icon: '/>_', label: 'Zero setup',            sub: 'Browser only, no install' },
              { icon: '$0 ', label: 'Free to start',         sub: 'No account required' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="trust-bar-item">
                <div className="trust-icon">{icon}</div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{label}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginTop: '0.125rem' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border-subtle)', padding: '5rem 2rem', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div className="cta-card">
            <div style={{
              position: 'absolute', top: '-40%', left: '20%',
              width: '60%', height: '200%',
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />
            <p className="section-label" style={{ marginBottom: '1rem' }}>Ready to level up?</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '1rem', position: 'relative' }}>
              Stop watching.{' '}
              <span className="gradient-text-static">Start training.</span>
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: '2.25rem', position: 'relative' }}>
              Your terminal is waiting. No setup, no account required.
            </p>
            <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <a href="/problems" className="btn-primary">Pick a problem -&gt;</a>
              <a href="#qualities" className="btn-outline">See the qualities</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.75rem 2rem', position: 'relative', zIndex: 1 }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        }}>
          <span style={{
            fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #a5b4fc, #c4b5fd)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            LeetNode
          </span>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <a href="/problems" className="footer-link">Problems</a>
            <a href="#qualities" className="footer-link">Qualities</a>
            <a href="/leaderboard" className="footer-link">Leaderboard</a>
            <SupportButton variant="compact" />
          </div>
        </div>
      </footer>
    </div>
  );
}
