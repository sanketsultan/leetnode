import { getProblems, Problem } from '../lib/api';
import { Terminal, ChevronRight } from 'lucide-react';

const difficultyColors: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  hard: 'text-red-400 bg-red-400/10',
};

export default async function HomePage() {
  let problems: Problem[] = [];
  try {
    problems = await getProblems();
  } catch {
    // Backend not running yet
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">
          Practice Infrastructure Debugging
        </h1>
        <p className="text-slate-400 text-lg">
          Real terminal access to broken environments. Debug GPU failures, Kubernetes issues, and more.
        </p>
      </div>

      {problems.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <Terminal className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">Backend not running or no problems loaded yet.</p>
          <p className="text-slate-600 text-sm mt-2">Start the backend with <code className="bg-slate-800 px-2 py-0.5 rounded">npm run dev</code></p>
        </div>
      ) : (
        <div className="grid gap-4">
          {problems.map((problem) => (
            <a
              key={problem.slug}
              href={`/problems/${problem.slug}`}
              className="group block rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900 transition-all p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColors[problem.difficulty] || 'text-slate-400'}`}>
                      {problem.difficulty}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                      {problem.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {problem.title}
                  </h2>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {problem.tags.map((tag) => (
                      <span key={tag} className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
