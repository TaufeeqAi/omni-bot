# Build the application
FROM oven/bun:1.1.18-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM oven/bun:1.1.18-alpine 

# Set the working directory
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules 

EXPOSE 3000

CMD ["bun", "run", "start"]