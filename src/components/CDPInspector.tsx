import React, { useState, useEffect } from 'react';
import { CDPLogEntry } from '../automation/types';
import {
  Terminal,
  Play,
  RotateCcw,
  Layers,
  Check,
  AlertCircle,
  Copy,
  Sliders,
  Filter
} from 'lucide-react';

interface CDPPreset {
  name: string;
  domain: 'Fetch' | 'Network' | 'Page' | 'Storage' | 'Emulation';
  method: string;
  description: string;
  defaultParams: Record<string, unknown>;
}

const CDP_PRESETS: CDPPreset[] = [
  {
    name: 'Proxy Auth Interception',
    domain: 'Fetch',
    method: 'Fetch.enable',
    description: 'Enables Fetch domain with handleAuthRequests to catch 407 Proxy Challenges.',
    defaultParams: {
      handleAuthRequests: true,
      patterns: [{ urlPattern: '*' }],
    },
  },
  {
    name: 'Provide Proxy Credentials',
    domain: 'Fetch',
    method: 'Fetch.continueWithAuth',
    description: 'Resolves an intercepted Fetch.authRequired event with username and password.',
    defaultParams: {
      requestId: 'req-example-01',
      authChallengeResponse: {
        response: 'ProvideCredentials',
        username: 'res_bot_corp_7491',
        password: '••••••••',
      },
    },
  },
  {
    name: 'Stealth WebDriver Erasure',
    domain: 'Page',
    method: 'Page.addScriptToEvaluateOnNewDocument',
    description: 'Injects JS prior to page scripts to eliminate navigator.webdriver and mock chrome.',
    defaultParams: {
      source: "Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); window.chrome = { runtime: {} };",
    },
  },
  {
    name: 'User-Agent & Platform Override',
    domain: 'Network',
    method: 'Network.setUserAgentOverride',
    description: 'Overrides HTTP User-Agent and Client Hints without restarting Chromium.',
    defaultParams: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      acceptLanguage: 'en-US,en;q=0.9',
      platform: 'Win32',
    },
  },
  {
    name: 'Query Isolated Origin Cookies',
    domain: 'Storage',
    method: 'Storage.getCookies',
    description: 'Reads cookies isolated to the current browser context partition.',
    defaultParams: {},
  },
  {
    name: 'Timezone Emulation Override',
    domain: 'Emulation',
    method: 'Emulation.setTimezoneOverride',
    description: 'Overrides Intl and Date timezone APIs at the V8 engine level.',
    defaultParams: {
      timezoneId: 'America/New_York',
    },
  },
];

export const CDPInspector: React.FC = () => {
  const [logs, setLogs] = useState<CDPLogEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<CDPPreset>(CDP_PRESETS[0]);
  const [method, setMethod] = useState(CDP_PRESETS[0].method);
  const [domain, setDomain] = useState<string>(CDP_PRESETS[0].domain);
  const [paramsText, setParamsText] = useState(JSON.stringify(CDP_PRESETS[0].defaultParams, null, 2));
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/cdp/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch CDP logs:', e);
    }
  };

  const handleApplyPreset = (preset: CDPPreset) => {
    setSelectedPreset(preset);
    setDomain(preset.domain);
    setMethod(preset.method);
    setParamsText(JSON.stringify(preset.defaultParams, null, 2));
  };

  const handleExecuteCommand = async () => {
    setIsExecuting(true);
    setLastResponse(null);

    let parsedParams = {};
    try {
      parsedParams = paramsText.trim() ? JSON.parse(paramsText) : {};
    } catch (e) {
      alert('Invalid JSON in parameters field');
      setIsExecuting(false);
      return;
    }

    try {
      const res = await fetch('/api/cdp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          method,
          params: parsedParams,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLastResponse(data.result);
        fetchLogs();
      }
    } catch (e) {
      console.error('CDP execution failed:', e);
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterDomain === 'all') return true;
    return log.domain.toLowerCase() === filterDomain.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
          Chrome DevTools Protocol (CDP) Console &amp; Inspector
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Direct low-level socket control over Chromium internals: intercept 407 proxy challenges, inject stealth hooks prior to page execution, and audit storage partitions.
        </p>
      </div>

      {/* Main Grid: Command Dispatcher (Left) & Live CDP Event Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Command Synthesizer & Presets */}
        <div className="lg:col-span-5 space-y-4">
          {/* Preset Buttons */}
          <div className="p-4 rounded-lg border border-slate-800 bg-[#0e1422] space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Production CDP Recipes
            </span>

            <div className="space-y-1.5">
              {CDP_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className={`w-full text-left p-2.5 rounded transition-colors text-xs ${
                    selectedPreset.name === preset.name
                      ? 'bg-slate-800 border border-emerald-500/40 text-slate-100'
                      : 'bg-[#090d16] border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-emerald-400">{preset.method}</span>
                    <span className="text-[10px] text-slate-400">{preset.domain}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Command Dispatcher Editor */}
          <div className="p-4 rounded-lg border border-slate-800 bg-[#0e1422] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Command Dispatcher
              </span>
              <span className="text-[11px] font-mono text-emerald-400">WebSocket JSON-RPC</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Method</label>
                <input
                  type="text"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Parameters (JSON)</label>
              <textarea
                rows={5}
                value={paramsText}
                onChange={(e) => setParamsText(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleExecuteCommand}
              disabled={isExecuting}
              className="w-full py-2 px-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isExecuting ? 'Sending Command...' : 'Execute CDP Command'}</span>
            </button>

            {lastResponse && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono">
                <div className="text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800">
                  <span>Target Response:</span>
                  <span className="text-emerald-400">200 OK</span>
                </div>
                <pre className="mt-2 text-slate-300 overflow-x-auto whitespace-pre max-h-36">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live CDP Protocol Event Stream */}
        <div className="lg:col-span-7 p-4 rounded-lg border border-slate-800 bg-[#0e1422] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">Live CDP Protocol Event Stream</h3>
              </div>

              {/* Domain Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 focus:outline-none"
                >
                  <option value="all">All Domains</option>
                  <option value="fetch">Fetch</option>
                  <option value="network">Network</option>
                  <option value="page">Page</option>
                  <option value="storage">Storage</option>
                  <option value="target">Target</option>
                </select>
                <button
                  onClick={fetchLogs}
                  title="Refresh Logs"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Event List */}
            <div className="mt-3 space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-[#090d16] border border-slate-800 text-xs font-mono space-y-1 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          log.type === 'event'
                            ? 'text-cyan-400'
                            : log.type === 'command'
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }`}
                      >
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-slate-200 font-bold">{log.method}</span>
                    </div>
                    <span className="text-slate-400 tabular-nums text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {log.params && Object.keys(log.params).length > 0 && (
                    <div className="text-[11px] text-slate-400 bg-slate-950 p-1.5 rounded overflow-x-auto">
                      <span className="text-slate-400">params: </span>
                      <span className="text-slate-300">{JSON.stringify(log.params)}</span>
                    </div>
                  )}

                  {log.result && Object.keys(log.result).length > 0 && (
                    <div className="text-[11px] text-emerald-400/90 bg-slate-950 p-1.5 rounded overflow-x-auto">
                      <span className="text-slate-400">result: </span>
                      <span>{JSON.stringify(log.result)}</span>
                    </div>
                  )}
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No CDP events recorded for selected filter.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Total Logged Frames: {logs.length}</span>
            <span className="text-emerald-400">Target Session Flat: true</span>
          </div>
        </div>
      </div>
    </div>
  );
};
