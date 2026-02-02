FROM node:18-alpine
WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./
RUN npm install

# Copy the entire project (including the src folder)
COPY . .

EXPOSE 8081
CMD ["npm", "start"]