import React from 'react';
import { Terminal, Plus, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'profiles' | 'proxies' | 'cdp' | 'storage' | 'code';
  setActiveTab: (tab: 'profiles' | 'proxies' | 'cdp' | 'storage' | 'code') => void;
  onNewProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onNewProfile }) => {
  return (
    <header className="border-b border-slate-800 bg-[#0c121e]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single line, no subtitle chips) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            Chromium CDP Automation Studio
          </span>
        </div>

        {/* Zone 2: 5 clean single-line nav links with hover underlines / active indicators */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
              activeTab === 'profiles'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            Profile Fleet
          </button>
          <button
            onClick={() => setActiveTab('proxies')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
              activeTab === 'proxies'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            Proxy Tunnels &amp; Auth
          </button>
          <button
            onClick={() => setActiveTab('cdp')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
              activeTab === 'cdp'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            CDP Protocol Inspector
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
              activeTab === 'storage'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            Storage &amp; Locks
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
              activeTab === 'code'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            Code Synthesizer &amp; Runner
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNewProfile}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
};
