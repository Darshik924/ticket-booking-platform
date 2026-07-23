# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install system dependencies (openssl is required by Prisma)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Generate Prisma Client (builds target-specific engine for Alpine)
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

# Install system dependencies (openssl is required by Prisma)
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled JavaScript files
COPY --from=builder /app/dist ./dist

# Copy prisma schema & migrations folder (needed for migrations and seeding)
COPY --from=builder /app/prisma ./prisma

# Copy node_modules with generated Prisma client
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5000

# Run migrations and seed automatically before starting the server
CMD npx prisma migrate deploy && node dist/prisma/seed.js && node dist/server.js
