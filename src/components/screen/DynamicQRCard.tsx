import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, ExternalLink, Globe, Key, Settings } from 'lucide-react';
import { getSupabaseConfig, saveCustomSupabaseConfig } from '../../lib/supabaseClient';

interface DynamicQRCardProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
}

export const DynamicQRCard: React.FC<DynamicQRCardProps> = ({
  isOpen,
  onClose,
  isConfigured,
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const { url: currentUrl, anonKey: currentKey } = getSupabaseConfig();
  const [inputUrl, setInputUrl] = useState(currentUrl.startsWith('https://demo') ? '' : currentUrl);
  const [inputKey, setInputKey] = useState(currentKey.startsWith('eyJhbGci') && currentUrl.startsWith('https://demo') ? '' : currentKey);

  if (!isOpen) return null;

  // Recognizes current deployment origin automatically: ${window.location.origin}?role=pad
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const mobilePadUrl = `${currentOrigin}/?role=pad`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobilePadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl && inputKey) {
      saveCustomSupabaseConfig(inputUrl, inputKey);
      setShowConfig(false);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-4 border-amber-500 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition cursor-pointer"
        >
          ✕
        </button>

        {/* Pokéball / Cloud Badge */}
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
          <QrCode className="w-8 h-8" />
        </div>

        <h3 className="font-bold text-lg text-amber-400 font-mono mb-1">
          스마트폰 참가자 접속 QR
        </h3>

        {/* Cloud Deployment WSS 443 Badge */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>클라우드 Vercel & Supabase WSS (443 표준 포트)</span>
          </span>
        </div>

        {/* QR Code Canvas */}
        <div className="bg-white p-5 rounded-2xl shadow-inner inline-block mx-auto mb-3 border-4 border-slate-800">
          <QRCodeSVG
            value={mobilePadUrl}
            size={220}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Dynamic Domain Recognition Info */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left mb-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>현재 배포된 접속 주소:</span>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-[10px] text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} title={isConfigured ? 'Supabase 연동됨' : '기본 브릿지 모드'} />
              <Settings className="w-3 h-3" /> Supabase 설정
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs break-all select-all font-mono">
            {mobilePadUrl}
          </div>

          <p className="text-[10px] text-slate-400">
            사내 Wi-Fi와 무관하게 개인 스마트폰(LTE/5G)으로 스캔 시 즉시 조작 패드가 열립니다.
          </p>
        </div>

        {/* Supabase Config Inline Toggle */}
        {showConfig && (
          <form onSubmit={handleSaveConfig} className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3 text-left font-mono text-xs mb-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Key className="w-3.5 h-3.5" />
              <span>Supabase Realtime 설정</span>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Project URL</label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Anon Key</label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
              >
                닫기
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
              >
                저장 및 적용
              </button>
            </div>
          </form>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleCopy}
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
  );
};
