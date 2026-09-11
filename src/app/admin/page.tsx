'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Shield, Tv, Lock, ArrowRight, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { sounds } from '@/lib/audio';

export default function AdminPortalPage() {
  const router = useRouter();
  const [hostEmail, setHostEmail] = useState('rahul@admin.com');
  const [hostPin, setHostPin] = useState('1234');
  const [gameCode, setGameCode] = useState('KBC-2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('kbc_host_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: hostEmail.trim(), pin: hostPin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid credentials.');
        sounds.playWrong();
        setIsLoading(false);
        return;
      }

      localStorage.setItem('kbc_host_token', data.token);
      localStorage.setItem('kbc_host_email', hostEmail);
      setIsAuthenticated(true);
      sounds.playCorrect();
      router.push(`/host?code=${encodeURIComponent(gameCode.trim().toUpperCase())}`);
    } catch {
      setErrorMsg('Network error while authenticating.');
      sounds.playWrong();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e]">
      <Header role="HOST" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 flex flex-col items-center justify-center">
        {/* Admin Restricted Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-8">
          <div className="flex justify-center mb-1">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-xl shadow-amber-500/20">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden p-1">
                <img
                  src="/logo.png"
                  alt="Vardhman KBC Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            <span>Restricted Administrator & Production Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black gold-gradient-text uppercase">
            Vardhman KBC Admin Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Authorized management console for Host Control and Big Screen Projector broadcast.
          </p>
        </div>

        {/* 2 Big Admin Cards: Host Dashboard & Big Screen Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Card 1: Host Dashboard */}
          <div className="kbc-frame p-6 sm:p-7 flex flex-col justify-between border-amber-500/30 hover:border-amber-400 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                  <Shield className="w-6 h-6 text-slate-950" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                  Host Console
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 uppercase">
                  Host Dashboard (Rahul Admin)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Full game orchestrator: compose & push questions, start timers, control buzzers, and reveal ranks.
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-400">
                      Host Email (Sole Authorized)
                    </label>
                    <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Exclusive Access
                    </span>
                  </div>
                  <input
                    type="email"
                    readOnly
                    value="rahul@admin.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-amber-500/30 text-xs font-mono text-amber-300 cursor-not-allowed select-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Host access is strictly restricted to rahul@admin.com only.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Security PIN (Default: 1234)
                  </label>
                  <input
                    type="password"
                    required
                    value={hostPin}
                    onChange={(e) => setHostPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Game Room Code
                  </label>
                  <input
                    type="text"
                    required
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-amber-400 uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>

                {errorMsg && (
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Shield className="w-4 h-4" />
                  <span>{isLoading ? 'AUTHENTICATING...' : 'ENTER HOST CONTROL'}</span>
                </button>
              </form>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full host authority with live candidates view</span>
            </div>
          </div>

          {/* Card 2: Big Screen Display */}
          <div className="kbc-frame p-6 sm:p-7 flex flex-col justify-between border-slate-800 hover:border-amber-500/50 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">
                  <Tv className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase">
                  Projector Mode
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 uppercase">
                  Big Screen Display
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Fullscreen projector layout with real-time question display, circular timer animations, and live buzzer podium leaderboards.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-300 py-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Cinematic 4K Television & Projector Layout</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Audience View with Live Sound Effects</span>
                </div>
              </div>

              <Link
                href={`/screen?code=${encodeURIComponent(gameCode.trim().toUpperCase())}`}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>LAUNCH BIG SCREEN DISPLAY</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Optimized for public viewing screens</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
