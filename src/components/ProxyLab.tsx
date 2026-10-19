import React, { useState } from 'react';
import { ProxyConfig, ProxyProtocol, ProxyAuthMethod } from '../automation/types';
import { ProxyTunnelManager } from '../automation/ProxyTunnelManager';
import {
  Globe,
  Terminal,
  ShieldCheck,
  Check,
  Copy,
  AlertTriangle,
  ArrowRight,
  Server,
  Zap,
  Lock,
  Layers
} from 'lucide-react';

export const ProxyLab: React.FC = () => {
  const [testProtocol, setTestProtocol] = useState<ProxyProtocol>('http');
  const [testHost, setTestHost] = useState('res-us-pool.brightproxy.net');
  const [testPort, setTestPort] = useState(10080);
  const [testUser, setTestUser] = useState('res_bot_corp_7491');
  const [testPass, setTestPass] = useState('secret_token_8891');
  const [testAuthMethod, setTestAuthMethod] = useState<ProxyAuthMethod>('loopback_tunnel');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    exitIp?: string;
    countryCode?: string;
    details: string;
  } | null>(null);

  const [activeSnippetTab, setActiveSnippetTab] = useState<'tunnel' | 'cdp'>('tunnel');
  const [copied, setCopied] = useState(false);

  const handleTestProxy = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/proxy/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          protocol: testProtocol,
          host: testHost,
          port: testPort,
          username: testUser,
          password: testPass,
          authMethod: testAuthMethod,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        latencyMs: 0,
        details: err instanceof Error ? err.message : 'Network test error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const dummyConfig: ProxyConfig = {
    enabled: true,
    protocol: testProtocol,
    host: testHost,
    port: testPort,
    username: testUser,
    password: testPass,
    authMethod: testAuthMethod,
  };

  const codeSnippet =
    activeSnippetTab === 'tunnel'
      ? ProxyTunnelManager.generateLoopbackTunnelSnippet(dummyConfig, 24001)
      : ProxyTunnelManager.generateCDPAuthHandlerSnippet(dummyConfig);

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const base64AuthHeader = btoa(`${testUser}:${testPass}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
          Per-Profile Proxy Authentication &amp; Tunneling Lab
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Chromium rejects inline credentials in <code className="text-emerald-400 font-mono">--proxy-server</code>.
          Here we engineer isolated proxy tunnels and CDP authentication hooks to ensure zero headless hangs and strict profile routing.
        </p>
      </div>

      {/* Architectural Flow Diagram */}
      <div className="p-5 rounded-lg border border-slate-800 bg-[#0e1422] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Proxy Authentication Pipeline Architecture
          </span>
          <span className="text-[11px] font-mono text-emerald-400">Transparent Basic Auth Injection</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center text-xs">
          {/* Node 1: Chromium Context */}
          <div className="p-3.5 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Chromium Profile</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              --proxy-server=127.0.0.1:24001
            </div>
            <div className="text-[10px] text-slate-400">
              No credentials exposed to browser DOM or client JS.
            </div>
          </div>

          {/* Node 2: Tunnel Forwarder */}
          <div className="p-3.5 rounded bg-[#090d16] border border-emerald-500/30 space-y-1.5 relative">
            <div className="flex items-center gap-2 text-emerald-300 font-medium">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Loopback / CDP Interceptor</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              Injects Proxy-Authorization
            </div>
            <div className="text-[10px] text-slate-400">
              Catches 407 challenge or prepends Basic Auth header.
            </div>
          </div>

          {/* Node 3: Upstream Authenticated Proxy */}
          <div className="p-3.5 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Upstream Proxy</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              {testHost}:{testPort}
            </div>
            <div className="text-[10px] text-slate-400">
              Validates credentials, binds dedicated exit IP.
            </div>
          </div>

          {/* Node 4: Target Web Destination */}
          <div className="p-3.5 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Target Web Destination</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Remote Host (HTTPS)
            </div>
            <div className="text-[10px] text-slate-400">
              End-to-end TLS payload encrypted via CONNECT pipe.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Proxy Diagnostics and Code Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive Diagnostic Tool */}
        <div className="p-5 rounded-lg border border-slate-800 bg-[#0e1422] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Upstream Proxy Diagnostic Tester</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Live Handshake Verifier</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Protocol</label>
                <select
                  value={testProtocol}
                  onChange={(e) => setTestProtocol(e.target.value as ProxyProtocol)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Host</label>
                <input
                  type="text"
                  value={testHost}
                  onChange={(e) => setTestHost(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Port</label>
                <input
                  type="number"
                  value={testPort}
                  onChange={(e) => setTestPort(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  value={testUser}
                  onChange={(e) => setTestUser(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={testPass}
                  onChange={(e) => setTestPass(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Generated Header Inspection */}
            <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1 font-mono text-[11px]">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Synthesized Authentication Header:</span>
                <span className="text-[10px] text-slate-400">RFC 7617</span>
              </div>
              <div className="text-emerald-400 break-all select-all">
                Proxy-Authorization: Basic {base64AuthHeader}
              </div>
            </div>

            <button
              onClick={handleTestProxy}
              disabled={isTesting}
              className="w-full py-2 px-4 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Testing Connection & Latency...' : 'Verify Proxy Authentication & Latency'}</span>
            </button>

            {/* Test Result Box */}
            {testResult && (
              <div
                className={`p-3.5 rounded border text-xs font-mono ${
                  testResult.success
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/20 border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{testResult.success ? 'Proxy Verification Successful' : 'Connection Failed'}</span>
                  {testResult.success && (
                    <span className="tabular-nums text-emerald-400">{testResult.latencyMs}ms RTT</span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-300">{testResult.details}</p>
                {testResult.exitIp && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-4 text-[11px] text-slate-400">
                    <span>Exit IP: <strong className="text-slate-200 font-mono">{testResult.exitIp}</strong></span>
                    <span>Country: <strong className="text-slate-200 font-mono">{testResult.countryCode || 'US'}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Production Code Snippet Generator */}
        <div className="p-5 rounded-lg border border-slate-800 bg-[#0e1422] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSnippetTab('tunnel')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeSnippetTab === 'tunnel'
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Loopback Tunnel (Node.js)
                </button>
                <button
                  onClick={() => setActiveSnippetTab('cdp')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeSnippetTab === 'cdp'
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CDP Fetch.authRequired Hook
                </button>
              </div>

              <button
                onClick={copyCode}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="mt-3 p-3.5 rounded bg-[#070a10] border border-slate-800/80 overflow-x-auto max-h-[380px]">
              <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre">
                {codeSnippet}
              </pre>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Zero external dependencies (pure Node.js http/net &amp; CDP).</span>
            <span className="font-mono text-emerald-400">Strict Context Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
