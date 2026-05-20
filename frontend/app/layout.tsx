import type { Metadata } from 'next';
import './globals.css';
import PostHogProvider from '../components/PostHogProvider';

export const metadata: Metadata = {
  title: 'LeetNode — Infrastructure Debugging Practice',
  description: 'Practice debugging GPU, Kubernetes, and infrastructure problems with real terminal access.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <header style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                LeetNode
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{
                background: 'var(--border)',
                color: 'var(--text-muted)',
              }}>
                beta
              </span>
            </a>
            <nav className="flex items-center gap-6">
              <a href="/problems" className="nav-link">Problems</a>
              <a
                href="https://github.com/sanketsultan/leetnode"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link">
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
