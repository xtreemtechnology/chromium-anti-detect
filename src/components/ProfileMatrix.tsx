import React, { useState } from 'react';
import { BrowserProfile } from '../automation/types';
import {
  HardDrive,
  Globe,
  Sliders,
  Terminal,
  ShieldCheck,
  Trash2,
  Edit3,
  Play,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';

interface ProfileMatrixProps {
  profiles: BrowserProfile[];
  onSelectProfileForCode: (profile: BrowserProfile) => void;
  onEditProfile: (profile: BrowserProfile) => void;
  onDeleteProfile: (id: string) => void;
  onTestProxy: (profile: BrowserProfile) => void;
  onSanitizeLocks: (id: string) => void;
  onQuickRun: (profile: BrowserProfile) => void;
}

export const ProfileMatrix: React.FC<ProfileMatrixProps> = ({
  profiles,
  onSelectProfileForCode,
  onEditProfile,
  onDeleteProfile,
  onTestProxy,
  onSanitizeLocks,
  onQuickRun,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPolicy, setFilterPolicy] = useState<'all' | 'persistent' | 'ephemeral'>('all');

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userDataDir.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.proxy.host.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterPolicy === 'persistent') return matchesSearch && p.isPersistent;
    if (filterPolicy === 'ephemeral') return matchesSearch && !p.isPersistent;
    return matchesSearch;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Workspace Banner & Control Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Isolated Browser Profile Matrix
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated Chromium instances with strict filesystem boundaries, isolated cache directories, and per-profile authenticated proxy routing.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter profiles, paths, or proxy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-64"
          />

          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-md">
            <button
              onClick={() => setFilterPolicy('all')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                filterPolicy === 'all' ? 'bg-slate-800 text-slate-100 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({profiles.length})
            </button>
            <button
              onClick={() => setFilterPolicy('persistent')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                filterPolicy === 'persistent' ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Persistent
            </button>
            <button
              onClick={() => setFilterPolicy('ephemeral')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                filterPolicy === 'ephemeral' ? 'bg-slate-800 text-amber-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ephemeral
            </button>
          </div>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((profile) => (
          <div
            key={profile.id}
            className="p-5 rounded-lg border border-slate-800 bg-[#0e1422] flex flex-col justify-between hover:border-slate-700 transition-colors"
          >
            <div>
              {/* Header: Title and unboxed metadata */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{profile.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                    <span>{profile.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className={profile.isPersistent ? 'text-emerald-400' : 'text-amber-400'}>
                      {profile.isPersistent ? 'Persistent Storage' : 'Ephemeral Sandbox'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatBytes(profile.totalSizeBytes)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onQuickRun(profile)}
                    title="Simulate Workflow Run"
                    className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditProfile(profile)}
                    title="Edit Configuration"
                    className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteProfile(profile.id)}
                    title="Delete Profile"
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-2 line-clamp-2">{profile.description}</p>

              {/* Storage Isolation Telemetry */}
              <div className="mt-4 p-3 rounded bg-[#090d16] border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>User Data Dir:</span>
                  </div>
                  <span className="font-mono text-slate-300 text-[11px] truncate max-w-[280px]" title={profile.userDataDir}>
                    {profile.userDataDir}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    <span>Disk Cache Dir:</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px] truncate max-w-[280px]" title={profile.diskCacheDir}>
                    {profile.diskCacheDir}
                  </span>
                </div>

                {/* Storage partition breakdown bar */}
                <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Partitions:</span>
                  <div className="flex items-center gap-3">
                    <span>Cookies: {formatBytes(profile.storageBuckets.find(b => b.id === 'sb-cookies')?.sizeBytes || 0)}</span>
                    <span aria-hidden="true">·</span>
                    <span>LevelDB: {formatBytes(profile.storageBuckets.find(b => b.id === 'sb-localstorage')?.sizeBytes || 0)}</span>
                    <span aria-hidden="true">·</span>
                    <span>Cache: {formatBytes(profile.storageBuckets.find(b => b.id === 'sb-cache')?.sizeBytes || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Proxy & Fingerprint Row */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {/* Proxy Box */}
                <div className="p-2.5 rounded bg-[#090d16] border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      Proxy Binding
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {profile.proxy.enabled ? profile.proxy.authMethod : 'Disabled'}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-slate-200 text-[11px] truncate">
                    {profile.proxy.enabled ? `${profile.proxy.host}:${profile.proxy.port}` : 'Direct Connection'}
                  </div>
                  {profile.proxy.enabled && profile.proxy.lastLatencyMs && (
                    <div className="mt-1 text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="text-emerald-400 tabular-nums">{profile.proxy.lastLatencyMs}ms</span>
                      <span aria-hidden="true">·</span>
                      <span>Exit IP: {profile.proxy.exitIp || 'Verified'}</span>
                    </div>
                  )}
                </div>

                {/* Fingerprint Box */}
                <div className="p-2.5 rounded bg-[#090d16] border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      Fingerprint
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{profile.fingerprint.locale}</span>
                  </div>
                  <div className="mt-1 font-mono text-slate-200 text-[11px] truncate">
                    {profile.fingerprint.viewportWidth}x{profile.fingerprint.viewportHeight} ({profile.fingerprint.timezoneId})
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                    {profile.fingerprint.webglRenderer.split('(')[0].trim()}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {profile.proxy.enabled && (
                  <button
                    onClick={() => onTestProxy(profile)}
                    className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Test Proxy</span>
                  </button>
                )}
                <button
                  onClick={() => onSanitizeLocks(profile.id)}
                  title="Purge Chromium SingletonLock files to prevent startup collisions"
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Sanitize Locks</span>
                </button>
              </div>

              <button
                onClick={() => onSelectProfileForCode(profile)}
                className="px-3 py-1 text-xs rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1.5"
              >
                <Terminal className="w-3 h-3" />
                <span>Synthesize Code</span>
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 p-12 text-center rounded-lg border border-slate-800 bg-[#0e1422]">
            <HardDrive className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-slate-300">No matching profiles found</h4>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or create a new isolated browser profile.</p>
          </div>
        )}
      </div>
    </div>
  );
};
