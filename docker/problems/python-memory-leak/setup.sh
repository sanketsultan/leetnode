#!/bin/bash
set -e

# ── The leaky batch processor ──────────────────────────────────────────────────
cat > /home/user/processor.py << 'PYEOF'
"""
Batch processing service.

This script processes jobs and caches results for fast lookup.
The problem: it's been running 3 days and memory is at 4.8GB and climbing.

Find and fix the memory leak.
"""
import random
import sys

# Global result cache — grows forever (the bug)
_result_cache = {}


def process_job(job_id: str, data: list) -> dict:
    """Process a job and cache the result."""
    result = {
        "job_id": job_id,
        "processed": [x * 2 for x in data],
        "checksum": sum(data),
        "metadata": {"source": "batch", "version": 1},
    }
    # Cache the result for potential re-use
    _result_cache[job_id] = result
    return result


def run_batch(batch_num: int, num_jobs: int = 500) -> None:
    """Run a batch of jobs."""
    for i in range(num_jobs):
        # Each job gets a unique ID (unique keys = cache never hits = only grows)
        job_id = f"batch{batch_num}_job_{i}_{random.randint(0, 999999)}"
        data = [random.randint(1, 100) for _ in range(50)]
        process_job(job_id, data)

    cache_entries = len(_result_cache)
    # Rough size: each entry is ~500 bytes
    cache_mb = (cache_entries * 500) / (1024 * 1024)
    print(f"  After batch {batch_num}: cache={cache_entries} entries (~{cache_mb:.1f}MB)")


if __name__ == "__main__":
    print("Simulating 3 batches (as if running in production)...")
    print("A healthy cache should stay the same size across batches.\n")

    run_batch(1)
    run_batch(2)
    run_batch(3)

    total = len(_result_cache)
    print(f"\nTotal cache entries: {total}")

    if total <= 600:
        print("✓ Cache is bounded — memory leak fixed!")
        sys.exit(0)
    else:
        print(f"✗ Cache has {total} entries and growing — still leaking!")
        print("  Hint: each batch should not permanently add to the cache.")
        sys.exit(1)
PYEOF

# ── README ─────────────────────────────────────────────────────────────────────
cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║           BATCH PROCESSOR LEAKING MEMORY                ║
╚══════════════════════════════════════════════════════════╝

After 3 days in production, this service is using 4.8GB of RAM.
Memory grows without bound every time run_batch() is called.

Run the processor and observe:
  python3 /home/user/processor.py

The script will show cache size after each batch.
A healthy process should reuse or evict old cache entries.

Fix the leak in processor.py, then re-run to confirm:
  python3 /home/user/processor.py

Tips:
  - functools.lru_cache(maxsize=N) is an easy bounded cache
  - Or manually cap: if len(_result_cache) > 500: _result_cache.clear()
EOF

# ── .bashrc banner ────────────────────────────────────────────────────────────
cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "  PROBLEM: Batch Processor Leaking Memory"
echo "  Read README.txt to get started."
echo "  Run: python3 /home/user/processor.py"
echo ""
EOF

chown -R user:user /home/user
