# Multi-stage Dockerfile for Worker service
# Default final image is production. Use --target development for local dev.

# 1) Base image with dependencies (including dev deps for building)
FROM node AS deps
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci

# 2) Builder stage for production build
FROM node AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Production runtime (omit dev deps)
FROM node AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["npm", "run", "start"]

# 4) Development runtime (nodemon on TS)
FROM node AS development
ENV NODE_ENV=development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install -g ts-node typescript
CMD ["npm", "run", "dev"]
