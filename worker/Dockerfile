

FROM node:20-alpine

# Set environment variables
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV REDIS_URL=${REDIS_URL}
ENV DATABASE_URL=${DATABASE_URL}
ENV ASTROLOGY_LAMBDA_URL=${ASTROLOGY_LAMBDA_URL}

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

CMD ["npm", "run", "start"]

