// Server Component — no 'use client' needed, pure CSS animation

const ROW_1 = [
  'PyTorch', 'CUDA', 'GPU debugging', 'Memory management',
  'Linux', 'nginx', 'logrotate', 'Disk management',
  'Python', 'tracemalloc', 'LRU cache', 'Memory profiling',
  'HTTP', 'TLS/SSL', 'curl', 'OpenSSL',
];

const ROW_2 = [
  'systemd', 'journalctl', 'strace', 'lsof',
  'htop', 'dmesg', 'ss', 'tcpdump',
  'iptables', 'df -h', 'ps aux', 'netstat',
  'awk', 'sed', 'grep', 'tail -f',
];

// Category color per skill
const SKILL_COLORS: Record<string, string> = {
  'PyTorch': '#f87171', 'CUDA': '#f87171', 'GPU debugging': '#f87171', 'Memory management': '#f87171',
  'Linux': '#4ade80', 'nginx': '#4ade80', 'logrotate': '#4ade80', 'Disk management': '#4ade80',
  'Python': '#fbbf24', 'tracemalloc': '#fbbf24', 'LRU cache': '#fbbf24', 'Memory profiling': '#fbbf24',
  'HTTP': '#a5b4fc', 'TLS/SSL': '#a5b4fc', 'curl': '#a5b4fc', 'OpenSSL': '#a5b4fc',
};

function Pill({ skill }: { skill: string }) {
  const color = SKILL_COLORS[skill] ?? '#6b7280';
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4375rem',
      padding: '0.3125rem 0.75rem',
      borderRadius: '999px',
      border: `1px solid ${color}22`,
      background: `${color}0d`,
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        fontFamily: 'monospace',
        fontSize: '0.625rem',
        color: color,
        opacity: 0.6,
      }}>$</span>
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 500,
        color: '#9ca3af',
        letterSpacing: '0.01em',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        {skill}
      </span>
    </div>
  );
}

interface TickerRowProps {
  skills: string[];
  direction: 'fwd' | 'rev';
  duration?: string;
}

function TickerRow({ skills, direction, duration = '30s' }: TickerRowProps) {
  // Duplicate for seamless loop
  const doubled = [...skills, ...skills];
  return (
    <div style={{
      overflow: 'hidden',
      maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
    }}>
      <div
        className={direction === 'fwd' ? 'ticker-fwd' : 'ticker-rev'}
        style={{ animationDuration: duration, display: 'flex', gap: '0.5rem', width: 'max-content' }}
      >
        {doubled.map((skill, i) => (
          <Pill key={`${skill}-${i}`} skill={skill} />
        ))}
      </div>
    </div>
  );
}

export default function SkillsTicker() {
  return (
    <div style={{
      padding: '1.5rem 0',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      marginBottom: '2.5rem',
    }}>
      <TickerRow skills={ROW_1} direction="fwd" duration="32s" />
      <TickerRow skills={ROW_2} direction="rev" duration="28s" />
    </div>
  );
}
