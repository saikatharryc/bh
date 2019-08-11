FROM node:10

WORKDIR /bh
COPY package*.json ./
RUN yarn
COPY . .
EXPOSE 3000
CMD [ "yarn", "start" ]