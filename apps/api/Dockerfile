# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

RUN addgroup -S vhv && adduser -S -G vhv -u 10001 vhv

USER vhv
EXPOSE 8080

CMD ["node", "-e", "const http=require('http');const port=process.env.PORT||8080;http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'ok',service:'api'}));return;}res.writeHead(404);res.end();}).listen(port,'0.0.0.0');"]
