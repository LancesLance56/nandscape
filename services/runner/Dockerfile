# The sandboxed execution service. See server.mjs for the trust boundary.
#
# node:22-alpine is multi-arch, so this image builds natively on both an amd64
# dev machine and an arm64 server - which is the whole reason this service
# exists in place of Piston, whose image is amd64-only.
FROM node:22-alpine

# The Docker CLI only; this talks to the host daemon over the mounted socket
# and never runs a daemon of its own.
RUN apk add --no-cache docker-cli

WORKDIR /app
COPY server.mjs ./

# No dependencies by design: this process holds the most dangerous privilege in
# the stack, so its supply chain is the Node standard library and nothing else.

EXPOSE 2000
CMD ["node", "server.mjs"]
