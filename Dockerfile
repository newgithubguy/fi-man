FROM node:18-alpine

WORKDIR /app

# Copy application files
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm install

# Create data directory for SQLite database
RUN mkdir -p /data

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
