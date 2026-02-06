FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json tsconfig.json ./

# Copy source code
COPY apps ./apps
COPY packages ./packages

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Build the application
# The output will be in apps/final-math-frontend/dist based on vite.config.mts
RUN npx nx build final-math-frontend

# Production Stage
FROM nginx:alpine

# Copy custom Nginx configuration
COPY apps/final-math-frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Remove default static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built artifacts from the builder stage
# Ensure this path matches the output path configured in vite.config.mts
COPY --from=builder /app/apps/final-math-frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
