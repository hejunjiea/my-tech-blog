FROM node:20-alpine

WORKDIR /app
COPY app/ /app/

ENV NODE_ENV=production \
    PORT=8000 \
    HOST=0.0.0.0 \
    DATA_DIR=/data

RUN mkdir -p /data
EXPOSE 8000

CMD ["node", "server.js"]
