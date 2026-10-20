import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Sparkles, User, Palette, Check, Wifi, WifiOff,
  Flame, Heart
} from 'lucide-react';
import type { Direction, Player } from '../../types';
import { isWalkable, MAP_COLS, MAP_ROWS } from '../../game/tileRenderer';
import { sound } from '../../utils/audio';
import { useRealtimeTown } from '../../hooks/useRealtimeTown';

const COLOR_PALETTE = [
  { name: '레드', hex: '#ef4444' },
  { name: '블루', hex: '#3b82f6' },
  { name: '에메랄드', hex: '#10b981' },
  { name: '골드', hex: '#f59e0b' },
  { name: '퍼플', hex: '#8b5cf6' },
  { name: '로즈', hex: '#ec4899' },
  { name: '시안', hex: '#06b6d4' },
  { name: '다크', hex: '#475569' },
];

const QUICK_REACTIONS = [
  { label: '동의합니다!', emoji: '👍' },
  { label: '좋은 생각이에요!', emoji: '💡' },
  { label: '질문 있습니다!', emoji: '❓' },
  { label: '대단해요!', emoji: '👏' },
  { label: '완전 찬성!', emoji: '🔥' },
];

export const MobilePad: React.FC = () => {
  // Local storage persisted state
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('pkmn_nickname') || `트레이너 #${Math.floor(100 + Math.random() * 900)}`;
  });
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return localStorage.getItem('pkmn_color') || COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].hex;
  });

  const [playerId] = useState<string>(() => {
    let id = localStorage.getItem('pkmn_player_id');
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('pkmn_player_id', id);
    }
    return id;
  });

  // Player position in grid
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 10, y: 8 });
  const [direction, setDirection] = useState<Direction>('down');
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [lastSentToast, setLastSentToast] = useState<string | null>(null);

  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const posRef = useRef(pos);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // Player object for realtime channel
  const myPlayer: Player = {
    id: playerId,
    name: nickname,
    color: selectedColor,
    avatar: 'red',
    x: pos.x,
    y: pos.y,
    direction,
  };

  const { isConnected, sendMove, sendSpeak, sendAction } = useRealtimeTown({
    role: 'pad',
    myPlayer,
  });

  // Movement handler with collision detection
  const performMove = useCallback((dir: Direction) => {
    setDirection(dir);
    sound.playStep();

    if ('vibrate' in navigator) {
      navigator.vibrate?.(15);
    }

    const cur = posRef.current;
    let nextX = cur.x;
    let nextY = cur.y;

    if (dir === 'up') nextY -= 1;
    else if (dir === 'down') nextY += 1;
    else if (dir === 'left') nextX -= 1;
    else if (dir === 'right') nextX += 1;

    // Check boundary & walkability
    if (nextX >= 0 && nextX < MAP_COLS && nextY >= 0 && nextY < MAP_ROWS && isWalkable(nextX, nextY)) {
      setPos({ x: nextX, y: nextY });
      sendMove(nextX, nextY, dir, true);

      // Stop walking animation after short delay
      setTimeout(() => {
        sendMove(nextX, nextY, dir, false);
      }, 150);
    } else {
      // Just change facing direction if blocked
      sendMove(cur.x, cur.y, dir, false);
    }
  }, [sendMove]);

  // Hold-to-move pointer handlers
  const handlePointerDown = (dir: Direction) => {
    performMove(dir);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      performMove(dir);
    }, 180);
  };

  const handlePointerUp = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  // Keyboard navigation support for desktop pad testing (disabled while typing in input!)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping || document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') performMove('up');
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') performMove('down');
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') performMove('left');
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') performMove('right');
      else if (e.key === ' ' || e.key === 'z') handleActionButtonB();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performMove, isTyping]);

  // Submit anonymous opinion
  const handleSubmitOpinion = (textToSend?: string) => {
    const content = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!content) return;

    sound.playSpeak();
    if ('vibrate' in navigator) navigator.vibrate?.(30);

    sendSpeak(content);

    if (textToSend === undefined) {
      setInputText('');
    }

    setLastSentToast(`📢 "${content}" 스크린에 전송 완료!`);
    setTimeout(() => setLastSentToast(null), 3500);
  };

  // Action Button A: Focus opinion input or greet
  const handleActionButtonA = () => {
    sound.playSpeak();
    if ('vibrate' in navigator) navigator.vibrate?.(25);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Action Button B: Jump
  const handleActionButtonB = () => {
    sound.playJump();
    if ('vibrate' in navigator) navigator.vibrate?.(40);
    sendAction('jump');
  };

  // Quick Emote triggers
  const handleSendEmote = (actionType: 'heart' | 'wave' | 'alert') => {
    if (actionType === 'heart') sound.playLike();
    else sound.playJump();
    if ('vibrate' in navigator) navigator.vibrate?.(30);
    sendAction(actionType);
  };

  // Save nickname and color
  const saveProfile = (newNick: string, newCol: string) => {
    setNickname(newNick);
    setSelectedColor(newCol);
    localStorage.setItem('pkmn_nickname', newNick);
    localStorage.setItem('pkmn_color', newCol);
    setShowSettings(false);
  };

  return (
    <div 
      className="fixed inset-0 h-[100dvh] w-screen bg-slate-900 text-slate-100 flex flex-col justify-between select-none overflow-hidden touch-none"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* 1. Retro Game Boy Top Console Header */}
      <div className="bg-slate-950 border-b-4 border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          {/* Power LED Indicator */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-emerald-500'}`} />
            <span className="font-bold tracking-tight">PWR</span>
          </div>

          {/* Nickname & Avatar Card */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-slate-900 border-2 border-slate-700 hover:border-amber-400 px-3 py-1 rounded-xl text-left transition cursor-pointer"
          >
            <div 
              className="w-4 h-4 rounded-full border border-white/40 shadow-sm shrink-0" 
              style={{ backgroundColor: selectedColor }}
            />
            <div className="leading-tight">
              <span className="font-bold text-xs text-amber-300 font-mono block max-w-[120px] truncate">
                {nickname}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                위치 ({pos.x}, {pos.y})
              </span>
            </div>
          </button>
        </div>

        {/* Network connection badge & Settings Trigger */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">클라우드 연결</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-amber-400 font-bold">로컬 브릿지</span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title="닉네임 및 색상 변경"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {lastSentToast && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-emerald-950/95 border-2 border-emerald-500 text-emerald-200 px-3.5 py-2 rounded-xl text-xs font-mono text-center shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {lastSentToast}
        </div>
      )}

      {/* 2. Central Handheld Controller Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 relative max-w-md mx-auto w-full">
        {/* Retro Handheld Speaker Slits */}
        <div className="absolute top-2 right-4 flex gap-1 opacity-20 pointer-events-none">
          <div className="w-1 h-6 bg-slate-400 rounded-full transform rotate-12" />
          <div className="w-1 h-6 bg-slate-400 rounded-full transform rotate-12" />
          <div className="w-1 h-6 bg-slate-400 rounded-full transform rotate-12" />
        </div>

        {/* D-Pad & Action Buttons Grid */}
        <div className="w-full flex items-center justify-between px-2 gap-4">
          {/* Authentic Cross D-Pad */}
          <div className="relative w-44 h-44 bg-slate-950/70 p-3 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center touch-none select-none">
            {/* Center Pivot Bevel */}
            <div className="absolute w-12 h-12 rounded-full bg-slate-800 shadow-inner z-10 pointer-events-none border border-slate-700/50" />

            {/* UP */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handlePointerDown('up'); }}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute top-1 w-14 h-14 bg-gradient-to-b from-slate-700 to-slate-800 active:from-slate-600 active:to-slate-700 border-2 border-slate-900 rounded-t-xl flex items-center justify-center shadow-lg active:shadow-inner cursor-pointer"
            >
              <div className="w-0 h-0 border-x-8 border-x-transparent border-b-10 border-b-amber-400/80 mb-2" />
            </button>

            {/* DOWN */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handlePointerDown('down'); }}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute bottom-1 w-14 h-14 bg-gradient-to-t from-slate-700 to-slate-800 active:from-slate-600 active:to-slate-700 border-2 border-slate-900 rounded-b-xl flex items-center justify-center shadow-lg active:shadow-inner cursor-pointer"
            >
              <div className="w-0 h-0 border-x-8 border-x-transparent border-t-10 border-t-amber-400/80 mt-2" />
            </button>

            {/* LEFT */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handlePointerDown('left'); }}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute left-1 w-14 h-14 bg-gradient-to-r from-slate-700 to-slate-800 active:from-slate-600 active:to-slate-700 border-2 border-slate-900 rounded-l-xl flex items-center justify-center shadow-lg active:shadow-inner cursor-pointer"
            >
              <div className="w-0 h-0 border-y-8 border-y-transparent border-r-10 border-r-amber-400/80 mr-2" />
            </button>

            {/* RIGHT */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handlePointerDown('right'); }}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute right-1 w-14 h-14 bg-gradient-to-l from-slate-700 to-slate-800 active:from-slate-600 active:to-slate-700 border-2 border-slate-900 rounded-r-xl flex items-center justify-center shadow-lg active:shadow-inner cursor-pointer"
            >
              <div className="w-0 h-0 border-y-8 border-y-transparent border-l-10 border-l-amber-400/80 ml-2" />
            </button>
          </div>

          {/* Action Buttons A & B (Slanted Game Boy Style) */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 transform -rotate-12">
              {/* Button B (Jump & Emote) */}
              <div className="flex flex-col items-center">
                <button
                  onClick={handleActionButtonB}
                  className="w-15 h-15 rounded-full bg-gradient-to-b from-purple-500 to-purple-700 active:from-purple-400 active:to-purple-600 border-3 border-purple-900 shadow-xl active:shadow-inner flex items-center justify-center cursor-pointer active:scale-95 transition"
                >
                  <span className="font-bold text-white text-base font-mono drop-shadow">B</span>
                </button>
                <span className="text-[10px] text-purple-300 font-mono mt-1 font-bold">점프</span>
              </div>

              {/* Button A (Focus Input / Speak) */}
              <div className="flex flex-col items-center mb-6">
                <button
                  onClick={handleActionButtonA}
                  className="w-15 h-15 rounded-full bg-gradient-to-b from-rose-500 to-rose-700 active:from-rose-400 active:to-rose-600 border-3 border-rose-900 shadow-xl active:shadow-inner flex items-center justify-center cursor-pointer active:scale-95 transition"
                >
                  <span className="font-bold text-white text-base font-mono drop-shadow">A</span>
                </button>
                <span className="text-[10px] text-rose-300 font-mono mt-1 font-bold">말하기</span>
              </div>
            </div>

            {/* Quick Emote Action Pills */}
            <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow">
              <button
                onClick={() => handleSendEmote('heart')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-rose-400 border border-slate-800 transition active:scale-90 cursor-pointer"
                title="하트 띄우기"
              >
                <Heart className="w-4 h-4 fill-rose-500" />
              </button>
              <button
                onClick={() => handleSendEmote('wave')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-amber-950 text-amber-400 border border-slate-800 transition active:scale-90 cursor-pointer"
                title="인사하기"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSendEmote('alert')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-red-950 text-red-400 border border-slate-800 transition active:scale-90 cursor-pointer"
                title="느낌표 띄우기"
              >
                <Flame className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Reaction Chips Bar */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0 z-10">
        <span className="text-[10px] text-slate-500 font-mono shrink-0 pl-1">빠른 의견:</span>
        {QUICK_REACTIONS.map((qr) => (
          <button
            key={qr.label}
            onClick={() => handleSubmitOpinion(`${qr.emoji} ${qr.label}`)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 active:bg-amber-900/40 border border-slate-700/80 text-slate-300 active:text-amber-300 text-xs font-mono shrink-0 transition active:scale-95 cursor-pointer"
          >
            <span>{qr.emoji}</span>
            <span>{qr.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Bottom Retro Opinion Input Box */}
      <div className="p-3 bg-slate-950 border-t-2 border-slate-800 shrink-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitOpinion();
          }}
          className="flex items-center gap-2 max-w-md mx-auto"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="익명 의견을 입력하세요 (스크린에 5초간 말풍선)..."
              maxLength={80}
              className="w-full bg-slate-900 border-2 border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition font-sans pr-14"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono">
              {inputText.length}/80
            </span>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer font-mono shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>전송</span>
          </button>
        </form>
      </div>

      {/* Settings Modal (Nickname & Color Changer) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-amber-500 rounded-2xl max-w-sm w-full p-5 text-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-amber-400 font-mono mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>트레이너 프로필 설정</span>
            </h3>

            {/* Nickname input */}
            <div className="mb-4">
              <label className="text-[11px] text-slate-400 font-mono block mb-1">익명 닉네임</label>
              <input
                type="text"
                defaultValue={nickname}
                id="edit-nickname-input"
                maxLength={12}
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            {/* Color Palette */}
            <div className="mb-5">
              <label className="text-[11px] text-slate-400 font-mono block mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3" />
                <span>캐릭터 컬러</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PALETTE.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setSelectedColor(col.hex)}
                    className="p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition cursor-pointer"
                    style={{
                      borderColor: selectedColor === col.hex ? '#fbbf24' : '#334155',
                      backgroundColor: selectedColor === col.hex ? '#1e293b' : '#0f172a',
                    }}
                  >
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: col.hex }} />
                    <span className="text-[9px] font-mono text-slate-300">{col.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('edit-nickname-input') as HTMLInputElement;
                  const newNick = input?.value.trim() || nickname;
                  saveProfile(newNick, selectedColor);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>저장 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
