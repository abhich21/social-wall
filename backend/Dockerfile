FROM node:24.11.0-alpine

WORKDIR /app

RUN npm install -g npm@11.6.4

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend ./backend
COPY frontend ./frontend

RUN mkdir -p /app/uploads

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]
