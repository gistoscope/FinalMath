FROM node:20-slim

WORKDIR /app

# Copy package.json (if it exists)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies if any (viewer doesn't have many)
RUN corepack enable && pnpm install --frozen-lockfile || true

# Copy all files
COPY . .

# Expose the viewer port
EXPOSE 4001

# Start the tiny server
CMD ["node", "server.js", "--port", "4001", "--root", "."]
