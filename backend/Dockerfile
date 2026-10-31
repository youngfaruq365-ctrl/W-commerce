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

# Generate Prisma client from the PostgreSQL (production) schema
RUN npx prisma generate --schema=database/prisma/postgres/schema.prisma

# Set the Node environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Expose backend port
EXPOSE 5000

# Apply pending DB migrations, then start the Node.js backend
WORKDIR /app
CMD ["sh", "-c", "npx prisma migrate deploy --schema=database/prisma/postgres/schema.prisma && node backend/server.cjs"]

