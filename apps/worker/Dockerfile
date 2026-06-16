# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    WORKER_HEALTH_PORT=8081 \
    WORKER_CONCURRENCY=1

WORKDIR /app

RUN apk add --no-cache ffmpeg \
    && addgroup -S vhv \
    && adduser -S -G vhv -u 10001 vhv

USER vhv
EXPOSE 8081

CMD ["node", "-e", "const http=require('http');const port=process.env.WORKER_HEALTH_PORT||8081;if(process.env.WORKER_CONCURRENCY!=='1'){console.error('WORKER_CONCURRENCY must be 1');process.exit(1);}http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'ok',service:'worker',concurrency:1}));return;}res.writeHead(404);res.end();}).listen(port,'0.0.0.0');setInterval(()=>{},60000);"]
