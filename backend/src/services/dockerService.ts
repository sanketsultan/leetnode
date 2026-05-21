import Dockerode from 'dockerode';
import fs from 'fs';
import { config } from '../config';
import { VerifyResult } from '../types';

let docker: Dockerode;

export function initializeDocker(): void {
  docker = new Dockerode({ socketPath: config.DOCKER_SOCKET });
  console.log(`[Docker] Connected via ${config.DOCKER_SOCKET}`);
}

export async function cleanupOrphanedContainers(): Promise<void> {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { name: ['leetnode-session-'] },
    });

    if (containers.length > 0) {
      console.log(`[Docker] Cleaning up ${containers.length} orphaned container(s)...`);
      await Promise.all(
        containers.map(async (info) => {
          const container = docker.getContainer(info.Id);
          try {
            await container.stop({ t: 2 });
          } catch {
            // May already be stopped
          }
          await container.remove({ force: true });
          console.log(`[Docker] Removed orphan: ${info.Names[0]}`);
        })
      );
    }
  } catch (err) {
    console.warn('[Docker] Could not clean orphaned containers:', err);
  }
}

// ── Host-info isolation ────────────────────────────────────────────────────────
//
// Docker bind-mounts /etc/hosts, /etc/hostname, and /etc/resolv.conf from the
// host into every container. Because these files live on /dev/root (the EC2
// EBS volume), `df -h` inside the container reveals the host device name and
// disk usage — a security info leak.
//
// Fix: write sanitized versions of all three files to /dev/shm (host tmpfs,
// shared into the backend container via docker-compose). Bind-mounting tmpfs
// files means `df -h` shows "tmpfs" instead of "/dev/root". Files are cleaned
// up when the container is destroyed.

interface SandboxFiles {
  hosts:    string;
  hostname: string;
  resolv:   string;
}

function writeSandboxFiles(sessionId: string): SandboxFiles {
  const hosts    = `/dev/shm/leetnode-hosts-${sessionId}`;
  const hostname = `/dev/shm/leetnode-hostname-${sessionId}`;
  const resolv   = `/dev/shm/leetnode-resolv-${sessionId}`;

  fs.writeFileSync(hosts, '127.0.0.1\tlocalhost\n::1\t\tlocalhost\n', { mode: 0o644 });
  fs.writeFileSync(hostname, 'sandbox\n', { mode: 0o644 });
  fs.writeFileSync(resolv, '# sandbox — no external DNS\nnameserver 127.0.0.1\n', { mode: 0o644 });

  return { hosts, hostname, resolv };
}

function cleanupSandboxFiles(sessionId: string): void {
  for (const suffix of ['hosts', 'hostname', 'resolv']) {
    try { fs.unlinkSync(`/dev/shm/leetnode-${suffix}-${sessionId}`); } catch { /* already gone */ }
  }
}

// ── Container lifecycle ────────────────────────────────────────────────────────

