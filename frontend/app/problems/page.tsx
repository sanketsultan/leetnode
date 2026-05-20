import { getProblems, Problem } from '../../lib/api';

const difficultyColor: Record<string, string> = {
  easy:   '#22c55e',
  medium: '#f59e0b',
  hard:   '#ef4444',
};

export default async function ProblemsPage() {
  let problems: Problem[] = [];
  try {
    problems = await getProblems();
  } catch {
    // backend offline
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
          Problems
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {problems.length} problems across {problems.length ? new Set(problems.map(p => p.category)).size : 0} categories
        </p>
      </div>

      {problems.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Backend not running.</p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>
            cd backend && npm run dev
          </p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-12 gap-4 px-4 pb-3 text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-faint)' }}>
            <div className="col-span-1">#</div>
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Difficulty</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-1">Time</div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }}>
            {problems.map((problem, i) => (
              <a key={problem.slug} href={`/problems/${problem.slug}`} className="problem-row">
                <div className="col-span-1 text-sm font-mono" style={{ color: 'var(--text-faint)' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="col-span-5">
                  <span className="problem-title text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {problem.title}
                  </span>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {problem.tags.map(tag => (
                      <span key={tag} className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 flex items-start pt-0.5">
                  <span className="text-xs font-medium capitalize"
                    style={{ color: difficultyColor[problem.difficulty] ?? 'var(--text-muted)' }}>
                    {problem.difficulty}
                  </span>
                </div>
                <div className="col-span-3 flex items-start pt-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {problem.category}
                  </span>
                </div>
                <div className="col-span-1 flex items-start pt-0.5">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                    {Math.floor(problem.timeLimit / 60)}m
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
