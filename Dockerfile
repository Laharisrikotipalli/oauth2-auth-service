FROM node:20-alpine

WORKDIR /usr/src/app

# Install build tools required for bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
