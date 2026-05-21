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
    problemSlugs: ['disk-full', 'nginx-bad-gateway', 'log-rotation-broken'],
    skills: ['Linux', 'nginx', 'Disk management', 'logrotate'],
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
];
