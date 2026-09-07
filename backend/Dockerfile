FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package.json and lockfile
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Generate Prisma client
RUN npm run db:generate

# Set the Node environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Expose backend port
EXPOSE 5000

# Start the Node.js backend
CMD ["npm", "run", "start:production"]
