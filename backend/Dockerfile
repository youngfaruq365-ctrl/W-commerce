FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy backend package.json
COPY backend/package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend source code
COPY backend/ ./backend/
COPY database/ ./database/

# Generate Prisma client
RUN npx prisma generate --schema=database/prisma/schema.prisma

# Set the Node environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Expose backend port
EXPOSE 5000

# Start the Node.js backend
WORKDIR /app
CMD ["node", "backend/server.cjs"]

