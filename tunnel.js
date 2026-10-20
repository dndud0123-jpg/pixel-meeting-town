import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tunnelJsonPath = path.join(__dirname, 'public', 'tunnel.json');

// Get local IPv4 address as ultimate fallback
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

// Write tunnel info to public/tunnel.json so Vite client can fetch it
function writeTunnelInfo(info) {
  try {
    const dir = path.dirname(tunnelJsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tunnelJsonPath, JSON.stringify(info, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write tunnel.json:', err.message);
  }

  // Also notify server.js on port 3001 if alive
  const payload = JSON.stringify(info);
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 3001,
      path: '/api/tunnel',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    () => {}
  );
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

async function start() {
  console.log('========================================================');
  console.log('🚀 [Cloudflare Quick Tunnel Starting via untun]');
  console.log('Target Port: 5173 (Vite + WebSocket Proxy)');
  console.log('========================================================');

  // Initial placeholder state
  writeTunnelInfo({
    url: `http://${localIp}:5173`,
    provider: 'local',
    status: 'connecting',
    updatedAt: Date.now(),
  });

  try {
    const { startTunnel } = await import('untun');
    const tunnel = await startTunnel({
      port: 5173,
    });

    const publicUrl = await tunnel.getURL();

    console.log('========================================================');
    console.log('🎉 [Cloudflare Quick Tunnel Online!]');
    console.log(`🌐 Public HTTPS URL: ${publicUrl}`);
    console.log(`📱 Mobile Pad URL:   ${publicUrl}/?role=pad`);
    console.log('========================================================');

    writeTunnelInfo({
      url: publicUrl,
      provider: 'cloudflare',
      status: 'connected',
      updatedAt: Date.now(),
    });

    // Handle termination
    const cleanup = async () => {
      console.log('\n🛑 Closing Cloudflare Tunnel...');
      try {
        await tunnel.close();
      } catch {}
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.warn('\n⚠️ Cloudflare Quick Tunnel connection note:');
    console.warn(err.message);
    console.log('👉 사내 방화벽 우회 차단 정책이 활성화되어 있는 경우, 로컬 IP 또는 수동 터널로 자동 전환됩니다.');
    console.log(`💻 Local Fallback URL: http://${localIp}:5173`);
    console.log(`📱 Mobile Fallback:    http://${localIp}:5173/?role=pad\n`);

    writeTunnelInfo({
      url: `http://${localIp}:5173`,
      provider: 'local',
      status: 'fallback',
      notice: '사내 보안 방화벽으로 인해 로컬 IP 주소로 대체되었습니다.',
      updatedAt: Date.now(),
    });

    // Keep process alive so concurrently doesn't exit
    setInterval(() => {}, 10000);
  }
}

process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ Tunnel service note:', (reason && reason.message) ? reason.message : reason);
});

start().catch((err) => {
  console.warn('\n⚠️ Cloudflare Tunnel fallback engaged:', err.message);
  writeTunnelInfo({
    url: `http://${localIp}:5173`,
    provider: 'local',
    status: 'fallback',
    notice: '사내 보안 방화벽으로 인해 로컬 IP 주소로 대체되었습니다.',
    updatedAt: Date.now(),
  });
  setInterval(() => {}, 10000);
});
