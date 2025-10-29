# Use Node.js 22.17.0
FROM node:22.17.0-alpine

# Set working directory
WORKDIR /opt/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Set environment variables for Docker
ENV NODE_ENV=production
ENV BASE_DIR=/tmp
ENV PORT=3000

# Create necessary directories in /tmp
RUN mkdir -p /tmp/uploads /tmp/output

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the application
CMD ["node", "src/server.js"]
