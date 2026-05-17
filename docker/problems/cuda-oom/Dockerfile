FROM leetnode-base:latest

USER root

# Install PyTorch (ARM64-compatible version from PyPI)
RUN pip3 install --no-cache-dir torch==2.5.1

# Copy and run setup script to create the broken environment
COPY setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh && bash /tmp/setup.sh && rm /tmp/setup.sh

# Copy verify script
COPY verify.sh /root/verify.sh
RUN chmod +x /root/verify.sh

LABEL com.leetnode.problem="cuda-oom"
LABEL com.leetnode.title="GPU Memory Leak in Training Loop"

WORKDIR /home/user
USER user

CMD ["/bin/bash"]
