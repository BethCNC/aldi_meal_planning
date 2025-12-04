# Multi-stage build for Aldi Meal Planner
# Stage 1: Build the React frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install all dependencies (needed for build)
RUN npm install

# Copy configuration files needed for build
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tokens.json ./

# Copy source code
COPY src ./src
COPY public ./public
COPY index.html ./

# Build the frontend
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production && \
    npm cache clean --force

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "server/index.js"]

