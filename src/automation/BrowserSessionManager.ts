import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type BrowserContext, type CDPSession, type Page } from 'playwright';
import { BrowserProfile } from './types';
import { CDPSessionController } from './CDPSessionController';
import { withResolvedProxySecret } from './ProxySecretResolver';

export interface BrowserSession {
  sessionId: string;
  profileId: string;
  isPersistent: boolean;
  context: BrowserContext;
  page: Page;
  url: string;
  startedAt: number;
  cdpSession: CDPSession;
}

interface ScreencastFrameEvent {
  data: string;
  sessionId: number;
}

export interface BrowserSessionSnapshot {
  sessionId: string;
  profileId: string;
  url: string;
  startedAt: number;
  pageCount: number;
  telemetry?: Record<string, unknown>;
}

export class BrowserSessionManager {
  private readonly sessions = new Map<string, BrowserSession>();
  private readonly screencastSubscribers = new Map<string, Set<(image: string) => void>>();
  private readonly latestFrames = new Map<string, string>();

  constructor(private readonly profileRoot: string) {}

  public async start(profile: BrowserProfile, targetUrl: string): Promise<BrowserSessionSnapshot> {
    const existing = [...this.sessions.values()].find((session) => session.profileId === profile.id);
    if (existing) return this.snapshot(existing);

    const runtimeProfilePath = this.getRuntimeProfilePath(profile.id);
    const userDataDir = path.join(runtimeProfilePath, 'user_data');
    const diskCacheDir = path.join(runtimeProfilePath, 'cache_data');
    await fs.mkdir(diskCacheDir, { recursive: true });

    for (const lockFile of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      await fs.rm(path.join(userDataDir, lockFile), { force: true });
    }

    const proxyConfig = withResolvedProxySecret(profile);
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: process.env.HEADLESS === 'true',
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
      proxy: proxyConfig.enabled && proxyConfig.host
        ? {
        server: `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`,
        ...(proxyConfig.username ? { username: proxyConfig.username } : {}),
        ...(proxyConfig.password ? { password: proxyConfig.password } : {}),
        bypass: proxyConfig.bypassList?.join(',') || 'localhost,127.0.0.1',
          }
        : undefined,
      args: [
        `--disk-cache-dir=${diskCacheDir}`,
        ...(profile.fingerprint.maskWebDriver ? ['--disable-blink-features=AutomationControlled'] : []),
        ...this.webglFlags(profile.fingerprint.userAgent, profile.fingerprint.webglRenderer),
      ],
    });

    await context.addInitScript(CDPSessionController.generateStealthEvaluationScript(profile.fingerprint));
    const page = context.pages()[0] || await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const cdpSession = await context.newCDPSession(page);

    const session: BrowserSession = {
      sessionId: `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      profileId: profile.id,
      isPersistent: profile.isPersistent,
      context,
      page,
      url: page.url(),
      startedAt: Date.now(),
      cdpSession,
    };
    this.sessions.set(session.sessionId, session);
    await this.startScreencast(session);
    return this.snapshot(session);
  }

  public async navigate(sessionId: string, targetUrl: string): Promise<BrowserSessionSnapshot> {
    const session = this.require(sessionId);
    await session.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    session.url = session.page.url();
    return this.snapshot(session);
  }

  public async click(sessionId: string, selector: string): Promise<BrowserSessionSnapshot> {
    const session = this.require(sessionId);
    await session.page.locator(selector).click({ timeout: 10000 });
    return this.snapshot(session);
  }

  public async type(sessionId: string, selector: string, text: string): Promise<BrowserSessionSnapshot> {
    const session = this.require(sessionId);
    await session.page.locator(selector).fill(text, { timeout: 10000 });
    return this.snapshot(session);
  }

  public async clickAt(sessionId: string, x: number, y: number): Promise<BrowserSessionSnapshot> {
    const session = this.require(sessionId);
    await session.page.mouse.click(x, y);
    return this.snapshot(session);
  }

  public async press(sessionId: string, key: string): Promise<BrowserSessionSnapshot> {
    const session = this.require(sessionId);
    await session.page.keyboard.press(key);
    return this.snapshot(session);
  }

  public async scroll(sessionId: string, deltaY: number): Promise<BrowserSessionSnapshot> {
    const session = this.require(sessionId);
    await session.page.mouse.wheel(0, deltaY);
    return this.snapshot(session);
  }

  public async reload(sessionId: string): Promise<BrowserSessionSnapshot> {
    const session = this.require(sessionId);
    await session.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    session.url = session.page.url();
    return this.snapshot(session);
  }

  public async snapshotById(sessionId: string): Promise<BrowserSessionSnapshot> {
    return this.snapshot(this.require(sessionId));
  }

  public async screenshot(sessionId: string): Promise<string> {
    const session = this.require(sessionId);
    const image = await session.page.screenshot({ type: 'jpeg', quality: 76 });
    return `data:image/jpeg;base64,${image.toString('base64')}`;
  }

  public subscribeScreencast(sessionId: string, subscriber: (image: string) => void): () => void {
    this.require(sessionId);
    const subscribers = this.screencastSubscribers.get(sessionId) || new Set<(image: string) => void>();
    subscribers.add(subscriber);
    this.screencastSubscribers.set(sessionId, subscribers);
    const latest = this.latestFrames.get(sessionId);
    if (latest) subscriber(latest);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) this.screencastSubscribers.delete(sessionId);
    };
  }

  public async probeEgressIp(sessionId: string): Promise<string> {
    const session = this.require(sessionId);
    const response = await session.context.request.get('https://api.ipify.org?format=json', { timeout: 15000 });
    if (!response.ok()) throw new Error(`Egress probe returned HTTP ${response.status()}`);
    const payload = await response.json() as { ip?: string };
    if (!payload.ip) throw new Error('Egress probe did not return an IP address');
    return payload.ip;
  }

  public async collectBenchmark(sessionId: string): Promise<Record<string, unknown>> {
    const session = this.require(sessionId);
    return session.page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyText: document.body?.innerText.slice(0, 12000) || '',
      signals: {
        webdriver: navigator.webdriver ?? null,
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: [...navigator.languages],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: 'deviceMemory' in navigator ? navigator.deviceMemory : null,
        screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
      },
    }));
  }

  public async stop(sessionId: string): Promise<void> {
    const session = this.require(sessionId);
    this.sessions.delete(sessionId);
    this.screencastSubscribers.delete(sessionId);
    this.latestFrames.delete(sessionId);
    await session.cdpSession.send('Page.stopScreencast').catch(() => undefined);
    await session.context.close();
    const profile = this.getRuntimeProfilePath(session.profileId);
    if (!session.isPersistent) await fs.rm(profile, { recursive: true, force: true });
  }

  public async stopAll(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((sessionId) => this.stop(sessionId)));
  }

  public hasProfileSession(profileId: string): boolean {
    return [...this.sessions.values()].some((session) => session.profileId === profileId);
  }

  private async snapshot(session: BrowserSession): Promise<BrowserSessionSnapshot> {
    return {
      sessionId: session.sessionId,
      profileId: session.profileId,
      url: session.page.url(),
      startedAt: session.startedAt,
      pageCount: session.context.pages().length,
      telemetry: await session.page.evaluate(() => ({
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        webdriver: navigator.webdriver ?? null,
        screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
      })),
    };
  }

  private async startScreencast(session: BrowserSession): Promise<void> {
    session.cdpSession.on('Page.screencastFrame', async (event: ScreencastFrameEvent) => {
      const image = `data:image/jpeg;base64,${event.data}`;
      this.latestFrames.set(session.sessionId, image);
      for (const subscriber of this.screencastSubscribers.get(session.sessionId) || []) subscriber(image);
      await session.cdpSession.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => undefined);
    });
    await session.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 76,
      maxWidth: 1920,
      maxHeight: 1200,
      everyNthFrame: 1,
    });
  }

  private require(sessionId: string): BrowserSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Browser session not found');
    return session;
  }

  private getRuntimeProfilePath(profileId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(profileId)) throw new Error('Invalid profile id');
    return path.join(this.profileRoot, profileId);
  }

  private webglFlags(userAgent: string, renderer: string): string[] {
    if (/windows/i.test(userAgent) && /angle|direct3d|nvidia|amd|intel/i.test(renderer)) {
      return ['--use-angle=d3d11', '--use-gl=angle'];
    }
    return [];
  }
}