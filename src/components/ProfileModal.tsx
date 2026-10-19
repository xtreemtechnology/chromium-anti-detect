import React, { useState, useEffect } from 'react';
import { BrowserProfile, ProxyAuthMethod, ProxyProtocol } from '../automation/types';
import { X, HardDrive, Globe, Sliders, ShieldCheck } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: Partial<BrowserProfile>) => void;
  initialProfile?: BrowserProfile | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProfile,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPersistent, setIsPersistent] = useState(true);
  const [userDataDir, setUserDataDir] = useState('');
  const [diskCacheDir, setDiskCacheDir] = useState('');

  // Proxy state
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyProtocol, setProxyProtocol] = useState<ProxyProtocol>('http');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState(10080);
  const [proxyUser, setProxyUser] = useState('');
  const [proxyPass, setProxyPass] = useState('');
  const [proxyAuthMethod, setProxyAuthMethod] = useState<ProxyAuthMethod>('loopback_tunnel');
  const [proxyBypass, setProxyBypass] = useState('127.0.0.1,localhost');

  // Fingerprint state
  const [userAgent, setUserAgent] = useState('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  const [viewportWidth, setViewportWidth] = useState(1920);
  const [viewportHeight, setViewportHeight] = useState(1080);
  const [timezoneId, setTimezoneId] = useState('America/New_York');
  const [locale, setLocale] = useState('en-US');
  const [webglVendor, setWebglVendor] = useState('Google Inc. (NVIDIA)');
  const [webglRenderer, setWebglRenderer] = useState('ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)');
  const [maskWebDriver, setMaskWebDriver] = useState(true);
  const [noiseCanvas, setNoiseCanvas] = useState(true);
  const [noiseAudio, setNoiseAudio] = useState(true);

  const [activeTab, setActiveTab] = useState<'storage' | 'proxy' | 'fingerprint'>('storage');

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setDescription(initialProfile.description);
      setIsPersistent(initialProfile.isPersistent);
      setUserDataDir(initialProfile.userDataDir);
      setDiskCacheDir(initialProfile.diskCacheDir);

      setProxyEnabled(initialProfile.proxy.enabled);
      setProxyProtocol(initialProfile.proxy.protocol);
      setProxyHost(initialProfile.proxy.host);
      setProxyPort(initialProfile.proxy.port);
      setProxyUser(initialProfile.proxy.username || '');
      setProxyPass(initialProfile.proxy.password || '');
      setProxyAuthMethod(initialProfile.proxy.authMethod);
      setProxyBypass(initialProfile.proxy.bypassList?.join(',') || '127.0.0.1,localhost');

      setUserAgent(initialProfile.fingerprint.userAgent);
      setViewportWidth(initialProfile.fingerprint.viewportWidth);
      setViewportHeight(initialProfile.fingerprint.viewportHeight);
      setTimezoneId(initialProfile.fingerprint.timezoneId);
      setLocale(initialProfile.fingerprint.locale);
      setWebglVendor(initialProfile.fingerprint.webglVendor);
      setWebglRenderer(initialProfile.fingerprint.webglRenderer);
      setMaskWebDriver(initialProfile.fingerprint.maskWebDriver);
      setNoiseCanvas(initialProfile.fingerprint.noiseCanvas);
      setNoiseAudio(initialProfile.fingerprint.noiseAudio);
    } else {
      const randomId = Math.random().toString(36).substring(2, 7);
      setName('New Isolated Chromium Node');
      setDescription('Dedicated browser profile with segregated filesystem storage.');
      setIsPersistent(true);
      setUserDataDir(`/var/automation/profiles/prof-${randomId}/user_data`);
      setDiskCacheDir(`/var/automation/profiles/prof-${randomId}/cache_data`);
      setProxyEnabled(false);
      setProxyProtocol('http');
      setProxyHost('');
      setProxyPort(8080);
      setProxyUser('');
      setProxyPass('');
      setProxyAuthMethod('loopback_tunnel');
      setProxyBypass('127.0.0.1,localhost');
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(initialProfile ? { id: initialProfile.id } : {}),
      name,
      description,
      isPersistent,
      userDataDir,
      diskCacheDir,
      proxy: {
        enabled: proxyEnabled,
        protocol: proxyProtocol,
        host: proxyHost,
        port: proxyPort,
        username: proxyUser,
        password: proxyPass,
        authMethod: proxyAuthMethod,
        bypassList: proxyBypass.split(',').map((s) => s.trim()).filter(Boolean),
        testStatus: initialProfile?.proxy.testStatus || 'idle',
      },
      fingerprint: {
        userAgent,
        viewportWidth,
        viewportHeight,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        timezoneId,
        locale,
        languages: [locale, 'en-US', 'en'],
        webglVendor,
        webglRenderer,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        maskWebDriver,
        noiseCanvas,
        noiseAudio,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0e1422] border border-slate-800 rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">
              {initialProfile ? 'Edit Profile Configuration' : 'Create Isolated Browser Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 pt-3 flex items-center gap-4 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'storage'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            Filesystem &amp; State Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('proxy')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'proxy'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            Proxy &amp; Authentication
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fingerprint')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'fingerprint'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            Fingerprint &amp; Stealth
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Profile Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-md bg-slate-900 border border-slate-800">
                <span className="block text-slate-300 font-medium mb-2">Storage Retention Policy</span>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded border cursor-pointer transition-colors ${
                    isPersistent ? 'bg-emerald-950/20 border-emerald-500/50 text-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="policy"
                      checked={isPersistent}
                      onChange={() => setIsPersistent(true)}
                      className="sr-only"
                    />
                    <div className="font-semibold text-emerald-400">Persistent Profile</div>
                    <div className="text-[11px] text-slate-400 mt-1">Keeps cookies, leveldb, and cache preserved between test sessions.</div>
                  </label>

                  <label className={`p-3 rounded border cursor-pointer transition-colors ${
                    !isPersistent ? 'bg-amber-950/20 border-amber-500/50 text-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="policy"
                      checked={!isPersistent}
                      onChange={() => setIsPersistent(false)}
                      className="sr-only"
                    />
                    <div className="font-semibold text-amber-400">Ephemeral Sandbox</div>
                    <div className="text-[11px] text-slate-400 mt-1">Creates temporary dir and purges all traces on process exit.</div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  User Data Directory (<code className="text-emerald-400">--user-data-dir</code>)
                </label>
                <input
                  type="text"
                  required
                  value={userDataDir}
                  onChange={(e) => setUserDataDir(e.target.value)}
                  className="w-full font-mono text-[11px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Absolute path on disk where Chromium stores Cookies (SQLite), LocalStorage (LevelDB), and session state.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Disk Cache Directory (<code className="text-emerald-400">--disk-cache-dir</code>)
                </label>
                <input
                  type="text"
                  value={diskCacheDir}
                  onChange={(e) => setDiskCacheDir(e.target.value)}
                  className="w-full font-mono text-[11px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Segregates HTTP cache from the core user-data-dir to prevent profile bloating.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'proxy' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md bg-slate-900 border border-slate-800">
                <div>
                  <span className="font-medium text-slate-200">Enable Per-Profile Proxy</span>
                  <p className="text-[11px] text-slate-400">Routes all Chromium socket and HTTP traffic through a dedicated gateway.</p>
                </div>
                <input
                  type="checkbox"
                  checked={proxyEnabled}
                  onChange={(e) => setProxyEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
              </div>

              {proxyEnabled && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Protocol</label>
                      <select
                        value={proxyProtocol}
                        onChange={(e) => setProxyProtocol(e.target.value as ProxyProtocol)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                        <option value="socks5">SOCKS5</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-slate-300 font-medium mb-1">Upstream Host</label>
                      <input
                        type="text"
                        placeholder="e.g. res-us.proxyprovider.com"
                        value={proxyHost}
                        onChange={(e) => setProxyHost(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Port</label>
                      <input
                        type="number"
                        value={proxyPort}
                        onChange={(e) => setProxyPort(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Username</label>
                      <input
                        type="text"
                        value={proxyUser}
                        onChange={(e) => setProxyUser(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Password</label>
                      <input
                        type="password"
                        value={proxyPass}
                        onChange={(e) => setProxyPass(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Authentication Injection Method</label>
                    <select
                      value={proxyAuthMethod}
                      onChange={(e) => setProxyAuthMethod(e.target.value as ProxyAuthMethod)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="loopback_tunnel">Loopback Proxy Tunnel (Recommended for All Frameworks)</option>
                      <option value="cdp_fetch">CDP Fetch.authRequired Event Handler</option>
                      <option value="native_context">Playwright Native Context Auth</option>
                      <option value="page_auth">Puppeteer page.authenticate()</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Chromium ignores user:pass in --proxy-server flags. The selected method transparently injects credentials.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Bypass List (Comma-separated)</label>
                    <input
                      type="text"
                      value={proxyBypass}
                      onChange={(e) => setProxyBypass(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'fingerprint' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">User-Agent</label>
                <textarea
                  rows={2}
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  className="w-full font-mono text-[11px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Viewport Width</label>
                  <input
                    type="number"
                    value={viewportWidth}
                    onChange={(e) => setViewportWidth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Viewport Height</label>
                  <input
                    type="number"
                    value={viewportHeight}
                    onChange={(e) => setViewportHeight(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Timezone ID</label>
                  <input
                    type="text"
                    value={timezoneId}
                    onChange={(e) => setTimezoneId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Locale</label>
                  <input
                    type="text"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">WebGL Renderer String</label>
                <input
                  type="text"
                  value={webglRenderer}
                  onChange={(e) => setWebglRenderer(e.target.value)}
                  className="w-full font-mono text-[11px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-2">
                <span className="block text-slate-300 font-medium mb-1">Anti-Detection Evasions</span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maskWebDriver}
                    onChange={(e) => setMaskWebDriver(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-slate-300">
                    Mask <code className="text-emerald-400">navigator.webdriver</code> and inject Chrome runtime mock
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noiseCanvas}
                    onChange={(e) => setNoiseCanvas(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-slate-300">Inject subtle Canvas hash pixel randomization</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noiseAudio}
                    onChange={(e) => setNoiseAudio(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-slate-300">Randomize AudioContext dynamics compressor values</span>
                </label>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
            >
              {initialProfile ? 'Update Profile' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
