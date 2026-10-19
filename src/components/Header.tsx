import React from 'react';
import { Globe2, Plus } from 'lucide-react';

interface HeaderProps {
  activeTab: 'workspace' | 'profiles' | 'proxies' | 'cdp' | 'storage' | 'code';
  setActiveTab: (tab: 'workspace' | 'profiles' | 'proxies' | 'cdp' | 'storage' | 'code') => void;
  onNewProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onNewProfile }) => {
  return (
    <header className="border-b border-slate-800 bg-[#0c121e]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single line, no subtitle chips) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-300/30 flex items-center justify-center text-cyan-300">
            <Globe2 className="w-4 h-4" />
          </div>
          <button onClick={() => setActiveTab('workspace')} className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            Field Browser
          </button>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 hidden lg:inline">Profile workspace</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${activeTab === 'workspace' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-200'}`}
          >
            <Globe2 size={14} /> Browser
          </button>
          <span className="w-px h-5 bg-slate-800 mx-2" />
          <button
            onClick={() => setActiveTab('profiles')}
            className={`whitespace-nowrap transition-colors px-3 py-2 rounded-md ${
              activeTab === 'profiles'
                ? 'text-cyan-300 bg-slate-800 font-semibold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            Profiles
          </button>
          <button
            onClick={() => setActiveTab('proxies')}
            className={`whitespace-nowrap transition-colors px-3 py-2 rounded-md ${
              activeTab === 'proxies'
                ? 'text-cyan-300 bg-slate-800 font-semibold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            Proxy
          </button>
          <button
            onClick={() => setActiveTab('cdp')}
            className={`whitespace-nowrap transition-colors px-3 py-2 rounded-md ${
              activeTab === 'cdp'
                ? 'text-cyan-300 bg-slate-800 font-semibold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            CDP
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`whitespace-nowrap transition-colors px-3 py-2 rounded-md ${
              activeTab === 'storage'
                ? 'text-cyan-300 bg-slate-800 font-semibold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            Storage
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`whitespace-nowrap transition-colors px-3 py-2 rounded-md ${
              activeTab === 'code'
                ? 'text-cyan-300 bg-slate-800 font-semibold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            Code
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNewProfile}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-cyan-300 hover:bg-cyan-200 text-slate-950 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
};
