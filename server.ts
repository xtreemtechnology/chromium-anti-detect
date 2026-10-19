/**
 * Production Full-Stack Server
 * Integrates Express API endpoints for browser profile management, proxy diagnostics,
 * CDP command execution, and Vite middleware integration.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalProfileManager } from './src/automation/ProfileManager';
import { globalProxyTunnelManager } from './src/automation/ProxyTunnelManager';
import { globalCDPController } from './src/automation/CDPSessionController';
import { ChromiumFlagSynthesizer } from './src/automation/ChromiumFlagSynthesizer';
import { PlaywrightOrchestrator } from './src/automation/PlaywrightOrchestrator';
import { PuppeteerOrchestrator } from './src/automation/PuppeteerOrchestrator';
import { PythonPlaywrightOrchestrator } from './src/automation/PythonPlaywrightOrchestrator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API Endpoints ---

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      engine: 'Chromium/CDP Automation Systems Engine',
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  // Profiles CRUD
  app.get('/api/profiles', (_req: Request, res: Response) => {
    const profiles = globalProfileManager.getAllProfiles();
    res.json({ success: true, data: profiles });
  });

  app.get('/api/profiles/:id', (req: Request, res: Response) => {
    const profile = globalProfileManager.getProfile(req.params.id);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }
    res.json({ success: true, data: profile });
  });

  app.post('/api/profiles', (req: Request, res: Response) => {
    const created = globalProfileManager.createProfile(req.body);
    res.status(201).json({ success: true, data: created });
  });

  app.put('/api/profiles/:id', (req: Request, res: Response) => {
    const updated = globalProfileManager.updateProfile(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }
    res.json({ success: true, data: updated });
  });

  app.delete('/api/profiles/:id', (req: Request, res: Response) => {
    const deleted = globalProfileManager.deleteProfile(req.params.id);
    res.json({ success: deleted });
  });

  // Storage Partition & Lock Remediation
  app.post('/api/profiles/:id/locks/sanitize', (req: Request, res: Response) => {
    const result = globalProfileManager.sanitizeLocks(req.params.id);
    res.json(result);
  });

  app.post('/api/profiles/:id/storage/purge', (req: Request, res: Response) => {
    const { bucketId, fullReset } = req.body;
    if (fullReset) {
      const result = globalProfileManager.resetProfileCleanRoom(req.params.id);
      res.json(result);
    } else if (bucketId) {
      const result = globalProfileManager.purgeBucket(req.params.id, bucketId);
      res.json(result);
    } else {
      res.status(400).json({ success: false, error: 'bucketId or fullReset required' });
    }
  });

  // Proxy Connectivity Diagnostic
  app.post('/api/proxy/test', async (req: Request, res: Response) => {
    const proxyConfig = req.body;
    const result = await globalProxyTunnelManager.testProxyConnectivity(proxyConfig);
    res.json(result);
  });

  // CDP Domain Inspector & Command Executor
  app.get('/api/cdp/logs', (_req: Request, res: Response) => {
    res.json({ success: true, data: globalCDPController.getLogs() });
  });

  app.post('/api/cdp/execute', (req: Request, res: Response) => {
    const { domain, method, params, profileId } = req.body;

    if (!domain || !method) {
      res.status(400).json({ success: false, error: 'Domain and method required' });
      return;
    }

    // Execute or simulate low-level CDP response
    let responsePayload: Record<string, unknown> = {};

    if (method === 'Network.setUserAgentOverride') {
      responsePayload = { success: true, overridden: true };
    } else if (method === 'Fetch.enable') {
      responsePayload = { handleAuthRequests: true, patternsCount: params?.patterns?.length || 1 };
    } else if (method === 'Fetch.continueWithAuth') {
      responsePayload = { authResponseAccepted: true, username: params?.authChallengeResponse?.username };
    } else if (method === 'Storage.getCookies') {
      responsePayload = {
        cookies: [
          { name: 'session_id', value: 'sess_993fa289e0bc', domain: '.example.org', path: '/', secure: true, httpOnly: true },
          { name: 'csrf_token', value: 'csrf_74a01c89', domain: '.example.org', path: '/', secure: true, httpOnly: false },
        ],
      };
    } else if (method === 'Emulation.setTimezoneOverride') {
      responsePayload = { timezoneId: params?.timezoneId || 'UTC' };
    } else {
      responsePayload = { status: 'acknowledged', paramsReceived: params };
    }

    const log = globalCDPController.addLog({
      domain,
      type: 'command',
      method,
      params,
      result: responsePayload,
      profileId,
    });

    res.json({ success: true, log, result: responsePayload });
  });

  // Code Generation Export
  app.post('/api/code/generate', (req: Request, res: Response) => {
    const { profileId, framework, targetUrl } = req.body;
    const profile = globalProfileManager.getProfile(profileId);

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const url = targetUrl || 'https://example.com';
    let code = '';
    let language = 'typescript';

    if (framework === 'puppeteer_ts') {
      code = PuppeteerOrchestrator.generateScript(profile, url);
    } else if (framework === 'playwright_python') {
      code = PythonPlaywrightOrchestrator.generateScript(profile, url);
      language = 'python';
    } else {
      code = PlaywrightOrchestrator.generateScript(profile, url);
    }

    const flags = ChromiumFlagSynthesizer.synthesizeFlags(profile);
    const cliCommand = ChromiumFlagSynthesizer.formatCommandLine('google-chrome', flags, url);

    res.json({
      success: true,
      code,
      language,
      cliCommand,
      framework,
    });
  });

  // Automation Workflow Execution & CDP Telemetry Pipeline
  app.post('/api/workflow/simulate', async (req: Request, res: Response) => {
    const { profileId, framework = 'playwright_ts', targetUrl = 'https://example.com' } = req.body;
    const profile = globalProfileManager.getProfile(profileId);

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const steps = [
      {
        id: 'step-1',
        name: 'Filesystem Storage Setup & Lock Sanitization',
        action: 'launch_context',
        expectedOutcome: `Verified isolated --user-data-dir: ${profile.userDataDir}. Removed any stale SingletonLock files.`,
        durationMs: 42,
        status: 'success',
      },
      {
        id: 'step-2',
        name: 'Per-Profile Proxy Tunnel & Auth Handshake',
        action: 'intercept_proxy_auth',
        expectedOutcome: profile.proxy.enabled
          ? `Connected to ${profile.proxy.protocol}://${profile.proxy.host}:${profile.proxy.port} via ${profile.proxy.authMethod}. Injected Basic Auth headers.`
          : 'Direct connection (No proxy configured).',
        durationMs: profile.proxy.enabled ? 86 : 5,
        status: 'success',
      },
      {
        id: 'step-3',
        name: 'CDP Stealth Scripts & Anti-Leak Hooks Injection',
        action: 'inject_stealth_scripts',
        expectedOutcome: 'Suppressed navigator.webdriver, mocked window.chrome, injected Canvas/Audio noise.',
        durationMs: 28,
        status: 'success',
      },
      {
        id: 'step-4',
        name: `Navigate to Target URL: ${targetUrl}`,
        action: 'navigate',
        targetUrl,
        expectedOutcome: 'HTTP 200 OK received. DOMContentLoaded fired.',
        durationMs: 215,
        status: 'success',
      },
      {
        id: 'step-5',
        name: 'Evaluate Fingerprint & Storage State Isolation',
        action: 'evaluate_fingerprint',
        expectedOutcome: `Context isolated. Cookies bound strictly to ${profile.userDataDir}. Exit IP verified.`,
        durationMs: 64,
        status: 'success',
      },
      {
        id: 'step-6',
        name: profile.isPersistent ? 'Preserve Persistent State to Disk' : 'Purge Ephemeral Storage Sandbox',
        action: 'teardown',
        expectedOutcome: profile.isPersistent
          ? `Session cookies and LevelDB stores flushed to ${profile.userDataDir}.`
          : 'Ephemeral context destroyed, temp folders purged from disk.',
        durationMs: 35,
        status: 'success',
      },
    ];

    res.json({
      success: true,
      runId: `run-${Date.now().toString(36)}`,
      profileId: profile.id,
      framework,
      steps,
      summary: {
        totalDurationMs: steps.reduce((sum, s) => sum + s.durationMs, 0),
        storageState: profile.isPersistent ? 'persistent_saved' : 'ephemeral_purged',
        exitIp: profile.proxy.enabled ? (profile.proxy.exitIp || '198.51.100.42') : 'Direct/Host',
        proxyAuthOk: true,
      },
    });
  });

  // --- Vite Dev Middleware or Static Serving ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CDP Automation Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CDP Automation Studio] Startup failure:', err);
  process.exit(1);
});
