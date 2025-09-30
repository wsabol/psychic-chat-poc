
FROM node

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

CMD ["npm", "run", "start"]
