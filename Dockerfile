# Use Node.js 22 Alpine
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY . .

# Build Next.js application (needed for app service)
RUN pnpm build

# Expose ports
EXPOSE 3000 3001

# Default command (will be overridden in docker-compose.yml)
CMD ["pnpm", "start"]
