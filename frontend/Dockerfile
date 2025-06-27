FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Development stage image
FROM base AS development
# Copy package files
COPY package.json package-lock.json* ./
# Install all dependencies including dev dependencies
RUN npm install
# Copy other source files
COPY . .
# Development server command
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
# Copy package files
COPY package.json package-lock.json* ./
# Install all dependencies
RUN npm install
# Copy source code
COPY . .
# Build application
RUN npm run build

# Production stage
FROM base AS production
# Set environment variables
ENV NODE_ENV=production
# Copy build artifacts and necessary files
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/next-i18next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Reduce privileges
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app/.next

USER nextjs

# Application port
EXPOSE 3000

# Start application
CMD ["npm", "start"] 