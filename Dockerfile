# Stage 1: Build the Remix app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of your application code
COPY . .

# Build the Remix app for production
RUN npm run build

# Stage 2: Run the production app
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Install PostgreSQL client tools so that pg_isready is available
RUN apk add --no-cache postgresql-client

# Set the PGPASSWORD environment variable for authentication
ENV PGPASSWORD=supersecret

# Copy built files and public assets from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

# Copy package.json and package-lock.json into runner stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Expose the production port
EXPOSE 3000

# Copy wait-for-postgres.sh into the image and ensure it's executable
COPY wait-for-postgres.sh /app/wait-for-postgres.sh
RUN chmod +x /app/wait-for-postgres.sh

# Start the production server after waiting for Postgres to be ready
CMD ["./wait-for-postgres.sh", "db", "mydbuser", "halfagiraf_db", "npm", "run", "start"]
