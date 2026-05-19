#!/bin/bash
# Sets up the broken tensor device mismatch environment

cat > /home/user/infer.py << 'PYEOF'
"""
PyTorch Inference Script - Image Feature Extractor
Loads a model and runs inference on a batch of images.
Crashes on the GPU server. Figure out why and fix it.
"""

import torch
import torch.nn as nn


class FeatureExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = nn.Sequential(
            nn.Linear(2048, 1024),
            nn.ReLU(),
            nn.Linear(1024, 512),
            nn.ReLU(),
            nn.Linear(512, 128),
        )

    def forward(self, x):
        return self.backbone(x)


def run_inference():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    model = FeatureExtractor().to(device)
    model.eval()

    print("Loading image batch...")

    # Simulates what a DataLoader returns — tensors are always on CPU by default.
    # On the GPU server this crashes with:
    #   RuntimeError: Expected all tensors to be on the same device,
    #   but found at least two devices, cuda:0 and cpu!
    images = torch.randn(16, 2048)   # BUG: not moved to device

    print("Extracting features...")
    with torch.no_grad():
        features = model(images)

    print(f"Feature shape: {features.shape}")
    print(f"Sample values: {features[0, :4].tolist()}")
    print("Inference complete.")


if __name__ == "__main__":
    run_inference()
PYEOF

cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║       LEETNODE - TENSOR DEVICE MISMATCH CHALLENGE            ║
╚══════════════════════════════════════════════════════════════╝

PROBLEM: Tensor Not Moved to GPU
DIFFICULTY: Easy
CATEGORY: CUDA / GPU

SCENARIO:
---------
Your feature extraction script runs fine locally (CPU only),
but crashes the moment you deploy it to the GPU server:

  RuntimeError: Expected all tensors to be on the same device,
  but found at least two devices, cuda:0 and cpu!

The model loads. The data loads. Something is on the wrong device.

YOUR TASK:
----------
1. Read infer.py
2. Find the tensor that is not on the correct device
3. Fix it so the script runs without errors

USEFUL COMMANDS:
  python3 infer.py      # run the script
  cat infer.py          # view the code
  nano infer.py         # edit the code
  nvidia-smi            # check GPU

When you think you've fixed it, click "Check Solution" in the UI.
EOF

cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  LeetNode Challenge: Tensor Device Mismatch  │"
echo "│  Type 'cat README.txt' to get started        │"
echo "└─────────────────────────────────────────────┘"
echo ""
EOF

chown -R user:user /home/user/
