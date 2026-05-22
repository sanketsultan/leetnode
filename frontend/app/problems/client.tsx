'use client';

import { useState, useEffect, useMemo } from 'react';
import { Problem, QualityId } from '../../lib/api';
import { QUALITIES, QUALITY_MAP } from '../../lib/tracks';

const SOLVED_KEY = 'leetnode:solved';

const difficultyColor: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

interface Props {
  initialProblems: Problem[];
  embedded?: boolean;
}

export default function ProblemsClient({ initialProblems, embedded = false }: Props) {
  const [search, setSearch]       = useState('');
  const [quality, setQuality]     = useState<QualityId | 'All'>('All');
  const [difficulty, setDifficulty] = useState('All');
  const [solved, setSolved]       = useState<Set<string>>(new Set());

  // Load solved from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOLVED_KEY);
      if (raw) setSolved(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  // Filtered problems
  const filtered = useMemo(() => {
    return initialProblems.filter(p => {
      const matchSearch =
        search === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchQuality    = quality === 'All' || p.quality === quality;
      const matchDifficulty = difficulty === 'All' || p.difficulty === difficulty;
      return matchSearch && matchQuality && matchDifficulty;
    });
  }, [initialProblems, search, quality, difficulty]);

  const solvedCount = initialProblems.filter(p => solved.has(p.slug)).length;

  return (
    <main
      className="max-w-6xl mx-auto px-6"
      style={{ paddingTop: embedded ? '2.5rem' : '4rem', paddingBottom: embedded ? '4rem' : '4rem' }}
    >

      {/* ── Header — hidden when embedded ──────────────────────────────── */}
      {!embedded && (
        <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
              Problems
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {initialProblems.length} problems · 4 qualities
              {solvedCount > 0 && (
                <span style={{ color: '#22c55e', marginLeft: '0.75rem' }}>
                  · {solvedCount}/{initialProblems.length} solved
                </span>
              )}
            </p>
          </div>
          {initialProblems.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '120px', height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(solvedCount / initialProblems.length) * 100}%`,
                  background: '#22c55e', borderRadius: '2px', transition: 'width 0.4s ease',
                }} />
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                {Math.round((solvedCount / initialProblems.length) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Embedded compact header ─────────────────────────────────────── */}
      {embedded && (
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {initialProblems.length} problems
            {solvedCount > 0 && (
              <span style={{ color: '#22c55e', marginLeft: '0.625rem', fontWeight: 400 }}>
                · {solvedCount} solved
              </span>
            )}
          </p>
          {solvedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: '80px', height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(solvedCount / initialProblems.length) * 100}%`, background: '#22c55e', borderRadius: '2px' }} />
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                {Math.round((solvedCount / initialProblems.length) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '0.875rem', pointerEvents: 'none' }}>⌕</span>
          <input
            className="filter-input"
            type="text"
            placeholder="Search problems, tags, categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Quality pills + difficulty pills */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Quality */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setQuality('All')}
              className={`filter-pill ${quality === 'All' ? 'active-category' : ''}`}
            >
              All
            </button>
            {QUALITIES.map(q => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className="filter-pill"
                style={quality === q.id ? {
                  background: q.dimColor,
                  color: q.color,
                  borderColor: `${q.color}44`,
                } : {}}
              >
                {q.title}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '18px', background: 'var(--border)', flexShrink: 0 }} />

          {/* Difficulty */}
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {['All', 'easy', 'medium', 'hard'].map(diff => (
              <button key={diff} onClick={() => setDifficulty(diff)}
                className={`filter-pill ${difficulty === diff ? (diff === 'All' ? 'active-all' : `active-${diff}`) : ''}`}
                style={{ textTransform: diff === 'All' ? undefined : 'capitalize' }}>
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {initialProblems.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Backend not running.</p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>cd backend && npm run dev</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No problems match your filters.</p>
          <button
            onClick={() => { setSearch(''); setQuality('All'); setDifficulty('All'); }}
            className="text-xs mt-2"
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div>
          {/* Column headers — hidden on mobile */}
          <div className="problem-row problem-row-desktop-header" style={{ background: 'transparent', cursor: 'default' }}
            onMouseEnter={() => {}} onMouseLeave={() => {}}>
            {['#', 'Title', 'Quality', 'Difficulty', 'Time', ''].map((h, i) => (
              <div key={i} style={{
                fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-faint)',
                textAlign: i === 5 ? 'right' : undefined,
              }}>
                {h}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }}>
            {filtered.map((problem, i) => {
              const isSolved = solved.has(problem.slug);
              const q = problem.quality ? QUALITY_MAP[problem.quality] : null;
              return (
                <a key={problem.slug} href={`/problems/${problem.slug}`} className="problem-row">
                  {/* # */}
                  <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-faint)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {/* Title + tags */}
                  <div>
                    <span className="problem-title" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>
                      {problem.title}
                    </span>
                    <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
                      {problem.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: '0.6875rem', fontFamily: 'monospace',
                          padding: '0.125rem 0.5rem', borderRadius: '4px',
                          background: 'var(--bg-subtle)', color: 'var(--text-faint)',
                          border: '1px solid var(--border)',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Quality badge */}
                  <div>
                    {q ? (
                      <span style={{
                        fontSize: '0.625rem', padding: '0.1875rem 0.5rem',
                        borderRadius: '4px', fontWeight: 600,
                        background: q.dimColor, color: q.color,
                        border: `1px solid ${q.color}33`,
                        whiteSpace: 'nowrap',
                      }}>
                        {q.title}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>—</span>
                    )}
                  </div>
                  {/* Difficulty */}
                  <div>
                    <span className={`badge badge-${problem.difficulty}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                  {/* Time */}
                  <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-faint)' }}>
                    {Math.floor(problem.timeLimit / 60)}m
                  </div>
                  {/* Solved */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {isSolved
                      ? <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--success)' }}>✓</span>
                      : <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>-</span>
                    }
                  </div>
                </a>
              );
            })}
          </div>

          {filtered.length < initialProblems.length && (
            <p className="text-xs mt-4 px-4" style={{ color: 'var(--text-faint)' }}>
              Showing {filtered.length} of {initialProblems.length} problems
            </p>
          )}
        </div>
      )}
    </main>
  );
}