export async function createAndStartContainer(
  problemSlug: string,
  sessionId: string,
  dockerImage: string
): Promise<{ containerId: string; containerName: string }> {
  const containerName = `leetnode-session-${sessionId}`;

  // Write sanitized /etc/hosts, /etc/hostname, /etc/resolv.conf on host tmpfs
  const sandboxFiles = writeSandboxFiles(sessionId);

  const container = await docker.createContainer({
    Image: dockerImage,
    name: containerName,
    // Set kernel hostname so the shell prompt shows "sandbox" instead of
    // the container ID (writing /etc/hostname alone doesn't change this)
    Hostname: 'sandbox',
    Cmd: ['sleep', 'infinity'], // Keep alive; terminal connects via exec
    Tty: false,
    OpenStdin: false,
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    HostConfig: {
      // ── Resource limits (t3.medium: 2 vCPU / 4 GB) ──────────────────────
      // Up to 10 concurrent sessions × 256 MB = 2.56 GB max for containers,
      // leaving ~1.4 GB for OS + backend + frontend + nginx.
      Memory:            256 * 1024 * 1024,  // 256 MB hard cap
      MemorySwap:        256 * 1024 * 1024,  // 0 swap (swap = hard cap)
      MemoryReservation:  64 * 1024 * 1024,  // 64 MB soft reserve
      NanoCpus: 5e8,                         // 0.5 CPU max
      PidsLimit: 64,                         // prevent fork bombs

      // ── Network isolation ────────────────────────────────────────────────
      NetworkMode: 'none',   // no external network; localhost still works

      // ── Linux capability restrictions ────────────────────────────────────
      // Drop the most dangerous capabilities. The container is the jail —
      // users run as root inside (needed to restart services, edit configs),
      // but they cannot escape via kernel exploits or raw hardware access.
      CapDrop: [
        'NET_ADMIN',      // no network interface manipulation
        'NET_RAW',        // no raw sockets (can't craft packets)
        'SYS_ADMIN',      // most dangerous — blocks mount, namespace ops, etc.
        'SYS_MODULE',     // no kernel module loading
        'SYS_RAWIO',      // no direct hardware I/O (ioperm/iopl)
        'SYS_BOOT',       // no reboot/kexec
        'LINUX_IMMUTABLE',// no setting immutable file flags
        'MAC_ADMIN',      // no mandatory access control changes
        'MAC_OVERRIDE',   // no MAC policy override
      ],
      // ── Disk size cap ────────────────────────────────────────────────────
      // StorageOpt size limits the container's writable layer so `df -h /`
      // shows a realistic sandbox size instead of the real EC2 disk (29G).
      // Only works when Docker storage driver supports it (overlay2 + xfs/quota,
      // or devicemapper). Silently ignored if unsupported — safe to include.
      StorageOpt: { size: '10G' },

      // NET_BIND_SERVICE kept (nginx binds port 80 < 1024)
      // SYS_PTRACE kept (strace is a core debugging tool for these problems)

      // ── Other hardening ──────────────────────────────────────────────────
      // no-new-privileges is intentionally OMITTED: problems require the
      // terminal to run as root (to restart nginx, run logrotate, etc.) and
      // no-new-privileges would also break sudo. The capability drops above
      // are the defense-in-depth layer instead.
      ReadonlyRootfs: false,  // problems need to write files
      AutoRemove: false,

      // ── Hide host filesystem from df -h ──────────────────────────────────
      // Bind clean tmpfs-backed files over Docker's default bind mounts so
      // that `df -h` shows "tmpfs" instead of "/dev/root" (EC2 EBS device).
      Binds: [
        `${sandboxFiles.hosts}:/etc/hosts:ro`,
        `${sandboxFiles.hostname}:/etc/hostname:ro`,
        `${sandboxFiles.resolv}:/etc/resolv.conf:ro`,
      ],
    },
    Labels: {
      'com.leetnode.session': sessionId,
      'com.leetnode.problem': problemSlug,
    },
  });

  await container.start();

  return { containerId: container.id, containerName };
}

export async function destroyContainer(containerId: string, sessionId?: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    try {
      await container.stop({ t: 5 });
    } catch {
      // May already be stopped
    }
    await container.remove({ force: true });
    console.log(`[Docker] Destroyed container ${containerId.slice(0, 12)}`);
  } catch (err) {
    console.warn(`[Docker] Failed to destroy container ${containerId.slice(0, 12)}:`, err);
  } finally {
    // Always clean up tmpfs files regardless of container destroy outcome
    if (sessionId) cleanupSandboxFiles(sessionId);
  }
}

export async function execVerify(containerId: string): Promise<VerifyResult> {
  const container = docker.getContainer(containerId);

  const exec = await container.exec({
    Cmd: ['/bin/bash', '/root/verify.sh'],
    AttachStdout: true,
    AttachStderr: false,
    Tty: false,
    User: 'root',
  });

  return new Promise((resolve, reject) => {
    exec.start({ hijack: true, stdin: false }, (err, stream) => {
      if (err) return reject(err);
      if (!stream) return reject(new Error('No stream from exec'));

      let output = '';
      stream.on('data', (chunk: Buffer) => {
        // Dockerode multiplexed stream: first 8 bytes are header
        // [stream_type(1), 0, 0, 0, size(4)] then data
        const data = chunk.slice(8).toString('utf8');
        output += data;
      });

      stream.on('end', () => {
        const lines = output.trim().split('\n').filter(Boolean);
        const lastLine = lines[lines.length - 1];
        try {
          const result = JSON.parse(lastLine);
          resolve(result as VerifyResult);
        } catch {
          resolve({ success: false, message: 'Verification script returned invalid output.' });
        }
      });

      stream.on('error', reject);
    });
  });
}

export async function getDockerInstance(): Promise<Dockerode> {
  return docker;
}
