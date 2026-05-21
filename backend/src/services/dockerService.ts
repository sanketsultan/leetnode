import Dockerode from 'dockerode';
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

export async function createAndStartContainer(
  problemSlug: string,
  sessionId: string,
  dockerImage: string
): Promise<{ containerId: string; containerName: string }> {
  const containerName = `leetnode-session-${sessionId}`;

  const container = await docker.createContainer({
    Image: dockerImage,
    name: containerName,
    Cmd: ['sleep', 'infinity'], // Keep container alive; terminal connects via exec
    Tty: false,
    OpenStdin: false,
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    HostConfig: {
      // t3.medium budget: 4GB RAM / 2 vCPU shared across all services.
      // Each problem container gets 256MB + 0.5 CPU max. With MAX_SESSIONS=10
      // worst case is 2.56GB for containers, leaving ~1.4GB for OS + services.
      Memory: 256 * 1024 * 1024,       // 256MB per container
      MemorySwap: 256 * 1024 * 1024,   // No swap (swap = memory limit)
      MemoryReservation: 64 * 1024 * 1024, // Soft limit: 64MB guaranteed
      NanoCpus: 5e8,                   // 0.5 CPU max
      PidsLimit: 64,                   // Prevent fork bombs
      NetworkMode: 'none',             // No network access from sandbox
      SecurityOpt: ['no-new-privileges'],
      ReadonlyRootfs: false,           // Problems need to write files
      AutoRemove: false,
    },
    Labels: {
      'com.leetnode.session': sessionId,
      'com.leetnode.problem': problemSlug,
    },
  });

  await container.start();

  return { containerId: container.id, containerName };
}

export async function destroyContainer(containerId: string): Promise<void> {
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
