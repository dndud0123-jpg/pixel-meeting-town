import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, MessageSquare, QrCode, Volume2, VolumeX, Maximize2, Minimize2, 
  Sparkles, Heart, ExternalLink, Radio, Cloud
} from 'lucide-react';
import { renderMap, drawPlayer, MAP_COLS, MAP_ROWS, TILE_SIZE } from '../../game/tileRenderer';
import { sound } from '../../utils/audio';
import { DynamicQRCard } from './DynamicQRCard';
import { useRealtimeTown } from '../../hooks/useRealtimeTown';

export const ScreenView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'latest' | 'likes'>('latest');
  const [meetingTopic, setMeetingTopic] = useState<string>('오늘의 안건: Vercel & Supabase 클라우드 16비트 도트 소통 회의');

  const { players, opinions, onlineCount, isConnected, isConfigured, sendLike } = useRealtimeTown({
    role: 'screen',
  });

  const playersRef = useRef(players);
  const playerPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Sync ref with players
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

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

      // 1. Render Map Tiles & Buildings (Ocean waves, sand, Pokemon Center, Mart, trees)
      renderMap(ctx, width, height, time);

      // 2. Interpolate & Render synchronized Players with speech bubbles
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

  // Current origin mobile link
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const mobilePadUrl = `${currentOrigin}/?role=pad`;

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

              {/* Cloud Realtime WSS 443 Badge */}
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono flex items-center gap-1.5">
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span>Supabase Realtime (WSS 443)</span>
              </span>

              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {isConnected ? '클라우드 연동중' : '로컬/대기 모드'}
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
            <span>참가자: <strong className="text-cyan-300 font-bold">{Math.max(onlineCount, players.size)}</strong>명</span>
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
            href={mobilePadUrl}
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
                <p className="text-[9px] text-slate-400">사내망/LTE 접속</p>
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
                      onClick={() => sendLike(op.id)}
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

      {/* Dynamic QR Card Modal */}
      <DynamicQRCard
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        isConfigured={isConfigured}
      />
    </div>
  );
};
