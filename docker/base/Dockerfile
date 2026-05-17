FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
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

# Create non-root user
RUN useradd -m -s /bin/bash user && \
    echo "user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Mock nvidia-smi and nvcc — copy from build context (avoids heredoc issues)
COPY nvidia-smi /usr/local/bin/nvidia-smi
COPY nvcc /usr/local/bin/nvcc
RUN chmod +x /usr/local/bin/nvidia-smi /usr/local/bin/nvcc

WORKDIR /home/user
USER user
