import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';

const port = Number(process.env.WORKER_HEALTH_PORT ?? 8081);
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 1);

if (concurrency !== 1) {
  console.error('WORKER_CONCURRENCY must be exactly 1.');
  process.exit(1);
}

const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (ffmpeg.status !== 0) {
  console.error('ffmpeg is required in the worker runtime image.');
  process.exit(1);
}

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'worker', concurrency, ffmpeg: true }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Worker health server listening on ${port}`);
});
