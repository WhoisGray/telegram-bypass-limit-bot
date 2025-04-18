# Dockerfile for Telegram Large File Bot
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Create data directory for session storage
RUN mkdir -p /app/data

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Create a volume for persisting session data
VOLUME ["/app/data"]

# Command to run the application
CMD ["node", "index.js"]
