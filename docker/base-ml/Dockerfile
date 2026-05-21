FROM leetnode-base:latest

USER root

# PyTorch CPU-only — shared layer for all ML problem images.
# Problems use mock GPU via nvidia-smi/nvcc stubs; real CUDA is not needed.
# CPU wheel is ~500MB; keeping it here means CUDA problem images only add
# a tiny diff layer on top instead of each bundling the full wheel.
RUN pip3 install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu

WORKDIR /home/user
USER user
