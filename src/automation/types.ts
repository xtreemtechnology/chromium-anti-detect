/**
 * Production-grade Chromium, Electron & CDP Automation Types
 * Strictly typed interfaces for isolated filesystem storage, per-profile proxy authentication,
 * CDP domains, and browser context orchestration.
 */

export type BrowserEngine = 'chromium' | 'electron';
export type AutomationFramework = 'playwright_ts' | 'puppeteer_ts' | 'playwright_python';

export type ProxyProtocol = 'http' | 'https' | 'socks5';
export type ProxyAuthMethod = 'loopback_tunnel' | 'cdp_fetch' | 'native_context' | 'page_auth';

export interface ProxyConfig {
  enabled: boolean;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  bypassList?: string[];
  authMethod: ProxyAuthMethod;
  testStatus?: 'idle' | 'testing' | 'verified' | 'failed';
  lastLatencyMs?: number;
  exitIp?: string;
  countryCode?: string;
}

export interface FingerprintConfig {
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  timezoneId: string;
  locale: string;
  languages: string[];
  webglVendor: string;
  webglRenderer: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  maskWebDriver: boolean;
  noiseCanvas: boolean;
  noiseAudio: boolean;
}

export interface StorageBucketItem {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  fileCount: number;
  description: string;
  criticalForSession: boolean;
  safeToPurge: boolean;
  category: 'network' | 'storage' | 'cache' | 'metadata';
}

export interface BrowserProfile {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isPersistent: boolean; // true = keep --user-data-dir across sessions; false = ephemeral cleanup
  userDataDir: string;
  diskCacheDir: string;
  profileDirectory: string; // e.g. "Default" or "Profile 1"
  proxy: ProxyConfig;
  fingerprint: FingerprintConfig;
  extraFlags: string[];
  storageBuckets: StorageBucketItem[];
  totalSizeBytes: number;
  activeSessionsCount: number;
  lastUsedAt?: string;
}

export interface CDPAuthChallenge {
  requestId: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  frameId: string;
  resourceType: string;
  authChallenge: {
    source: 'Server' | 'Proxy';
    origin: string;
    scheme: string;
    realm: string;
  };
}

export interface CDPLogEntry {
  id: string;
  timestamp: number;
  domain: 'Fetch' | 'Network' | 'Page' | 'Storage' | 'Target' | 'Browser' | 'Emulation';
  type: 'command' | 'event' | 'response' | 'error';
  method: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  profileId?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  action:
    | 'launch_context'
    | 'intercept_proxy_auth'
    | 'inject_stealth_scripts'
    | 'navigate'
    | 'evaluate_fingerprint'
    | 'set_isolated_cookies'
    | 'extract_dom'
    | 'purge_cache'
    | 'teardown';
  targetUrl?: string;
  scriptSnippet?: string;
  expectedOutcome: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  durationMs?: number;
  logOutput?: string[];
}

export interface AutomationExecutionRun {
  runId: string;
  profileId: string;
  framework: AutomationFramework;
  startedAt: number;
  completedAt?: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  steps: WorkflowStep[];
  detectedIp?: string;
  detectedUserAgent?: string;
  storageIsolationVerified: boolean;
  proxyAuthSuccessful: boolean;
  cdpEventsCount: number;
  consoleLogs: Array<{ level: 'info' | 'warn' | 'error' | 'cdp'; message: string; timestamp: number }>;
}
