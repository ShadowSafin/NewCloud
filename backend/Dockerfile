FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl ffmpeg poppler-utils

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

RUN mkdir -p /app/data/storage

EXPOSE 4000

CMD ["npm", "start"]
