# Multi-stage Dockerfile for Client app
# Default final image is production (nginx serving static build)

# 1) Base deps for building
FROM node AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2) Build stage
FROM node AS builder
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Production stage: serve with nginx
FROM nginx:alpine AS production
# Copy build output to Nginx html dir
COPY --from=builder /app/build /usr/share/nginx/html
# Default nginx listens on 80
EXPOSE 80
# Nginx default CMD is fine
