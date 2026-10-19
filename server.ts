/**
 * Production Full-Stack Server
 * Integrates Express API endpoints for browser profile management, proxy diagnostics,
 * CDP command execution, and Vite middleware integration.
 */

import express, { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { globalProfileManager } from './src/automation/ProfileManager';
import { globalProxyTunnelManager } from './src/automation/ProxyTunnelManager';
import { globalCDPController } from './src/automation/CDPSessionController';
import { ChromiumFlagSynthesizer } from './src/automation/ChromiumFlagSynthesizer';
import { CDPSessionController } from './src/automation/CDPSessionController';
import { PlaywrightOrchestrator } from './src/automation/PlaywrightOrchestrator';
import { PuppeteerOrchestrator } from './src/automation/PuppeteerOrchestrator';
import { PythonPlaywrightOrchestrator } from './src/automation/PythonPlaywrightOrchestrator';
import { BrowserSessionManager } from './src/automation/BrowserSessionManager';
import { auditProfile } from './src/automation/ProfileConsistencyAuditor';
import { withResolvedProxySecret } from './src/automation/ProxySecretResolver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  const API_KEY = process.env.API_KEY;

  app.use(express.json({ limit: '10mb' }));

  const isLoopbackHost = HOST === '127.0.0.1' || HOST === 'localhost' || HOST === '::1';
  if (!isLoopbackHost && !API_KEY) {
    throw new Error('API_KEY is required when HOST is not loopback');
  }

  app.use('/api', (req: Request, res: Response, next) => {
    if (req.path === '/health' || !API_KEY || req.header('x-api-key') === API_KEY) {
      next();
      return;
    }
    res.status(401).json({ success: false, error: 'API key required' });
  });

  const profileRoot = path.resolve(process.env.PROFILE_ROOT || path.join(__dirname, 'profiles_data'));
  const browserSessionManager = new BrowserSessionManager(profileRoot);

  const getRuntimeProfilePath = (profileId: string): string => {
    if (!/^[a-zA-Z0-9_-]+$/.test(profileId)) {
      throw new Error('Invalid profile id');
    }
    return path.join(profileRoot, profileId);
  };

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

  app.get('/api/profiles/:id/audit', (req: Request, res: Response) => {
    const profile = globalProfileManager.getProfile(req.params.id);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }
    const findings = auditProfile(profile);
    res.json({ success: true, data: { passed: findings.every((finding) => finding.severity !== 'error'), findings } });
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
    if (browserSessionManager.hasProfileSession(req.params.id)) {
      res.status(409).json({ success: false, error: 'Stop the active browser session before sanitizing locks.' });
      return;
    }
    const result = globalProfileManager.sanitizeLocks(req.params.id);
    res.json(result);
  });

  app.post('/api/profiles/:id/storage/purge', (req: Request, res: Response) => {
    if (browserSessionManager.hasProfileSession(req.params.id)) {
      res.status(409).json({ success: false, error: 'Stop the active browser session before purging storage.' });
      return;
    }
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

  // Persistent browser session lifecycle for the browser workspace.
  app.post('/api/sessions/start', async (req: Request, res: Response) => {
    const { profileId, targetUrl = 'https://example.com' } = req.body;
    const profile = globalProfileManager.getProfile(profileId);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    try {
      const parsedUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Only HTTP(S) target URLs are supported');
      const session = await browserSessionManager.start(profile, parsedUrl.toString());
      res.json({ success: true, data: session });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.get('/api/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await browserSessionManager.snapshotById(req.params.sessionId) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(404).json({ success: false, error: message });
    }
  });

  app.get('/api/sessions/:sessionId/screenshot', async (req: Request, res: Response) => {
    try {
      res.json({ success: true, data: { image: await browserSessionManager.screenshot(req.params.sessionId) } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(404).json({ success: false, error: message });
    }
  });

  app.get('/api/sessions/:sessionId/screencast', (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      const unsubscribe = browserSessionManager.subscribeScreencast(req.params.sessionId, (image) => {
        res.write(`data: ${JSON.stringify({ image })}\n\n`);
      });
      req.on('close', unsubscribe);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(404).json({ success: false, error: message });
    }
  });

  app.get('/api/sessions/:sessionId/egress-ip', async (req: Request, res: Response) => {
    try {
      const ip = await browserSessionManager.probeEgressIp(req.params.sessionId);
      res.json({ success: true, data: { ip } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.post('/api/benchmarks/run', async (req: Request, res: Response) => {
    const { profileId, targetUrl = 'https://abrahamjuliot.github.io/creepjs/' } = req.body;
    const profile = globalProfileManager.getProfile(profileId);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }
    let sessionId: string | undefined;
    try {
      const parsedUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Only HTTP(S) benchmark URLs are supported');
      const session = await browserSessionManager.start(profile, parsedUrl.toString());
      sessionId = session.sessionId;
      const report = await browserSessionManager.collectBenchmark(sessionId);
      const screenshot = await browserSessionManager.screenshot(sessionId);
      res.json({ success: true, data: { sessionId: profile.isPersistent ? session.sessionId : undefined, report, screenshot } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    } finally {
      if (sessionId && !profile.isPersistent) {
        await browserSessionManager.stop(sessionId).catch(() => undefined);
      }
    }
  });

  app.post('/api/sessions/:sessionId/navigate', async (req: Request, res: Response) => {
    try {
      const parsedUrl = new URL(req.body.targetUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Only HTTP(S) target URLs are supported');
      res.json({ success: true, data: await browserSessionManager.navigate(req.params.sessionId, parsedUrl.toString()) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.post('/api/sessions/:sessionId/click', async (req: Request, res: Response) => {
    try {
      if (typeof req.body.selector !== 'string' || !req.body.selector.trim()) throw new Error('selector is required');
      res.json({ success: true, data: await browserSessionManager.click(req.params.sessionId, req.body.selector) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.post('/api/sessions/:sessionId/type', async (req: Request, res: Response) => {
    try {
      if (typeof req.body.selector !== 'string' || typeof req.body.text !== 'string') throw new Error('selector and text are required');
      res.json({ success: true, data: await browserSessionManager.type(req.params.sessionId, req.body.selector, req.body.text) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.post('/api/sessions/:sessionId/click-at', async (req: Request, res: Response) => {
    try {
      const x = Number(req.body.x);
      const y = Number(req.body.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) throw new Error('x and y must be non-negative numbers');
      res.json({ success: true, data: await browserSessionManager.clickAt(req.params.sessionId, x, y) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.post('/api/sessions/:sessionId/press', async (req: Request, res: Response) => {
    try {
      if (typeof req.body.key !== 'string' || !req.body.key.trim()) throw new Error('key is required');
      res.json({ success: true, data: await browserSessionManager.press(req.params.sessionId, req.body.key) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.post('/api/sessions/:sessionId/scroll', async (req: Request, res: Response) => {
    try {
      const deltaY = Number(req.body.deltaY);
      if (!Number.isFinite(deltaY)) throw new Error('deltaY must be a number');
      res.json({ success: true, data: await browserSessionManager.scroll(req.params.sessionId, deltaY) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.post('/api/sessions/:sessionId/reload', async (req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await browserSessionManager.reload(req.params.sessionId) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(502).json({ success: false, error: message });
    }
  });

  app.delete('/api/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
      await browserSessionManager.stop(req.params.sessionId);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(404).json({ success: false, error: message });
    }
  });

  // Real Playwright workflow. The demo endpoint below remains available for UI previews.
  app.post('/api/workflow/run', async (req: Request, res: Response) => {
    const { profileId, targetUrl = 'https://example.com' } = req.body;
    const profile = globalProfileManager.getProfile(profileId);

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      res.status(400).json({ success: false, error: 'targetUrl must be a valid URL' });
      return;
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      res.status(400).json({ success: false, error: 'Only HTTP(S) target URLs are supported' });
      return;
    }

    const runtimeProfilePath = getRuntimeProfilePath(profile.id);
    const userDataDir = path.join(runtimeProfilePath, 'user_data');
    const diskCacheDir = path.join(runtimeProfilePath, 'cache_data');
    const startedAt = Date.now();
    const steps: Array<Record<string, unknown>> = [];
    let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;

    try {
      await fs.mkdir(diskCacheDir, { recursive: true });
      for (const lockFile of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
        await fs.rm(path.join(userDataDir, lockFile), { force: true });
      }
      steps.push({ id: 'step-1', action: 'launch_context', status: 'success', durationMs: Date.now() - startedAt });

      const proxyConfig = withResolvedProxySecret(profile);
      const proxy = proxyConfig.enabled && proxyConfig.host
        ? {
        server: `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`,
        ...(proxyConfig.username ? { username: proxyConfig.username } : {}),
        ...(proxyConfig.password ? { password: proxyConfig.password } : {}),
        bypass: proxyConfig.bypassList?.join(',') || 'localhost,127.0.0.1',
          }
        : undefined;

      context = await chromium.launchPersistentContext(userDataDir, {
        headless: process.env.HEADLESS !== 'true',
        ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
        ...(profile.fingerprint.maskWebDriver ? { ignoreDefaultArgs: ['--enable-automation'] } : {}),
        viewport: {
          width: profile.fingerprint.viewportWidth,
          height: profile.fingerprint.viewportHeight,
        },
        userAgent: profile.fingerprint.userAgent,
        deviceScaleFactor: profile.fingerprint.deviceScaleFactor,
        isMobile: profile.fingerprint.isMobile,
        hasTouch: profile.fingerprint.hasTouch,
        locale: profile.fingerprint.locale,
        timezoneId: profile.fingerprint.timezoneId,
        proxy,
        args: [
          `--disk-cache-dir=${diskCacheDir}`,
          ...(profile.fingerprint.maskWebDriver ? ['--disable-blink-features=AutomationControlled'] : []),
        ],
      });
      await context.addInitScript(CDPSessionController.generateStealthEvaluationScript(profile.fingerprint));

      const page = context.pages()[0] || await context.newPage();
      const response = await page.goto(parsedUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      const telemetry = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: [...navigator.languages],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        webdriver: navigator.webdriver,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: 'deviceMemory' in navigator ? navigator.deviceMemory : undefined,
        screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
      }));

      steps.push({ id: 'step-2', action: 'navigate', status: 'success', durationMs: Date.now() - startedAt, statusCode: response?.status() ?? null });
      res.json({
        success: true,
        runId: `run-${Date.now().toString(36)}`,
        profileId: profile.id,
        framework: 'playwright_ts',
        steps,
        telemetry,
        summary: {
          totalDurationMs: Date.now() - startedAt,
          storageState: profile.isPersistent ? 'persistent_saved' : 'ephemeral_pending_cleanup',
          exitIp: null,
          proxyAuthOk: profile.proxy.enabled ? Boolean(profile.proxy.username && profile.proxy.password && !profile.proxy.password.startsWith('••')) : true,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ id: 'step-error', action: 'navigate', status: 'failed', durationMs: Date.now() - startedAt, error: message });
      res.status(502).json({ success: false, profileId: profile.id, steps, error: message });
    } finally {
      await context?.close();
      if (!profile.isPersistent) {
        await fs.rm(runtimeProfilePath, { recursive: true, force: true });
      }
    }
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

  const server = app.listen(PORT, HOST, () => {
    console.log(`[Field Browser] Server running on http://${HOST}:${PORT}`);
  });

  const shutdown = async () => {
    await browserSessionManager.stopAll();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[CDP Automation Studio] Startup failure:', err);
  process.exit(1);
});
