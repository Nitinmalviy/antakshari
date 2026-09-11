'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Volume2, VolumeX, Shield, Users, Tv, Maximize, Minimize } from 'lucide-react';
import { sounds } from '@/lib/audio';

interface HeaderProps {
  isConnected?: boolean;
  isReconnecting?: boolean;
  latency?: number;
  gameCode?: string;
  role?: 'HOST' | 'CANDIDATE' | 'SCREEN' | 'HOME';
}

export const Header: React.FC<HeaderProps> = ({
  isConnected = true,
  isReconnecting = false,
  latency = 0,
  gameCode,
  role = 'HOME',
}) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    sounds.enabled = audioEnabled;
  }, [audioEnabled]);

  const toggleSound = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playLock();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="w-full bg-[#0a0f1d]/95 backdrop-blur-md border-b border-amber-500/25 px-4 py-2.5 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Vardhman KBC Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden p-0.5">
              <img
                src="/logo.png"
                alt="Vardhman KBC Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-wider text-base sm:text-lg gold-gradient-text uppercase">
                Vardhman KBC
              </span>
              {gameCode && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded font-mono font-bold tracking-wide">
                  {gameCode}
                </span>
              )}
            </div>
            <div className="text-[10px] text-amber-300/70 hidden sm:block font-medium">
              Mahaveer Dham Dewas • Real-Time Quiz Championship
            </div>
          </div>
        </Link>

        {/* Center: Live Server Connection Status */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                  : isReconnecting
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {isConnected ? 'Server Live' : isReconnecting ? 'Reconnecting...' : 'Offline'}
            </span>
            {isConnected && latency > 0 && (
              <span className="text-slate-500 font-mono text-[11px] border-l border-slate-700 pl-2">
                {latency}ms
              </span>
            )}
          </div>
        </div>

        {/* Right: Role Navigation & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Admin Role (HOST / SCREEN): Switch between Host Dashboard & Big Screen */}
          {role === 'HOST' || role === 'SCREEN' ? (
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs">
              <Link
                href="/host"
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                  role === 'HOST'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Host Dashboard</span>
              </Link>
              <Link
                href="/screen"
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                  role === 'SCREEN'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Big Screen</span>
              </Link>
            </div>
          ) : (
            // CANDIDATE & HOME ONLY: Restricted to Candidate Arena! No host or screen links!
            <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Candidate Arena</span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            title={audioEnabled ? 'Sound On' : 'Sound Off'}
            className={`p-2 rounded-lg border transition-colors ${
              audioEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Toggle Fullscreen"
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors hidden sm:block"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
