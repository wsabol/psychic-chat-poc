FROM node

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
