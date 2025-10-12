FROM node:24-alpine

WORKDIR /app

# Install postgresql-client for pg_isready (needed by entrypoint)
RUN apk add --no-cache postgresql-client

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]

