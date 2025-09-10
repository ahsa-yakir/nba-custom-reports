# Multi-stage build for React app with Tailwind CSS
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy configuration files for Tailwind CSS
COPY postcss.config.js ./
COPY tailwind.config.js ./

# Copy source
COPY . .

# Build for production with environment variables
# REACT_APP_API_URL will be set during build time
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=build /app/build /usr/share/nginx/html

# Add health check endpoint
RUN echo '#!/bin/sh\necho "healthy"' > /usr/share/nginx/html/health && \
    chmod +x /usr/share/nginx/html/health

# Create a script to handle runtime environment variable injection
COPY <<EOF /docker-entrypoint.d/30-inject-runtime-env.sh
#!/bin/sh
set -e

# Create runtime config file that can be loaded by the frontend
cat > /usr/share/nginx/html/runtime-config.js << EOL
window.runtimeConfig = {
  API_URL: '\${API_URL:-}'
};
EOL

echo "Runtime configuration injected"
EOF

RUN chmod +x /docker-entrypoint.d/30-inject-runtime-env.sh

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]