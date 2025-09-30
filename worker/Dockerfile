
FROM node
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV REDIS_URL=${REDIS_URL}
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

CMD ["npm", "run", "start"]
