FROM leetnode-base:latest
LABEL com.leetnode.problem="ssl-cert-expired"
LABEL com.leetnode.title="HTTPS Broken: Certificate Expired"
USER root
COPY setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh && bash /tmp/setup.sh && rm /tmp/setup.sh
COPY verify.sh /root/verify.sh
RUN chmod +x /root/verify.sh
WORKDIR /home/user
USER user
CMD ["sleep", "infinity"]
