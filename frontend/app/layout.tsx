import type { Metadata } from 'next';
import './globals.css';
import PostHogProvider from '../components/PostHogProvider';
import FeedbackButton from '../components/FeedbackButton';
import AuthProvider from '../components/AuthProvider';
import UserMenu from '../components/UserMenu';

export const metadata: Metadata = {
  title: 'LeetNode: Infrastructure Debugging Platform',
  description: 'Real broken systems. Real terminal. Practice the debugging skills that matter on-call.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
        {/* AuthProvider must wrap the header too — UserMenu calls useSession() */}
        <AuthProvider>
          <header className="platform-header">
            <div className="platform-header-inner">
              <a href="/" className="platform-logo">
                LeetNode
              </a>
              <nav className="platform-nav">
                <a href="/problems" className="platform-nav-link">Problems</a>
                <a href="/tracks" className="platform-nav-link">Tracks</a>
                <a href="/leaderboard" className="platform-nav-link">Leaderboard</a>
              </nav>
              <div className="platform-nav-actions">
                <UserMenu />
              </div>
            </div>
          </header>
          <PostHogProvider>{children}</PostHogProvider>
          <FeedbackButton />
        </AuthProvider>
      </body>
    </html>
  );
}
