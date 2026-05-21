'use client';

import { useState, useEffect } from 'react';
import { Problem } from '../../lib/api';
import { TRACKS } from '../../lib/tracks';

const SOLVED_KEY = 'leetnode:solved';

const difficultyColor: Record<string, string> = {
  easy: 'var(--diff-easy)',
  medium: 'var(--diff-medium)',
  hard: 'var(--diff-hard)',
};

export default function TracksClient({ problems }: { problems: Problem[] }) {
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOLVED_KEY);
      if (raw) setSolved(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  const problemsBySlug = Object.fromEntries(problems.map(p => [p.slug, p]));

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '3rem' }}>
        <p className="section-label" style={{ marginBottom: '0.625rem' }}>Learning tracks</p>
        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
          fontWeight: 800,
          letterSpacing: '-0.05em',
          marginBottom: '0.875rem',
        }}>
          Structured paths to{' '}
          <span className="gradient-text">level up.</span>
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.65 }}>
          Each track is a curated sequence of problems that builds a specific debugging skill.
          Complete a track to develop real, transferable expertise.
        </p>
      </div>

      {/* Tracks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {TRACKS.map(track => {
          const trackProblems = track.problemSlugs
            .map(slug => problemsBySlug[slug])
            .filter(Boolean);
          const solvedInTrack = trackProblems.filter(p => solved.has(p.slug)).length;
          const progress = trackProblems.length > 0
            ? Math.round((solvedInTrack / trackProblems.length) * 100)
            : 0;

          return (
            <div key={track.id} id={track.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                backdropFilter: 'blur(12px)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}>

              {/* Track header */}
              <div style={{
                padding: '2rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex', gap: '1.5rem', alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: 'var(--radius)', flexShrink: 0,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 600,
                  color: 'var(--text-faint)', letterSpacing: '0.05em',
                }}>
                  {String(TRACKS.indexOf(track) + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
                      {track.title}
                    </h2>
                    <span className="badge badge-neutral">{track.level}</span>
                    {solvedInTrack === trackProblems.length && trackProblems.length > 0 && (
                      <span className="badge badge-easy">✓ Completed</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
                    {track.description}
                  </p>

                  {/* Skills */}
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {track.skills.map(skill => (
                      <span key={skill} style={{
                        fontSize: '0.6875rem', padding: '0.2rem 0.625rem',
                        borderRadius: '999px', fontFamily: 'monospace', fontWeight: 500,
                        background: 'var(--bg-subtle)', color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                {trackProblems.length > 0 && (
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em',
                      color: progress === 100 ? 'var(--success)' : 'var(--text)',
                    }}>
                      {progress}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.25rem' }}>
                      {solvedInTrack}/{trackProblems.length} solved
                    </div>
                    {/* Progress bar */}
                    <div style={{
                      width: '80px', height: '3px', borderRadius: '2px',
                      background: 'var(--border)', overflow: 'hidden', marginTop: '0.625rem',
                    }}>
                      <div style={{
                        height: '100%', width: `${progress}%`,
                        background: progress === 100 ? 'var(--success)' : 'var(--accent)',
                        borderRadius: '2px', transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Problems in track */}
              {trackProblems.length > 0 ? (
                <div>
                  {trackProblems.map((problem, idx) => {
                    const isSolved = solved.has(problem.slug);
                    return (
                      <a key={problem.slug} href={`/problems/${problem.slug}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1.25rem',
                          padding: '1.125rem 2rem',
                          borderBottom: idx < trackProblems.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                          textDecoration: 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Step number / check */}
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace',
                          background: isSolved ? 'rgba(22,163,74,0.08)' : 'var(--bg-subtle)',
                          border: `1px solid ${isSolved ? 'rgba(22,163,74,0.25)' : 'var(--border)'}`,
                          color: isSolved ? 'var(--success)' : 'var(--text-faint)',
                        }}>
                          {isSolved ? '✓' : `${idx + 1}`}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
                            {problem.title}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {problem.tags.map(tag => (
                              <span key={tag} style={{
                                fontSize: '0.6875rem', fontFamily: 'monospace',
                                color: 'var(--text-faint)', padding: '0.125rem 0.5rem',
                                background: 'var(--bg-subtle)', borderRadius: '4px',
                                border: '1px solid var(--border)',
                              }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <span className={`badge badge-${problem.difficulty}`}>
                            {problem.difficulty}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-faint)' }}>
                            {Math.floor(problem.timeLimit / 60)}m
                          </span>
                          <span style={{ color: 'var(--text-faint)', fontSize: '0.875rem' }}>→</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-faint)' }}>
                    Problems coming soon
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* More tracks coming */}
      <div style={{
        marginTop: '2rem',
        padding: '2rem',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-xl)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-faint)', marginBottom: '0.375rem' }}>
          More tracks coming soon
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
          Kubernetes · Databases · Cloud Infrastructure · Security
        </p>
      </div>
    </div>
  );
}
