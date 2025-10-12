# ============================================
# Builder stage
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

# Install ALL dependencies (need devDeps for TypeScript build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Drizzle migrations (drizzle-kit available from npm ci)
RUN npm run db:generate

# Build TypeScript to dist/ using tsconfig.build.json
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM node:24-alpine

WORKDIR /app

# Install postgresql-client for pg_isready
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy football-open folder structure (data will be mounted via volume)
COPY --from=builder /app/football-open ./football-open

# Copy migrations from builder
COPY --from=builder /app/drizzle ./drizzle

# Expose port
EXPOSE 3000

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]

