FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl ffmpeg poppler-utils

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

RUN mkdir -p /app/data/storage

EXPOSE 4000

CMD ["npm", "run", "dev"]
