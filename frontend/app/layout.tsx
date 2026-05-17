import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeetNode.io — GPU & Infrastructure Troubleshooting',
  description: 'Practice debugging GPU, Kubernetes, and infrastructure problems with real terminal access.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f1117] text-slate-200">
        <nav className="border-b border-slate-800 bg-[#0f1117]/95 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-blue-400 hover:text-blue-300 transition-colors">
              LeetNode<span className="text-slate-500">.io</span>
            </a>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <a href="/" className="hover:text-slate-200 transition-colors">Problems</a>
              <a
                href="https://github.com/sanketsultan/leetnode"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-200 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
