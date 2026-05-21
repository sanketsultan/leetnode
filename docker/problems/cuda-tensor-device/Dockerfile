FROM leetnode-base-ml:latest

USER root

# PyTorch is pre-installed in leetnode-base — no need to reinstall here

# Copy and run setup script to create the broken environment
COPY setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh && bash /tmp/setup.sh && rm /tmp/setup.sh

# Copy verify script
COPY verify.sh /root/verify.sh
RUN chmod +x /root/verify.sh

LABEL com.leetnode.problem="cuda-tensor-device"
LABEL com.leetnode.title="Tensor Not Moved to GPU"

WORKDIR /home/user
USER user

CMD ["sleep", "infinity"]
