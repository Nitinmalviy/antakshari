'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Shield, Users, Tv, Sparkles, ArrowRight, Trophy, Zap, Clock, CheckCircle } from 'lucide-react';
import { sounds } from '@/lib/audio';

export default function HomePage() {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState('');
  const [gameCode, setGameCode] = useState('KBC-2026');
  const [hostEmail, setHostEmail] = useState('rahul@admin.com');
  const [hostPin, setHostPin] = useState('1234');
  const [isHostLoggingIn, setIsHostLoggingIn] = useState(false);
  const [hostError, setHostError] = useState('');

  const handleJoinAsCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !gameCode.trim()) return;
    sounds.playLock();
    // Save to localStorage for quick restore
    localStorage.setItem('kbc_candidate_name', candidateName.trim());
    localStorage.setItem('kbc_game_code', gameCode.trim().toUpperCase());
    router.push(`/candidate?code=${encodeURIComponent(gameCode.trim().toUpperCase())}&name=${encodeURIComponent(candidateName.trim())}`);
  };

  const handleHostLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsHostLoggingIn(true);
    setHostError('');

    try {
      const res = await fetch('/api/auth/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: hostEmail.trim(), pin: hostPin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setHostError(data.error || 'Authentication failed');
        sounds.playWrong();
        return;
      }

      localStorage.setItem('kbc_host_token', data.token);
      localStorage.setItem('kbc_host_email', hostEmail);
      sounds.playCorrect();
      router.push(`/host?code=${encodeURIComponent(gameCode.trim().toUpperCase())}`);
    } catch {
      setHostError('Connection error. Please try again.');
    } finally {
      setIsHostLoggingIn(false);
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem('kbc_candidate_name');
    const savedCode = localStorage.getItem('kbc_game_code');
    if (savedName) setCandidateName(savedName);
    if (savedCode) setGameCode(savedCode);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header role="HOME" />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        {/* Championship Brand Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-10">
          <div className="flex justify-center mb-2">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-1 shadow-2xl shadow-amber-500/30 hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden p-1">
                <img
                  src="/logo.png"
                  alt="Mahaveer Dham Dewas - Vardhman KBC Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Sparkles className="w-4 h-4" />
            <span>Mahaveer Dham Dewas • Live Championship</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none uppercase">
            <span className="gold-gradient-text block">VARDHMAN KBC</span>
            <span className="silver-gradient-text block text-2xl sm:text-4xl md:text-5xl mt-1.5 font-bold">
              QUIZ ARENA
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Experience ultra-low latency real-time quiz mechanics with millisecond precision, fastest-finger first option locking, dynamic rounds, and live buzzer battles.
          </p>
        </div>

        {/* CANDIDATE ARENA ONLY (Main Entrance) */}
        <div className="w-full max-w-lg">
          <div className="kbc-frame p-6 sm:p-8 flex flex-col justify-between relative group hover:border-amber-400/80 transition-all duration-300 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                  <Users className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  Player Entrance
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-100 uppercase">Candidate Arena</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your full name and game code to enter the live championship.
                </p>
              </div>

              <form onSubmit={handleJoinAsCandidate} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Your Full Name / Account Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Amit Sharma"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Game Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KBC-2026"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 text-base font-mono font-bold text-amber-400 uppercase placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <span>JOIN CANDIDATE ARENA</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Supports 40+ simultaneous players</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Live Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Banner */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-amber-400 font-black text-xl sm:text-2xl">Round 1</div>
            <div className="text-xs text-slate-400 mt-0.5">Common 4-Option Question</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-amber-400 font-black text-xl sm:text-2xl">Round 2+</div>
            <div className="text-xs text-slate-400 mt-0.5">Buzzer-Only Face-Off</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-amber-400 font-black text-xl sm:text-2xl">0.001s</div>
            <div className="text-xs text-slate-400 mt-0.5">Millisecond Precision</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-amber-400 font-black text-xl sm:text-2xl">Dynamic</div>
            <div className="text-xs text-slate-400 mt-0.5">Unlimited Dynamic Rounds</div>
          </div>
        </div>

        {/* Discrete Admin Link at Footer */}
        <div className="mt-12 text-center">
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-amber-400/80 transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/60"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Host & Stage Admin Portal</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
