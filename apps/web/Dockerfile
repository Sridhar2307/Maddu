FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies across monorepo
RUN npm ci

# Copy shared package and web frontend source
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package and web bundle
RUN npm run --workspace=@dakshin/shared build
RUN npm run --workspace=@dakshin/web build

# Production Nginx stage
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
