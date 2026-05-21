FROM leetnode-base:latest

LABEL com.leetnode.problem="postgres-connections"
LABEL com.leetnode.title="Postgres: Too Many Clients Already"

USER root

COPY setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh && bash /tmp/setup.sh && rm /tmp/setup.sh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY verify.sh /root/verify.sh
RUN chmod +x /root/verify.sh

WORKDIR /home/user
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sleep", "infinity"]
