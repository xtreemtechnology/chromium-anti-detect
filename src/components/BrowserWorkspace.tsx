import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Keyboard,
  LockKeyhole,
  MoreHorizontal,
  Play,
  RefreshCw,
  Settings2,
  SquareArrowOutUpRight,
  MousePointer2,
  Zap,
} from 'lucide-react';
import { BrowserProfile } from '../automation/types';
import { apiFetch } from '../api';

interface BrowserWorkspaceProps {
  profiles: BrowserProfile[];
  selectedProfileId?: string;
  onSelectProfile: (profileId: string) => void;
  onEditProfile: (profile: BrowserProfile) => void;
  onOpenTools: () => void;
}

export const BrowserWorkspace: React.FC<BrowserWorkspaceProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onEditProfile,
  onOpenTools,
}) => {
  const [address, setAddress] = useState('https://example.com');
  const [pageUrl, setPageUrl] = useState('https://example.com');
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionImage, setSessionImage] = useState<string | null>(null);
  const [selector, setSelector] = useState('');
  const [inputText, setInputText] = useState('');
  const [key, setKey] = useState('Enter');
  const [actionBusy, setActionBusy] = useState(false);
  const [runStatus, setRunStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId)
    || profiles.find((profile) => !profile.proxy.enabled)
    || profiles[0];

  const refreshScreenshot = async (id: string) => {
    const response = await apiFetch(`/api/sessions/${id}/screenshot`);
    if (!response.ok) return;
    const data = await response.json();
    setSessionImage(data.data.image);
  };

  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    const streamFrames = async () => {
      const response = await apiFetch(`/api/sessions/${sessionId}/screencast`, { signal: controller.signal });
      if (!response.ok || !response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const event of events) {
          const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
          if (dataLine) setSessionImage(JSON.parse(dataLine.slice(6)).image);
        }
      }
    };
    streamFrames().catch(() => undefined);
    return () => {
      controller.abort();
    };
  }, [sessionId]);

  const navigate = async (event?: React.FormEvent) => {
    event?.preventDefault();
    try {
      const parsed = new URL(address.includes('://') ? address : `https://${address}`);
      if (!['http:', 'https:'].includes(parsed.protocol)) return;
      setAddress(parsed.toString());
      if (sessionId) {
        const response = await apiFetch(`/api/sessions/${sessionId}/navigate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUrl: parsed.toString() }),
        });
        if (!response.ok) throw new Error('Navigation failed');
        await refreshScreenshot(sessionId);
      } else {
        await startSession(parsed.toString());
      }
      setPageUrl(parsed.toString());
    } catch {
      setRunStatus('error');
    }
  };

  const sessionAction = async (endpoint: string, body?: Record<string, unknown>) => {
    if (!sessionId) return;
    setActionBusy(true);
    try {
      const response = await apiFetch(`/api/sessions/${sessionId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      if (!response.ok) throw new Error('Browser action failed');
      await refreshScreenshot(sessionId);
      setRunStatus('ready');
    } catch {
      setRunStatus('error');
    } finally {
      setActionBusy(false);
    }
  };

  const clickScreenshot = async (event: React.MouseEvent<HTMLImageElement>) => {
    if (!sessionId || !sessionImage) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (event.currentTarget.naturalWidth / bounds.width);
    const y = (event.clientY - bounds.top) * (event.currentTarget.naturalHeight / bounds.height);
    await sessionAction('click-at', { x: Math.round(x), y: Math.round(y) });
  };

  const startSession = async (targetUrl: string) => {
    if (!selectedProfile) return;
    setIsRunning(true);
    setRunStatus('idle');
    try {
      const response = await apiFetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedProfile.id, targetUrl }),
      });
      if (!response.ok) throw new Error('Session failed');
      const data = await response.json();
      setSessionId(data.data.sessionId);
      const screenshot = await apiFetch(`/api/sessions/${data.data.sessionId}/screenshot`);
      if (screenshot.ok) setSessionImage((await screenshot.json()).data.image);
      setRunStatus('ready');
    } catch {
      setRunStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  const runProfile = async () => startSession(pageUrl);

  const stopProfile = async () => {
    if (!sessionId) return;
    await apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    setSessionId(null);
    setSessionImage(null);
    setRunStatus('idle');
  };

  if (!selectedProfile) {
    return <div className="workspace-empty">Create a profile to open a browser workspace.</div>;
  }

  return (
    <section className="workspace-shell" aria-label="Browser workspace">
      <div className="workspace-tabs">
        <div className="workspace-tab workspace-tab-active">
          <Globe2 size={14} />
          <span>{selectedProfile.name}</span>
          <button type="button" aria-label="Close browser tab" title="Close tab"><span aria-hidden="true">×</span></button>
        </div>
        <button type="button" className="workspace-new-tab" aria-label="Open new tab" title="New tab">+</button>
      </div>

      <div className="workspace-toolbar">
        <div className="workspace-nav-controls" aria-label="Browser navigation">
          <button type="button" aria-label="Go back" title="Back"><ArrowLeft size={16} /></button>
          <button type="button" aria-label="Go forward" title="Forward"><ArrowRight size={16} /></button>
          <button type="button" aria-label="Reload page" title="Reload" onClick={() => sessionAction('reload')} disabled={actionBusy}><RefreshCw size={15} /></button>
        </div>
        <form className="workspace-address" onSubmit={navigate}>
          <LockKeyhole size={13} />
          <input aria-label="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
          <button type="submit" aria-label="Navigate" title="Navigate"><ArrowRight size={15} /></button>
        </form>
        <button type="button" className="workspace-icon-button" aria-label="More browser actions" title="More actions"><MoreHorizontal size={18} /></button>
      </div>

      <div className="workspace-body">
        <div className="workspace-browser-stage">
          <div className="workspace-stage-label">
            <span><span className="status-dot status-dot-live" /> Live preview</span>
            <span className="font-mono">{new URL(pageUrl).hostname}</span>
          </div>
          {sessionImage ? (
            <img className="workspace-page workspace-page-image" src={sessionImage} alt="Live browser session" onClick={clickScreenshot} title="Click to interact with the live browser" />
          ) : (
            <iframe key={pageUrl} className="workspace-page" title="Browser page preview" src={pageUrl} />
          )}
        </div>

        <aside className="workspace-inspector">
          <div className="workspace-inspector-header">
            <div><span className="eyebrow">Active profile</span><h1>{selectedProfile.name}</h1></div>
            <button type="button" className="workspace-icon-button" onClick={() => onEditProfile(selectedProfile)} aria-label="Edit active profile" title="Edit profile"><Settings2 size={16} /></button>
          </div>

          <label className="workspace-field-label" htmlFor="profile-select">Session profile</label>
          <select id="profile-select" className="workspace-select" value={selectedProfile.id} onChange={(event) => onSelectProfile(event.target.value)}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>

          <div className="workspace-profile-state">
            <div className="workspace-state-icon"><CheckCircle2 size={16} /></div>
            <div><strong>{selectedProfile.isPersistent ? 'Persistent session' : 'Ephemeral session'}</strong><span>{selectedProfile.proxy.enabled ? `${selectedProfile.proxy.countryCode || 'Proxy'} route active` : 'Direct connection'}</span></div>
          </div>

          <div className="workspace-metrics">
            <div><span>Locale</span><strong>{selectedProfile.fingerprint.locale}</strong></div>
            <div><span>Timezone</span><strong>{selectedProfile.fingerprint.timezoneId}</strong></div>
            <div><span>Viewport</span><strong>{selectedProfile.fingerprint.viewportWidth} × {selectedProfile.fingerprint.viewportHeight}</strong></div>
            <div><span>WebGL</span><strong>{selectedProfile.fingerprint.webglVendor}</strong></div>
          </div>

          <div className="workspace-interaction">
            <div className="workspace-control-heading"><MousePointer2 size={13} /> Page controls</div>
            <input className="workspace-control-input" aria-label="CSS selector" placeholder="CSS selector for input" value={selector} onChange={(event) => setSelector(event.target.value)} />
            <div className="workspace-control-row">
              <input className="workspace-control-input" aria-label="Text to enter" placeholder="Text to enter" value={inputText} onChange={(event) => setInputText(event.target.value)} />
              <button type="button" className="workspace-control-button" onClick={() => sessionAction('type', { selector, text: inputText })} disabled={!sessionId || !selector || actionBusy}>Type</button>
            </div>
            <div className="workspace-control-row">
              <input className="workspace-control-input" aria-label="Keyboard key" value={key} onChange={(event) => setKey(event.target.value)} />
              <button type="button" className="workspace-control-button" onClick={() => sessionAction('press', { key })} disabled={!sessionId || !key || actionBusy}><Keyboard size={13} /> Press</button>
            </div>
            <div className="workspace-control-row">
              <button type="button" className="workspace-control-button" onClick={() => sessionAction('scroll', { deltaY: -600 })} disabled={!sessionId || actionBusy}>Scroll up</button>
              <button type="button" className="workspace-control-button" onClick={() => sessionAction('scroll', { deltaY: 600 })} disabled={!sessionId || actionBusy}>Scroll down</button>
            </div>
          </div>

          {sessionId ? (
            <button type="button" className="workspace-stop-button" onClick={stopProfile}><span aria-hidden="true">■</span> Stop profile session</button>
          ) : (
            <button type="button" className="workspace-run-button" onClick={runProfile} disabled={isRunning}><Play size={15} fill="currentColor" />{isRunning ? 'Launching profile...' : 'Launch this profile'}</button>
          )}
          <button type="button" className="workspace-tools-button" onClick={onOpenTools}><Zap size={15} />Open engineering tools</button>

          {runStatus !== 'idle' && <p className={`workspace-run-status ${runStatus === 'ready' ? 'workspace-run-status-ready' : 'workspace-run-status-error'}`}>{runStatus === 'ready' ? 'Profile workflow completed.' : 'Workflow could not be completed.'}</p>}

          <div className="workspace-inspector-footer"><SquareArrowOutUpRight size={13} /><span>Runtime telemetry appears in Engineering Tools</span><ExternalLink size={13} /></div>
        </aside>
      </div>
    </section>
  );
};