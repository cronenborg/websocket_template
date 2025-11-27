# Use Slim Debian image
FROM node:20-slim

WORKDIR /app

# 1. FIX: Install Git because we are installing dependencies from GitHub
# We also clean up the cache afterwards to keep the image small
RUN apt-get update && \
    apt-get install -y git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# 2. Install dependencies (Now Git is available)
# We use 'npm init -y' to create a dummy package.json so we can install packages
RUN npm init -y && \
    npm install uWebSockets.js@uNetworking/uWebSockets.js#v20.48.0 ioredis

COPY server.js .

EXPOSE 8080

CMD ["node", "server.js"]