FROM leetnode-base:latest

LABEL com.leetnode.problem="disk-full"
LABEL com.leetnode.title="Server Won't Start: Disk Full"

USER root

COPY setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh && bash /tmp/setup.sh && rm /tmp/setup.sh

COPY verify.sh /root/verify.sh
RUN chmod +x /root/verify.sh

WORKDIR /home/user
USER user
CMD ["sleep", "infinity"]
