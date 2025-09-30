
FROM node

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

EXPOSE 3000
CMD ["npm", "run", "start"]
