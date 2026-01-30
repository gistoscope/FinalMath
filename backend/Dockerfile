# Build stage
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable pnpm

WORKDIR /app

# Copy lockfile and package.json
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN pnpm run build

# Runtime stage
FROM node:20-slim AS runtime

# Install pnpm
RUN corepack enable

WORKDIR /app

# Copy built files and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/config ./config
COPY --from=builder /app/data ./data

# Expose the API port
EXPOSE 4201

# Start the application using the start script which handles tsconfig-paths
CMD ["pnpm", "run", "start"]
