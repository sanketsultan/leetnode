import type { QualityId } from './api';

// ── Qualities (primary navigation concept) ──────────────────────────────────

export interface Quality {
  id: QualityId;
  title: string;
  tagline: string;
  description: string;
  color: string;
  dimColor: string;
  cmd: string;
  problemSlugs: string[];
  develops: string[];
}

export const QUALITIES: Quality[] = [
  {
    id: 'system-thinking',
    title: 'System Thinking',
    tagline: 'See the whole before you fix the part.',
    description:
      'Great engineers don\'t debug components — they debug systems. These problems require understanding how services, configs, and runtimes interact before you can fix anything.',
    color: '#6366f1',
    dimColor: 'rgba(99,102,241,0.08)',
    cmd: '$ systemctl status --failed',
    problemSlugs: ['cron-bad-path', 'postgres-connections', 'cuda-tensor-device', 'cuda-no-grad'],
    develops: ['Cross-layer reasoning', 'Root cause analysis', 'Dependency mapping'],
  },
  {
    id: 'distribution',
    title: 'Distribution',
    tagline: 'Reason about things that don\'t share state.',
    description:
      'Networks lie. Clocks drift. Services restart. These problems put you in scenarios where the failure lives between the moving parts — and you have to find it.',
    color: '#06b6d4',
    dimColor: 'rgba(6,182,212,0.08)',
    cmd: '$ openssl s_client -connect host:443',
    problemSlugs: ['nginx-bad-gateway', 'ssl-cert-expired'],
    develops: ['Network debugging', 'TLS / certificate chains', 'Proxy routing'],
  },
  {
    id: 'perseverance',
    title: 'Perseverance',
    tagline: 'Sit with uncertainty until the signal emerges.',
    description:
      'The answer isn\'t obvious. The first fix doesn\'t work. These problems reward engineers who keep probing methodically instead of guessing and giving up.',
    color: '#f59e0b',
    dimColor: 'rgba(245,158,11,0.08)',
    cmd: '$ du -sh /* | sort -rh | head',
    problemSlugs: ['disk-full', 'log-rotation-broken', 'redis-oom', 'cuda-oom'],
    develops: ['Methodical investigation', 'Config deep-dives', 'Patience under pressure'],
  },
  {
    id: 'curiosity',
    title: 'Curiosity',
    tagline: 'Ask questions the error message doesn\'t.',
    description:
      'Sometimes there\'s no error. Just a service that\'s slow, a number that climbs, a metric that doesn\'t add up. These problems reward engineers who go looking.',
    color: '#8b5cf6',
    dimColor: 'rgba(139,92,246,0.08)',
    cmd: '$ python -m tracemalloc -n 10',
    problemSlugs: ['python-memory-leak'],
    develops: ['Profiling & instrumentation', 'Hypothesis-driven debugging', 'Asking the right questions'],
  },
];

export const QUALITY_MAP: Record<QualityId, Quality> = Object.fromEntries(
  QUALITIES.map(q => [q.id, q])
) as Record<QualityId, Quality>;

// ── Legacy track structure (kept for backward compat with /tracks page) ──────

export interface Track {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  problemSlugs: string[];
  skills: string[];
}

export const TRACKS: Track[] = [
  {
    id: 'gpu-ml',
    title: 'GPU & ML Engineering',
    description: 'Debug PyTorch memory leaks, device errors, and inference crashes that hit production ML systems.',
    level: 'Intermediate',
    problemSlugs: ['cuda-oom', 'cuda-no-grad', 'cuda-tensor-device'],
    skills: ['PyTorch', 'CUDA', 'Memory management', 'GPU debugging'],
  },
  {
    id: 'production-ops',
    title: 'Production Operations',
    description: 'Disk crises, failed restarts, and the fires that wake your on-call rotation at 3am.',
    level: 'Beginner',
    problemSlugs: ['disk-full', 'nginx-bad-gateway', 'log-rotation-broken', 'cron-bad-path'],
    skills: ['Linux', 'nginx', 'Disk management', 'logrotate', 'cron'],
  },
  {
    id: 'python-performance',
    title: 'Python Performance',
    description: 'Memory leaks, unbounded caches, and the subtle runtime bugs that slowly kill your service.',
    level: 'Intermediate',
    problemSlugs: ['python-memory-leak'],
    skills: ['Python', 'Memory profiling', 'LRU cache', 'tracemalloc'],
  },
  {
    id: 'networking',
    title: 'Networking & Proxies',
    description: 'Diagnose 502s, certificate errors, and proxy misconfigurations before users do.',
    level: 'Beginner',
    problemSlugs: ['nginx-bad-gateway', 'ssl-cert-expired'],
    skills: ['nginx', 'HTTP', 'TLS', 'curl'],
  },
  {
    id: 'data-layer',
    title: 'Data Layer Debugging',
    description: 'Redis OOM errors, Postgres connection exhaustion, and the cache bugs that only surface at scale.',
    level: 'Intermediate',
    problemSlugs: ['redis-oom', 'postgres-connections'],
    skills: ['Redis', 'PostgreSQL', 'Connection pooling', 'Memory config'],
  },
];
