#!/bin/bash
# Sets up the broken CUDA OOM environment

# Create the broken training script
cat > /home/user/train.py << 'PYEOF'
"""
PyTorch Training Script - Image Classifier
This script trains a simple model on synthetic data.
It keeps crashing after a few epochs. Figure out why and fix it.
"""

import torch
import torch.nn as nn

# Simple model
class SimpleModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(512, 1024),
            nn.ReLU(),
            nn.Linear(1024, 512),
            nn.ReLU(),
            nn.Linear(512, 10)
        )

    def forward(self, x):
        return self.layers(x)

def train():
    device = torch.device('cpu')
    model = SimpleModel().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()

    print("Starting training...")
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    # BUG: This list accumulates all intermediate tensors and is never cleared.
    # It grows unboundedly across epochs, causing memory exhaustion.
    all_losses = []

    for epoch in range(5):
        epoch_loss = 0
        print(f"\nEpoch {epoch + 1}/5")

        for batch_idx in range(20):
            inputs = torch.randn(64, 512).to(device)
            targets = torch.randint(0, 10, (64,)).to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            # BUG: Appending the raw tensor keeps the entire computation graph
            # alive in memory. Should be: all_losses.append(loss.item())
            all_losses.append(loss)

            epoch_loss += loss.item()

        avg_loss = epoch_loss / 20
        print(f"  Average loss: {avg_loss:.4f}")
        print(f"  Tensors accumulated: {len(all_losses)} (~{len(all_losses) * 2}MB retained)")

        # Simulate OOM: tensors with a grad_fn keep the full computation graph alive.
        # Detached tensors (.detach()) or scalars (.item()) are safe.
        tensor_count = sum(1 for x in all_losses if isinstance(x, torch.Tensor) and x.grad_fn is not None)
        if tensor_count > 50:
            raise RuntimeError(
                "CUDA out of memory. Tried to allocate 2.00 GiB "
                "(GPU 0; 15.00 GiB total capacity; 13.50 GiB already allocated; "
                "512.00 MiB free; 14.20 GiB reserved in total by PyTorch). "
                "If reserved but unallocated memory is large, try setting "
                "max_split_size_mb to avoid fragmentation."
            )

    print("\nTraining complete! All 5 epochs finished successfully.")

if __name__ == "__main__":
    train()
PYEOF

# Create README
cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║           LEETNODE - GPU MEMORY LEAK CHALLENGE               ║
╚══════════════════════════════════════════════════════════════╝

PROBLEM: GPU Memory Leak in Training Loop
DIFFICULTY: Medium
CATEGORY: CUDA / GPU

SCENARIO:
---------
Your PyTorch training job was running fine last week.
Now it crashes every time after a few epochs with:

  RuntimeError: CUDA out of memory

The model hasn't changed. The dataset hasn't changed.
Something in the training loop is leaking GPU memory.

YOUR TASK:
----------
1. Look at train.py
2. Find the memory leak
3. Fix it so training completes all 5 epochs

HINT: Run the script to see the error:
  python3 train.py

When you think you've fixed it, click "Check Solution" in the UI.

Good luck!
EOF

# Set up .bashrc banner
cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  LeetNode Challenge: GPU Memory Leak         │"
echo "│  Type 'cat README.txt' to get started       │"
echo "└─────────────────────────────────────────────┘"
echo ""
EOF

chown -R user:user /home/user/
