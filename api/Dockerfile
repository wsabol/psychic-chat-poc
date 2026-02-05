# Dockerfile for Psychic Chat API (SSE Endpoint)
FROM node:20-alpine

# Install curl for health checks (optional but recommended)
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check - use curl if available, fallback to node
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Start application
CMD ["node", "index.js"]
