FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    wget \
    python3 \
    python3-pip \
    procps \
    strace \
    lsof \
    htop \
    vim \
    nano \
    sudo \
    less \
    tree \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with restricted sudo (only specific commands per-problem)
RUN useradd -m -s /bin/bash user

# Mock nvidia-smi and nvcc — copy from build context (avoids heredoc issues)
COPY nvidia-smi /usr/local/bin/nvidia-smi
COPY nvcc /usr/local/bin/nvcc
RUN chmod +x /usr/local/bin/nvidia-smi /usr/local/bin/nvcc

# NOTE: PyTorch is NOT installed here.
# ML problems (cuda-*) use leetnode-base-ml which adds torch on top.
# This keeps non-ML problem images ~500MB smaller.

WORKDIR /home/user
USER user
