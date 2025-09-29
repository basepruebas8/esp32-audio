// /opt/audio-relay/server.js
import http from 'http';
import { WebSocketServer } from 'ws';

const server = http.createServer();              // HTTP lo sirve Nginx; aquí solo WS
const wss = new WebSocketServer({ server });     // Proxy por /ws desde Nginx

const rooms = new Map(); // room -> { source: ws|null, listeners: Set<ws> }
function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, { source: null, listeners: new Set() });
  return rooms.get(id);
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const room = url.searchParams.get('room') || 'default';
  const role = url.searchParams.get('role') || 'listener';
  const token = url.searchParams.get('token') || '';
  if (process.env.TOKEN && token !== process.env.TOKEN) {
    ws.close(1008, 'bad token'); return;
  }
  const R = getRoom(room);

  if (role === 'source') {
    if (R.source && R.source.readyState === 1) R.source.close(1012, 'new source');
    R.source = ws;
  } else {
    R.listeners.add(ws);
  }

  ws.on('message', (data, isBinary) => {
    if (role !== 'source' || !isBinary) return; // solo reenviamos binario del emisor
    for (const cli of R.listeners) if (cli.readyState === 1) cli.send(data, { binary: true });
  });

  ws.on('close', () => {
    if (role === 'source') R.source = null; else R.listeners.delete(ws);
  });

  // keepalive
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
});

setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.isAlive) ws.terminate(); ws.isAlive = false; ws.ping(); });
}, 30000);

server.listen(8080, '127.0.0.1', () => console.log('WS relay on 127.0.0.1:8080'));
