# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

RUN addgroup -S vhv && adduser -S -G vhv -u 10001 vhv

USER vhv
EXPOSE 3000

CMD ["node", "-e", "const http=require('http');const port=process.env.PORT||3000;http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'ok',service:'web'}));return;}res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});res.end('VHV Stream Monitor foundation health server');}).listen(port,'0.0.0.0');"]
