import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, MessageSquare, QrCode, Volume2, VolumeX, Maximize2, Minimize2, 
  Sparkles, Heart, ExternalLink, Copy, Check, RefreshCw, Radio 
} from 'lucide-react';
import type { Player, Opinion, WSServerEvent, WSClientAction } from '../../types';
import { renderMap, drawPlayer, MAP_COLS, MAP_ROWS, TILE_SIZE } from '../../game/tileRenderer';
import { sound } from '../../utils/audio';

interface HostDisplayProps {
  wsUrl?: string;
}

export const HostDisplay: React.FC<HostDisplayProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [serverIp, setServerIp] = useState<string>('');
  const [customIp, setCustomIp] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'latest' | 'likes'>('latest');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [meetingTopic, setMeetingTopic] = useState<string>('오늘의 안건: 16비트 포켓몬풍 회의실 익명 소통 피드백');

  const wsRef = useRef<WebSocket | null>(null);
  const playersRef = useRef<Map<string, Player>>(new Map());
  // Store smoothed positions for continuous smooth interpolation
  const playerPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Determine host address for QR
  useEffect(() => {
    const defaultHost = window.location.hostname;
    // If running on localhost or 127.0.0.1, try fetching local LAN IP from server
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data.ip) {
          setServerIp(data.ip);
          setCustomIp(data.ip);
        } else {
          setServerIp(defaultHost);
          setCustomIp(defaultHost);
        }
      })
      .catch(() => {
        setServerIp(defaultHost);
        setCustomIp(defaultHost);
      });
  }, []);

  // Sync ref with state
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // WebSocket Connection
  useEffect(() => {
    const wsHost = window.location.hostname || 'localhost';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // By default connect to backend port 3001
    const targetWsUrl = `${wsProtocol}//${wsHost}:3001`;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connectWs = () => {
      try {
        const socket = new WebSocket(targetWsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data: WSServerEvent = JSON.parse(event.data);
            handleServerEvent(data);
          } catch (err) {
            console.error('Failed to parse WS message:', err);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 2000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch {
        reconnectTimer = setTimeout(connectWs, 2000);
      }
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleServerEvent = (event: WSServerEvent) => {
    switch (event.type) {
      case 'init': {
        const map = new Map<string, Player>();
        event.payload.players.forEach((p: Player) => {
          map.set(p.id, p);
          playerPositionsRef.current.set(p.id, { x: p.x, y: p.y });
        });
        setPlayers(map);
        setOpinions(event.payload.opinions || []);
        if (event.payload.serverIp && (!customIp || customIp === 'localhost')) {
          setServerIp(event.payload.serverIp);
          setCustomIp(event.payload.serverIp);
        }
        break;
      }

      case 'player_joined': {
        sound.playStep();
        const p = event.payload;
        setPlayers((prev) => {
          const next = new Map(prev);
          next.set(p.id, p);
          return next;
        });
        playerPositionsRef.current.set(p.id, { x: p.x, y: p.y });
        break;
      }

      case 'player_left': {
        const { id } = event.payload;
        setPlayers((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        playerPositionsRef.current.delete(id);
        break;
      }

      case 'player_moved': {
        const { id, x, y, direction, isMoving } = event.payload;
        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(id);
          if (existing) {
            next.set(id, { ...existing, targetX: x, targetY: y, direction, isMoving });
          }
          return next;
        });
        break;
      }

      case 'player_spoke': {
        sound.playSpeak();
        const { id, text, timestamp, opinion } = event.payload;
        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(id);
          if (existing) {
            next.set(id, {
              ...existing,
              lastSpokenText: text,
              lastSpokenTime: timestamp,
            });
          }
          return next;
        });
        setOpinions((prev) => [opinion, ...prev.filter((o) => o.id !== opinion.id)]);
        break;
      }

      case 'player_action': {
        const { id, actionType, timestamp } = event.payload;
        if (actionType === 'jump') sound.playJump();
        else if (actionType === 'heart') sound.playLike();

        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(id);
          if (existing) {
            next.set(id, {
              ...existing,
              lastAction: actionType,
              lastActionTime: timestamp,
            });
          }
          return next;
        });
        break;
      }

      case 'opinion_liked': {
        sound.playLike();
        const { opinionId, likes } = event.payload;
        setOpinions((prev) =>
          prev.map((op) => (op.id === opinionId ? { ...op, likes } : op))
        );
        break;
      }
    }
  };

  const sendAction = (action: WSClientAction) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(action));
    }
  };

  const handleLike = (opinionId: string) => {
    sendAction({ type: 'like_opinion', payload: { opinionId } });
  };

  // Canvas Animation Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = (time: number) => {
      const width = MAP_COLS * TILE_SIZE;
      const height = MAP_ROWS * TILE_SIZE;

      // 1. Render Map Tiles & Buildings
      renderMap(ctx, width, height, time);

      // 2. Interpolate & Render Players
      playersRef.current.forEach((player) => {
        let pos = playerPositionsRef.current.get(player.id);
        if (!pos) {
          pos = { x: player.x, y: player.y };
          playerPositionsRef.current.set(player.id, pos);
        }

        // Smooth Lerp movement
        const targetX = typeof player.targetX === 'number' ? player.targetX : player.x;
        const targetY = typeof player.targetY === 'number' ? player.targetY : player.y;

        pos.x += (targetX - pos.x) * 0.25;
        pos.y += (targetY - pos.y) * 0.25;

        drawPlayer(ctx, player, pos.x, pos.y, time);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Sound mute toggle
  const toggleSound = () => {
    sound.soundEnabled = !sound.soundEnabled;
    setSoundMuted(!sound.soundEnabled);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Copy mobile link
  const mobilePadUrl = `http://${customIp || serverIp || window.location.hostname}:5173/?role=pad`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobilePadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered & Sorted opinions
  const sortedOpinions = [...opinions].sort((a, b) => {
    if (sortBy === 'likes') {
      return b.likes - a.likes || b.timestamp - a.timestamp;
    }
    return b.timestamp - a.timestamp;
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Retro Header Bar */}
      <header className="h-16 px-6 bg-slate-900 border-b-2 border-slate-800 flex items-center justify-between shadow-md shrink-0 z-20">
        <div className="flex items-center gap-4">
          {/* Animated Pokéball icon */}
          <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-red-600 relative overflow-hidden flex items-center justify-center shadow-inner animate-pulse">
            <div className="absolute bottom-0 w-full h-1/2 bg-white" />
            <div className="absolute w-full h-1 bg-slate-900" />
            <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-900 z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-wider text-amber-400 font-mono">
                POKETOWN FORUM
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
                {wsConnected ? '실시간 연동중' : '재연결 시도중'}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <input
                type="text"
                value={meetingTopic}
                onChange={(e) => setMeetingTopic(e.target.value)}
                className="bg-transparent border-b border-dashed border-slate-700 hover:border-amber-400 text-slate-300 focus:outline-none focus:border-amber-400 text-xs w-96 truncate transition"
                title="클릭하여 회의 안건 수정"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Online count */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-200">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>참가자: <strong className="text-cyan-300 font-bold">{players.size}</strong>명</span>
          </div>

          {/* QR Code Trigger Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition transform active:scale-95 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>📱 모바일 접속 QR</span>
          </button>

          {/* Test Pad in New Tab */}
          <a
            href="/?role=pad"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-mono border border-indigo-400/40 transition"
            title="현재 브라우저에서 모바일 가상 패드 새 탭 열기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>테스트 패드</span>
          </a>

          {/* Sound Mute */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={soundMuted ? '소리 켜기' : '소리 끄기'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="전체화면"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Dual-View Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: 16-Bit Pokémon Town Canvas (Large Screen Viewport) */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {/* Subtle Canvas Border Frame */}
          <div className="relative rounded-2xl overflow-hidden p-2 bg-gradient-to-b from-slate-700 to-slate-900 shadow-2xl border-4 border-slate-800">
            <canvas
              ref={canvasRef}
              width={MAP_COLS * TILE_SIZE}
              height={MAP_ROWS * TILE_SIZE}
              className="pixel-art block rounded-lg shadow-inner"
              style={{
                width: 'min(64vw, 980px)',
                height: 'auto',
                aspectRatio: `${MAP_COLS * TILE_SIZE} / ${MAP_ROWS * TILE_SIZE}`,
              }}
            />

            {/* In-game HUD Guide Overlay */}
            <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-sm border border-slate-700 px-3 py-1.5 rounded-md text-[11px] font-mono text-slate-300 pointer-events-none flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>타운 광장: 자유롭게 거닐며 의견을 띄워보세요</span>
            </div>

            {/* Quick QR mini corner badge */}
            <div
              onClick={() => setShowQrModal(true)}
              className="absolute bottom-4 left-4 bg-slate-900/90 hover:bg-slate-800 border-2 border-amber-400/80 p-2 rounded-xl shadow-lg cursor-pointer transition flex items-center gap-2.5 group"
            >
              <QRCodeSVG value={mobilePadUrl} size={46} bgColor="#0f172a" fgColor="#fbbf24" />
              <div className="text-left font-mono">
                <p className="text-[10px] text-amber-400 font-bold group-hover:underline">폰으로 QR 스캔</p>
                <p className="text-[9px] text-slate-400">즉시 캐릭터 조작</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Chalkboard / Quest Notice Board (실시간 익명 의견 보드) */}
        <div className="w-96 bg-stone-900 border-l-4 border-amber-950/80 flex flex-col shadow-2xl z-10 shrink-0">
          {/* Chalkboard Wooden Header */}
          <div className="p-4 bg-gradient-to-r from-amber-950 via-amber-900 to-stone-900 border-b border-amber-800/60 flex items-center justify-between shadow">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-amber-800/80 text-amber-300 border border-amber-700">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-amber-200 tracking-wide font-mono">
                  실시간 퀘스트 & 익명 보드
                </h2>
                <p className="text-[10px] text-amber-400/80 font-mono">
                  총 {opinions.length}건 등록됨
                </p>
              </div>
            </div>

            {/* Sort toggles */}
            <div className="flex items-center gap-1 bg-stone-950/60 p-0.5 rounded border border-amber-900/60 text-xs font-mono">
              <button
                onClick={() => setSortBy('latest')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer transition ${sortBy === 'latest' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'}`}
              >
                최신순
              </button>
              <button
                onClick={() => setSortBy('likes')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer transition ${sortBy === 'likes' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'}`}
              >
                인기순
              </button>
            </div>
          </div>

          {/* Opinions Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-radial from-stone-900 to-stone-950">
            {sortedOpinions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3 font-mono">
                <Sparkles className="w-10 h-10 text-amber-500/40 animate-bounce" />
                <p className="text-xs leading-relaxed">
                  아직 등록된 의견이 없습니다.
                  <br />
                  모바일로 QR을 스캔하여
                  <br />
                  첫 의견을 남겨보세요!
                </p>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="mt-2 px-3 py-1.5 rounded bg-amber-600/80 hover:bg-amber-500 text-stone-950 text-xs font-bold font-mono transition"
                >
                  QR 코드 띄우기
                </button>
              </div>
            ) : (
              sortedOpinions.map((op) => (
                <div
                  key={op.id}
                  className="bg-stone-800/90 hover:bg-stone-800 border-2 border-stone-700/80 rounded-xl p-3.5 shadow-md transition transform hover:-translate-y-0.5 relative group"
                >
                  {/* Pin Graphic */}
                  <div className="absolute -top-2 right-4 w-4 h-4 rounded-full bg-red-600 border border-red-800 shadow flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                  </div>

                  {/* Header: Player Tag & Time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: op.playerColor || '#38bdf8' }}
                      />
                      <span className="font-bold text-xs font-mono text-amber-200">
                        {op.playerName}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(op.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {/* Body text */}
                  <p className="text-xs text-stone-100 font-sans leading-relaxed break-words whitespace-pre-wrap">
                    {op.text}
                  </p>

                  {/* Footer: Like Button */}
                  <div className="mt-2.5 pt-2 border-t border-stone-700/50 flex items-center justify-end">
                    <button
                      onClick={() => handleLike(op.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-900/80 hover:bg-rose-950/60 border border-stone-700 hover:border-rose-600 text-stone-300 hover:text-rose-400 text-[11px] font-mono transition active:scale-90 cursor-pointer"
                    >
                      <Heart className={`w-3.5 h-3.5 ${op.likes > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                      <span>{op.likes || 0}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-amber-500 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition cursor-pointer"
            >
              ✕
            </button>

            {/* Pokéball badge */}
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
              <QrCode className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-lg text-amber-400 font-mono mb-1">
              스마트폰 참가자 접속 QR
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              동일한 Wi-Fi 네트워크에서 스마트폰 카메라로 QR 코드를 스캔하세요.
            </p>

            {/* The QR Code Card */}
            <div className="bg-white p-5 rounded-2xl shadow-inner inline-block mx-auto mb-4 border-4 border-slate-800">
              <QRCodeSVG
                value={mobilePadUrl}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Network IP adjustment helper */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left mb-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>호스트 IP 설정:</span>
                <button
                  onClick={() => setCustomIp(serverIp)}
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> 기본값 리셋
                </button>
              </div>
              <input
                type="text"
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                placeholder="예: 192.168.0.10"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-slate-500">
                접속 주소: <span className="text-amber-300 select-all">{mobilePadUrl}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '복사 완료!' : 'URL 복사'}</span>
              </button>

              <a
                href={mobilePadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs shadow-md transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>새 탭에서 패드 열기</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
