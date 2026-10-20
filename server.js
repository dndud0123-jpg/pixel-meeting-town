import http from 'http';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

const HTTP_PORT = process.env.PORT || 3001;

// Function to find local IPv4 network address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal (127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prioritize standard Wi-Fi or Ethernet IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
        candidates.push(iface.address);
      }
    }
  }

  return candidates[0] || 'localhost';
}

const localIp = getLocalIpAddress();

// Tunnel state
let tunnelInfo = {
  url: `http://${localIp}:5173`,
  provider: 'local',
  status: 'pending',
};

// State store
const players = new Map();
// Seed initial welcoming meeting opinions
const opinions = [
  {
    id: 'seed-1',
    playerId: 'system-1',
    playerName: '지우',
    playerColor: '#ef4444',
    avatar: 'red',
    text: '포켓몬 회의실에 오신 것을 환영합니다! 폰으로 QR을 찍고 의견을 남겨보세요!',
    timestamp: Date.now() - 1000 * 60 * 3,
    likes: 4,
  },
  {
    id: 'seed-2',
    playerId: 'system-2',
    playerName: '이슬',
    playerColor: '#06b6d4',
    avatar: 'blue',
    text: '모바일 패드로 캐릭터를 이동하고 B버튼으로 점프도 할 수 있어요 🏃‍♂️✨',
    timestamp: Date.now() - 1000 * 60 * 1,
    likes: 2,
  },
];
const clients = new Map(); // ws -> playerId

// Create HTTP server for health check and local IP discovery
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/ip' || req.url === '/ip') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ip: getLocalIpAddress(),
      wsPort: HTTP_PORT,
      webPort: 5173,
      playerCount: players.size,
    }));
    return;
  }

  if (req.url === '/api/tunnel') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          tunnelInfo = { ...tunnelInfo, ...parsed, updatedAt: Date.now() };
          broadcast({ type: 'tunnel_updated', payload: tunnelInfo });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', tunnelInfo }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid json' }));
        }
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tunnelInfo));
    return;
  }

  if (req.url === '/api/opinions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(opinions));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    name: 'Pokemon Meeting Platform WS Server',
    ip: localIp,
    players: players.size,
    opinions: opinions.length,
  }));
});

// Create WebSocket Server
const wss = new WebSocketServer({ server });

function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// Default town square spawn coordinates (tile grid 0-19)
const SPAWN_POINTS = [
  { x: 9, y: 7 },
  { x: 10, y: 7 },
  { x: 11, y: 7 },
  { x: 9, y: 8 },
  { x: 10, y: 8 },
  { x: 11, y: 8 },
  { x: 8, y: 9 },
  { x: 12, y: 9 },
];

wss.on('connection', (ws) => {
  const tempId = crypto.randomUUID();
  clients.set(ws, tempId);

  // Send initial connected ping
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      socketId: tempId,
      serverIp: getLocalIpAddress(),
      tunnelInfo,
      players: Array.from(players.values()),
      opinions: opinions.slice(-30),
    },
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, payload } = msg;

      switch (type) {
        case 'join': {
          const playerId = payload.id || tempId;
          clients.set(ws, playerId);

          let player = players.get(playerId);
          if (!player) {
            const spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
            player = {
              id: playerId,
              name: payload.name || `트레이너 #${Math.floor(100 + Math.random() * 900)}`,
              color: payload.color || '#3B82F6',
              avatar: payload.avatar || 'red',
              x: typeof payload.x === 'number' ? payload.x : spawn.x,
              y: typeof payload.y === 'number' ? payload.y : spawn.y,
              direction: payload.direction || 'down',
              isMoving: false,
              lastSpokenText: payload.lastSpokenText || null,
              lastSpokenTime: payload.lastSpokenTime || null,
            };
            players.set(playerId, player);
          } else {
            if (payload.name) player.name = payload.name;
            if (payload.color) player.color = payload.color;
            if (typeof payload.x === 'number') player.x = payload.x;
            if (typeof payload.y === 'number') player.y = payload.y;
            if (payload.direction) player.direction = payload.direction;
          }

          // Reply with welcome confirm
          ws.send(JSON.stringify({
            type: 'welcome',
            payload: {
              player,
              allPlayers: Array.from(players.values()),
              opinions: opinions.slice(-30),
            },
          }));

          // Broadcast to everyone else
          broadcast({
            type: 'player_joined',
            payload: player,
          }, ws);
          break;
        }

        case 'move': {
          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) return;

          const player = players.get(playerId);
          player.x = payload.x;
          player.y = payload.y;
          player.direction = payload.direction || player.direction;
          player.isMoving = !!payload.isMoving;

          broadcast({
            type: 'player_moved',
            payload: {
              id: playerId,
              x: player.x,
              y: player.y,
              direction: player.direction,
              isMoving: player.isMoving,
            },
          });
          break;
        }

        case 'speak': {
          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) return;

          const player = players.get(playerId);
          const text = (payload.text || '').trim();
          if (!text) return;

          const opinion = {
            id: crypto.randomUUID(),
            playerId: player.id,
            playerName: player.name,
            playerColor: player.color,
            avatar: player.avatar,
            text,
            timestamp: Date.now(),
            likes: 0,
          };

          opinions.unshift(opinion);
          if (opinions.length > 200) opinions.pop();

          player.lastSpokenText = text;
          player.lastSpokenTime = Date.now();

          // Broadcast to all
          broadcast({
            type: 'player_spoke',
            payload: {
              id: player.id,
              text,
              timestamp: player.lastSpokenTime,
              opinion,
            },
          });
          break;
        }

        case 'action': {
          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) return;

          const player = players.get(playerId);
          player.lastAction = payload.actionType;
          player.lastActionTime = Date.now();

          broadcast({
            type: 'player_action',
            payload: {
              id: player.id,
              actionType: payload.actionType,
              timestamp: player.lastActionTime,
            },
          });
          break;
        }

        case 'like_opinion': {
          const { opinionId } = payload;
          const target = opinions.find(o => o.id === opinionId);
          if (target) {
            target.likes = (target.likes || 0) + 1;
            broadcast({
              type: 'opinion_liked',
              payload: {
                opinionId,
                likes: target.likes,
              },
            });
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const playerId = clients.get(ws);
    if (playerId) {
      clients.delete(ws);
      let hasOther = false;
      for (const [sock, pid] of clients.entries()) {
        if (pid === playerId && sock !== ws && sock.readyState === WebSocket.OPEN) {
          hasOther = true;
          break;
        }
      }
      if (!hasOther) {
        players.delete(playerId);
        broadcast({
          type: 'player_left',
          payload: { id: playerId },
        });
      }
    }
  });
});

server.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log('========================================================');
  console.log(`🎮 [Pokemon Retro Meeting Platform Server Online]`);
  console.log(`📡 Local IPv4:     http://${localIp}:${HTTP_PORT}`);
  console.log(`🔌 WebSocket URL:  ws://${localIp}:${HTTP_PORT}`);
  console.log(`💻 Web App URL:    http://${localIp}:5173`);
  console.log(`📱 Mobile Pad URL: http://${localIp}:5173/?role=pad`);
  console.log('========================================================');
});
