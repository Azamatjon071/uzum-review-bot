# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html/app

# SPA fallback — all /app/* routes return /app/index.html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  add_header X-Frame-Options SAMEORIGIN;\n\
  add_header X-Content-Type-Options nosniff;\n\
  # Never cache the SPA entry point\n\
  location = /app/index.html {\n\
    add_header Cache-Control "no-cache, no-store, must-revalidate";\n\
    add_header Pragma "no-cache";\n\
    add_header Expires "0";\n\
    try_files $uri =404;\n\
  }\n\
  # Hashed assets: cache forever\n\
  location ~* \\.(?:js|css|woff2?|png|jpg|jpeg|gif|ico|svg)$ {\n\
    expires 1y;\n\
    add_header Cache-Control "public, immutable";\n\
  }\n\
  location /app/ {\n\
    try_files $uri $uri/ /app/index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
