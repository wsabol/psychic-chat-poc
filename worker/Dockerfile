

FROM node
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV REDIS_URL=${REDIS_URL}
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install Python dependencies in a virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --upgrade pip setuptools && \
    pip3 install pyswisseph geopy timezonefinder

# Copy source code
COPY . .

CMD ["npm", "run", "start"]

