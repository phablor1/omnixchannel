FROM node:18-alpine

# Instala curl e outras ferramentas úteis
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
#RUN npm ci --omit=dev
RUN npm install --production

COPY server.js ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
