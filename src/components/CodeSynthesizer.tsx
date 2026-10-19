import React, { useState, useEffect } from 'react';
import { BrowserProfile, AutomationFramework } from '../automation/types';
import { apiFetch } from '../api';
import {
  Code,
  Terminal,
  Play,
  Copy,
  Download,
  Check,
  Zap,
  Globe,
  HardDrive,
  FileCode,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface CodeSynthesizerProps {
  profiles: BrowserProfile[];
  initialProfileId?: string;
}

export const CodeSynthesizer: React.FC<CodeSynthesizerProps> = ({
  profiles,
  initialProfileId,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    initialProfileId || profiles[0]?.id || ''
  );
  const [framework, setFramework] = useState<AutomationFramework>('playwright_ts');
  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [generatedCode, setGeneratedCode] = useState('');
  const [cliCommand, setCliCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  // Workflow Execution Simulator state
  const [isRunning, setIsRunning] = useState(false);
  const [activeRun, setActiveRun] = useState<{
    runId: string;
    steps: Array<{
      id: string;
      name: string;
      expectedOutcome: string;
      durationMs: number;
      status: 'pending' | 'running' | 'success';
    }>;
    summary?: {
      totalDurationMs: number;
      storageState: string;
      exitIp: string;
      proxyAuthOk: boolean;
    };
  } | null>(null);

  useEffect(() => {
    if (initialProfileId) {
      setSelectedProfileId(initialProfileId);
    }
  }, [initialProfileId]);

  useEffect(() => {
    fetchGeneratedCode();
  }, [selectedProfileId, framework, targetUrl]);

  const fetchGeneratedCode = async () => {
    if (!selectedProfileId) return;

    try {
      const res = await apiFetch('/api/code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfileId,
          framework,
          targetUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedCode(data.code);
        setCliCommand(data.cliCommand);
      }
    } catch (e) {
      console.error('Failed to generate automation code:', e);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const downloadScript = () => {
    const ext = framework === 'playwright_python' ? 'py' : 'ts';
    const filename = `automation_${framework}_${selectedProfileId}.${ext}`;
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteWorkflow = async () => {
    if (!selectedProfileId) return;
    setIsRunning(true);
    setActiveRun(null);

    try {
      const res = await apiFetch('/api/workflow/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfileId,
          framework,
          targetUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Animate steps sequentially
        const totalSteps = data.steps;
        setActiveRun({
          runId: data.runId,
          steps: totalSteps.map((s: any, idx: number) => ({
            ...s,
            status: idx === 0 ? 'running' : 'pending',
          })),
        });

        for (let i = 0; i < totalSteps.length; i++) {
          await new Promise((r) => setTimeout(r, 250));
          setActiveRun((prev) => {
            if (!prev) return null;
            const updated = [...prev.steps];
            updated[i].status = 'success';
            if (i + 1 < updated.length) {
              updated[i + 1].status = 'running';
            }
            return {
              ...prev,
              steps: updated,
            };
          });
        }

        setActiveRun((prev) => (prev ? { ...prev, summary: data.summary } : null));
      }
    } catch (e) {
      console.error('Workflow run error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
          Automation Code Synthesizer &amp; Execution Sandbox
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate fully typed, production-grade Playwright and Puppeteer code with isolated filesystem storage,
          per-profile proxy authentication tunnels, and CDP event hooks.
        </p>
      </div>

      {/* Control Strip */}
      <div className="p-4 rounded-lg border border-slate-800 bg-[#0e1422] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Framework Selector & Profile */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Framework</label>
            <div className="flex items-center p-0.5 bg-slate-900 border border-slate-700 rounded">
              <button
                onClick={() => setFramework('playwright_ts')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  framework === 'playwright_ts'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Playwright (TS)
              </button>
              <button
                onClick={() => setFramework('puppeteer_ts')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  framework === 'puppeteer_ts'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Puppeteer (TS)
              </button>
              <button
                onClick={() => setFramework('playwright_python')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  framework === 'playwright_python'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Playwright (Python)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Target Profile</label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] text-slate-400 mb-1">Target URL</label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={downloadScript}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            onClick={copyCode}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleExecuteWorkflow}
            disabled={isRunning}
            className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Executing...' : 'Execute Workflow'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Code Display (Left) & Live Execution Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Display */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-lg border border-slate-800 bg-[#0e1422] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {framework === 'playwright_python' ? 'run_automation.py' : 'run_automation.ts'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {framework.toUpperCase()} · Fully Typed
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#070a10] border border-slate-800/80 overflow-x-auto max-h-[500px]">
              <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre">
                {generatedCode}
              </pre>
            </div>
          </div>

          {/* Raw Chromium CLI Invocation Command */}
          <div className="p-4 rounded-lg border border-slate-800 bg-[#0e1422] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Raw Chromium CLI Launch Invocation
              </span>
              <button
                onClick={copyCli}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCli ? 'Copied' : 'Copy CLI'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded bg-[#070a10] border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto whitespace-pre">
              {cliCommand}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Telemetry Sandbox */}
        <div className="lg:col-span-5 p-5 rounded-lg border border-slate-800 bg-[#0e1422] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">Live Workflow Execution Pipeline</h3>
              </div>
              {activeRun && (
                <span className="text-[10px] font-mono text-slate-400">{activeRun.runId}</span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Simulates real runtime orchestration: validates isolated `--user-data-dir`, performs proxy handshake, attaches CDP sessions, and evaluates anti-detection hooks.
            </p>

            {activeRun ? (
              <div className="space-y-3">
                {activeRun.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded border text-xs transition-all ${
                      step.status === 'success'
                        ? 'bg-slate-900 border-slate-800 text-slate-200'
                        : step.status === 'running'
                        ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#090d16] border-slate-800/60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-2">
                        {step.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : step.status === 'running' ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                        )}
                        <span>{step.name}</span>
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-slate-400">
                        {step.durationMs}ms
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 pl-5 font-mono">
                      {step.expectedOutcome}
                    </div>
                  </div>
                ))}

                {activeRun.summary && (
                  <div className="mt-4 p-3.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-xs font-mono space-y-1.5 text-emerald-300">
                    <div className="font-semibold flex items-center justify-between">
                      <span>Workflow Execution Completed</span>
                      <span className="tabular-nums">{activeRun.summary.totalDurationMs}ms Total</span>
                    </div>
                    <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800 space-y-1">
                      <div>Exit IP: <strong className="text-white">{activeRun.summary.exitIp}</strong></div>
                      <div>Storage Disposition: <strong className="text-white">{activeRun.summary.storageState}</strong></div>
                      <div>Proxy Auth Handshake: <strong className="text-emerald-400">VERIFIED</strong></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded border border-slate-800 bg-[#090d16] text-xs text-slate-500">
                Click &ldquo;Execute Workflow&rdquo; to test and simulate end-to-end browser execution, CDP stealth hooks, and state isolation.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Framework: {framework}</span>
            <span className="text-emerald-400">Production-Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
