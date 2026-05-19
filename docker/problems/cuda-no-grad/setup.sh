#!/bin/bash
# Sets up the broken no_grad / memory leak during inference environment

cat > /home/user/embed.py << 'PYEOF'
"""
PyTorch Embedding Generator
Runs inference on a large dataset to produce feature embeddings.
The job keeps crashing with OOM after processing ~200 batches.
"""

import torch
import torch.nn as nn


class EmbeddingModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(1024, 512),
            nn.ReLU(),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, 64),
        )

    def forward(self, x):
        return self.encoder(x)


def generate_embeddings():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    model = EmbeddingModel().to(device)
    model.eval()

    print("Generating embeddings for 500 batches...")
    all_embeddings = []

    for i in range(500):
        batch = torch.randn(32, 1024).to(device)

        # BUG: no torch.no_grad() — PyTorch builds and retains a computation
        # graph for every forward pass. Memory grows with each batch until OOM.
        embeddings = model(batch)

        all_embeddings.append(embeddings)

        # Simulate OOM: count retained computation graphs.
        # Without torch.no_grad(), every tensor in the list keeps its grad_fn,
        # meaning the full computation graph stays allocated in memory.
        graphs_alive = sum(
            1 for e in all_embeddings
            if isinstance(e, torch.Tensor) and e.grad_fn is not None
        )
        if graphs_alive > 50:
            raise RuntimeError(
                "CUDA out of memory. Tried to allocate 512.00 MiB "
                "(GPU 0; 15.00 GiB total capacity; 14.50 GiB already allocated; "
                "256.00 MiB free; 14.80 GiB reserved in total by PyTorch). "
                "Try using torch.no_grad() during inference."
            )

        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/500 batches")

    print(f"Done. Generated {len(all_embeddings) * 32} embeddings.")


if __name__ == "__main__":
    generate_embeddings()
PYEOF

cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║      LEETNODE - MISSING NO_GRAD CHALLENGE                    ║
╚══════════════════════════════════════════════════════════════╝

PROBLEM: Missing no_grad During Inference
DIFFICULTY: Easy
CATEGORY: CUDA / GPU

SCENARIO:
---------
Your embedding generation job crashes after ~200 batches:

  RuntimeError: CUDA out of memory.
  Try using torch.no_grad() during inference.

The model fits in VRAM fine. But memory keeps climbing with
every batch, even though you're not training anything.

YOUR TASK:
----------
1. Read embed.py
2. Understand why memory grows during inference
3. Add the one-line fix that stops computation graphs being built

USEFUL COMMANDS:
  python3 embed.py      # run the script (will crash without fix)
  cat embed.py          # view the code
  nano embed.py         # edit the code
  nvidia-smi            # check GPU memory

When you think you've fixed it, click "Check Solution" in the UI.
EOF

cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  LeetNode Challenge: Missing no_grad          │"
echo "│  Type 'cat README.txt' to get started        │"
echo "└─────────────────────────────────────────────┘"
echo ""
EOF

chown -R user:user /home/user/
