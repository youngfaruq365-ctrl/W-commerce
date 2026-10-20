# Stage 1: Build React App
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package.json and lockfile
COPY package.json package-lock.json ./

# Copy the frontend package.json to ensure workspace/dependency resolutions if necessary
COPY frontend/package.json ./frontend/

# Install dependencies (since the monorepo setup uses root for everything)
RUN npm ci

# Copy the rest of the source code
COPY . .


# Build the frontend application
RUN npm run build:production

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Create an inline nginx configuration to handle React Router and reverse proxy to the backend
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Serve static files and fallback to index.html for React Router \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Proxy API requests to backend \
    location /api/ { \
        proxy_pass http://backend:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
    \
    # Proxy Socket.io requests to backend \
    location /socket.io/ { \
        proxy_pass http://backend:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
