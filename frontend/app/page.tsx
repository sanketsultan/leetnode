import { getProblems, Problem } from '../lib/api';
import ProblemsClient from './problems/client';
import { TRACKS } from '../lib/tracks';
import HeroTerminal from '../components/HeroTerminal';
import SkillsTicker from '../components/SkillsTicker';

export default async function HomePage() {
  let problems: Problem[] = [];
  try { problems = await getProblems(); } catch {}

  const categoryCount = new Set(problems.map(p => p.category)).size;

  return (
    <div style={{ color: 'var(--text)', position: 'relative', overflow: 'hidden' }}>

      {/* Aurora blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="aurora-1" style={{
          position: 'absolute', top: '-20%', left: '5%',
          width: '650px', height: '650px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.13) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
        <div className="aurora-2" style={{
          position: 'absolute', top: '20%', right: '-10%',
          width: '550px', height: '550px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.09) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
        <div className="aurora-3" style={{
          position: 'absolute', bottom: '10%', left: '30%',
          width: '450px', height: '450px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem 4rem', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="hero-grid">

          {/* Left column: copy */}
          <div>
            <div className="hero-badge anim-fade-up">
              <span className="hero-badge-dot" />
              Infrastructure Debugging Platform
            </div>

            <h1 className="anim-fade-up-1" style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: '-0.05em',
              marginBottom: '1.5rem',
            }}>
              Debug production
              <br />
              <span className="gradient-text">before it pages you.</span>
            </h1>

            <p className="anim-fade-up-2" style={{
              fontSize: '1rem',
              color: 'var(--text-muted)',
              lineHeight: 1.75,
              maxWidth: '440px',
              marginBottom: '2.25rem',
              letterSpacing: '-0.01em',
            }}>
              Real broken systems. Live terminal.
              Fix it and know immediately if you got it right.
              No tutorials. No hand-holding. Just you and the logs.
            </p>

            <div className="anim-fade-up-3" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
              <a href="/problems" className="btn-primary">
                Browse problems
                <span style={{ opacity: 0.75 }}>-&gt;</span>
              </a>
              <a href="/tracks" className="btn-outline">View tracks</a>
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
                { n: problems.length || '8', label: 'Problems' },
                { n: categoryCount || '4',   label: 'Categories' },
                { n: TRACKS.length,           label: 'Tracks' },
                { n: '< 5s',                  label: 'Boot time' },
              ].map(({ n, label }) => (
                <div key={label} className="hero-stat-card" style={{ borderRadius: 0, border: 'none', padding: '1rem' }}>
                  <div className="stat-number" style={{ fontSize: '1.625rem' }}>{n}</div>
                  <div className="stat-label" style={{ fontSize: '0.5625rem', marginTop: '0.25rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: animated terminal — offset slightly to optically match the headline */}
          <div className="hero-terminal-col anim-fade-in" style={{ animationDelay: '0.2s', paddingTop: '0.5rem' }}>
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* ── Tracks ──────────────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '5rem 2rem',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', marginBottom: '1.5rem',
            flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Learning paths</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.04em' }}>
                Pick your track.
              </h2>
            </div>
            <a href="/tracks" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3125rem 0.875rem' }}>
              All tracks -&gt;
            </a>
          </div>

          {/* Skills ticker — scrolls continuously, pauses on hover */}
          <SkillsTicker />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1px',
            background: 'var(--border-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}>
            {TRACKS.map((track, i) => {
              const count = track.problemSlugs.length;

              // Representative command snippet per track — shown on card hover
              const cmds: Record<string, string> = {
                'gpu-ml':             '$ nvidia-smi | grep OOM',
                'production-ops':     '$ df -h && journalctl -xe',
                'python-performance': '$ python -m tracemalloc',
                'networking':         '$ curl -vI https://api && openssl',
              };
              const cmd = cmds[track.id] ?? '$ ls -la';

              return (
                <a key={track.id} href={`/tracks#${track.id}`} className="track-card">
                  <div style={{
                    fontSize: '0.6875rem', fontFamily: 'monospace',
                    color: 'var(--text-faint)', marginBottom: '1.25rem',
                    letterSpacing: '0.1em', fontWeight: 600,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 style={{
                    fontSize: '1rem', fontWeight: 700,
                    letterSpacing: '-0.03em', marginBottom: '0.625rem', color: 'var(--text)',
                  }}>
                    {track.title}
                  </h3>
                  <p style={{
                    fontSize: '0.8125rem', color: 'var(--text-muted)',
                    lineHeight: 1.7, marginBottom: '1.5rem',
                  }}>
                    {track.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.6875rem', color: '#a5b4fc',
                      background: 'var(--accent-dim)', border: '1px solid var(--border-accent)',
                      padding: '0.1875rem 0.625rem', borderRadius: '999px', fontWeight: 500,
                    }}>
                      {count} {count === 1 ? 'problem' : 'problems'}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                      {track.level}
                    </span>
                  </div>
                  {/* Command preview — fades in on card hover via CSS */}
                  <span className="track-cmd">{cmd}</span>
                </a>
              );
            })}
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
                Start solving.
              </h2>
            </div>
            <a href="/problems" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3125rem 0.875rem' }}>
              Full library -&gt;
            </a>
          </div>
        </div>
        <ProblemsClient initialProblems={problems} embedded />
      </section>

      {/* ── Why LeetNode ─────────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '6rem 2rem',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
            <p className="section-label" style={{ marginBottom: '0.5rem' }}>Why LeetNode</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.75rem' }}>
              Learn by{' '}
              <span className="gradient-text">actually doing it.</span>
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              No videos. No multiple choice. A real broken system and you have 30 minutes.
            </p>
          </div>

          {/* 3-step flow */}
          <div className="step-grid" style={{ marginBottom: '4rem' }}>

            {/* Step 1 */}
            <div className="step-card">
              <div style={{
                fontSize: '0.5625rem', fontFamily: 'monospace', letterSpacing: '0.15em',
                color: '#6366f1', fontWeight: 700, marginBottom: '1rem', opacity: 0.9,
              }}>STEP 01</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Pick a broken system
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                Choose from real infra failures: OOM killed services, 502 gateways, GPU memory leaks, disk floods.
              </p>
              <div className="step-snippet">
                <span style={{ color: '#4b5563' }}>$</span>{' '}
                <span style={{ color: '#a5b4fc' }}>curl -sI</span>{' '}
                <span style={{ color: '#fde68a' }}>http://api/health</span>
                <br />
                <span style={{ color: '#f87171' }}>HTTP/1.1 502 Bad Gateway</span>
                <br />
                <span style={{ color: '#374151', fontStyle: 'italic' }}># your problem starts here</span>
              </div>
            </div>

            <div className="step-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M12 6l4 4-4 4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Step 2 */}
            <div className="step-card">
              <div style={{
                fontSize: '0.5625rem', fontFamily: 'monospace', letterSpacing: '0.15em',
                color: '#8b5cf6', fontWeight: 700, marginBottom: '1rem', opacity: 0.9,
              }}>STEP 02</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Debug in a live terminal
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                A real Linux container. Real logs. Real config files. The same commands you would run on a production box.
              </p>
              <div className="step-snippet">
                <span style={{ color: '#4b5563' }}>$</span>{' '}
                <span style={{ color: '#a5b4fc' }}>ss -tlnp</span>{' '}
                <span style={{ color: '#9ca3af' }}>| grep node</span>
                <br />
                <span style={{ color: '#fde68a' }}>LISTEN 0 511 *:8081</span>
                <br />
                <span style={{ color: '#4b5563' }}>$</span>{' '}
                <span style={{ color: '#a5b4fc' }}>grep proxy_pass</span>{' '}
                <span style={{ color: '#9ca3af' }}>/etc/nginx/*.conf</span>
                <br />
                <span style={{ color: '#f87171' }}>proxy_pass 127.0.0.1:8080</span>
                <span style={{ color: '#fbbf24' }}> # mismatch</span>
              </div>
            </div>

            <div className="step-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M12 6l4 4-4 4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Step 3 */}
            <div className="step-card">
              <div style={{
                fontSize: '0.5625rem', fontFamily: 'monospace', letterSpacing: '0.15em',
                color: '#22c55e', fontWeight: 700, marginBottom: '1rem', opacity: 0.9,
              }}>STEP 03</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Verify your fix
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                Click verify. The backend runs the actual check inside the container. Pass or fail. No guessing, no partial credit.
              </p>
              <div className="step-snippet">
                <span style={{ color: '#4b5563' }}>$</span>{' '}
                <span style={{ color: '#a5b4fc' }}>curl -s</span>{' '}
                <span style={{ color: '#fde68a' }}>http://api/health</span>
                <br />
                <span style={{ color: '#4ade80' }}>{`{"status":"ok","uptime":3721}`}</span>
                <br />
                <br />
                <span style={{ color: '#22c55e', fontWeight: 700 }}>[PASS]</span>{' '}
                <span style={{ color: '#4ade80' }}>Verified in 4m 12s</span>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            marginBottom: '2rem',
          }}>
            {/* Table header */}
            <div className="compare-row" style={{
              background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border)',
              fontWeight: 700,
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
            }}>
              <span>What you get</span>
              <span style={{ textAlign: 'center', color: '#a5b4fc' }}>LeetNode</span>
              <span style={{ textAlign: 'center' }}>Video courses</span>
              <span style={{ textAlign: 'center' }}>Quiz sites</span>
            </div>

            {[
              { feature: 'Real Linux environment',        leetnode: true,  video: false, quiz: false },
              { feature: 'No setup required',             leetnode: true,  video: true,  quiz: true  },
              { feature: 'Hands-on terminal access',      leetnode: true,  video: false, quiz: false },
              { feature: 'Instant verified feedback',     leetnode: true,  video: false, quiz: true  },
              { feature: 'Production-grade scenarios',    leetnode: true,  video: false, quiz: false },
              { feature: 'Free to start',                 leetnode: true,  video: false, quiz: true  },
            ].map(({ feature, leetnode, video, quiz }) => (
              <div key={feature} className="compare-row">
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{feature}</span>
                <span style={{ textAlign: 'center', fontSize: '0.875rem', color: leetnode ? '#4ade80' : '#374151' }}>
                  {leetnode ? '+ yes' : '-'}
                </span>
                <span style={{ textAlign: 'center', fontSize: '0.875rem', color: video ? '#6b7280' : '#374151' }}>
                  {video ? '~ maybe' : '- no'}
                </span>
                <span style={{ textAlign: 'center', fontSize: '0.875rem', color: quiz ? '#6b7280' : '#374151' }}>
                  {quiz ? '~ partial' : '- no'}
                </span>
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
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              fontWeight: 800, letterSpacing: '-0.05em',
              marginBottom: '1rem', position: 'relative',
            }}>
              Stop reading.{' '}
              <span className="gradient-text">Start debugging.</span>
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: '2.25rem', position: 'relative' }}>
              Your terminal is waiting. No setup, no account required.
            </p>
            <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <a href="/problems" className="btn-primary">Pick a problem -&gt;</a>
              <a href="/tracks" className="btn-outline">Browse tracks</a>
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
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="/problems" className="footer-link">Problems</a>
            <a href="/tracks" className="footer-link">Tracks</a>
            <a href="/leaderboard" className="footer-link">Leaderboard</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
