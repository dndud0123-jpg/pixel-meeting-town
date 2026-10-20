import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, ExternalLink, Globe, Shield, RefreshCw } from 'lucide-react';
import type { TunnelInfo } from '../../types';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tunnelInfo: TunnelInfo | null;
  serverIp: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  tunnelInfo,
  serverIp,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [customOverride, setCustomOverride] = useState<string>('');

  if (!isOpen) return null;

  // Active base URL priority: Custom user input > Cloudflare tunnel URL > Local IP
  const defaultBaseUrl = tunnelInfo?.url || `http://${serverIp || window.location.hostname}:5173`;
  const activeBaseUrl = (customOverride.trim() || defaultBaseUrl).replace(/\/$/, '');
  const mobilePadUrl = `${activeBaseUrl}/?role=pad`;

  const isHttps = activeBaseUrl.startsWith('https://');
  const isCloudflare = tunnelInfo?.provider === 'cloudflare' && isHttps;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobilePadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* Network & Security Status Header */}
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
          <QrCode className="w-8 h-8" />
        </div>

        <h3 className="font-bold text-lg text-amber-400 font-mono mb-1">
          스마트폰 참가자 접속 QR
        </h3>

        {/* Network Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {isCloudflare ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 text-xs font-mono">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloudflare Tunnel 연결 (LTE/모바일망 호환)</span>
            </span>
          ) : isHttps ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700 text-xs font-mono">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>공용 HTTPS 보안 터널 연결됨</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-700 text-xs font-mono">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>로컬 Wi-Fi 사내망 모드</span>
            </span>
          )}
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

        {/* URL Box & Custom override */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left mb-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>접속 링크 (사내망/LTE 자동 인식):</span>
            {customOverride && (
              <button
                onClick={() => setCustomOverride('')}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> 기본값 복원
              </button>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs break-all select-all font-mono">
            {mobilePadUrl}
          </div>

          <div className="text-[10px] text-slate-500 pt-1">
            <span className="block mb-1">외부 터널 URL 직접 입력 (ngrok 등 사용 시):</span>
            <input
              type="text"
              value={customOverride}
              onChange={(e) => setCustomOverride(e.target.value)}
              placeholder="예: https://custom-tunnel.trycloudflare.com"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

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
