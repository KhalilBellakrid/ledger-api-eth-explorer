FROM node:13.0.1-alpine
ADD . /app
WORKDIR /app
RUN yarn
CMD [ "yarn", "start" ]
