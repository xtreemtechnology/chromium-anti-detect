/**
 * Production-Grade Puppeteer Context Orchestrator
 * Generates and executes fully typed Puppeteer TypeScript scripts with isolated storage,
 * per-profile proxy authentication, and Chrome DevTools Protocol integration.
 */

import { BrowserProfile } from './types';
import { CDPSessionController } from './CDPSessionController';
import { ChromiumFlagSynthesizer } from './ChromiumFlagSynthesizer';

export class PuppeteerOrchestrator {
  /**
   * Generates a complete, production-ready TypeScript file for Puppeteer
   */
  public static generateScript(profile: BrowserProfile, targetUrl = 'https://example.com'): string {
    const flags = ChromiumFlagSynthesizer.synthesizeFlags(profile, ['--headless=new']);
    const flagsArrayStr = JSON.stringify(flags, null, 4);
    const stealthScript = CDPSessionController.generateStealthEvaluationScript(profile.fingerprint)
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    return `/**
 * Puppeteer Automation Node.js / TypeScript Runner
 * Generated for Profile: "${profile.name}" (${profile.id})
 * 
 * Features:
 * - Dedicated --user-data-dir Storage: ${profile.userDataDir}
 * - Per-Profile Proxy with page.authenticate() & CDP Fetch Hook
 * - Strict Separation of Browser States
 * - Zero-Pill Monospace Logging & Error Diagnostics
 */

import puppeteer, { type Browser, type Page, type CDPSession } from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

// Clean stale singleton locks from ungraceful crashes
function removeStaleLocks(userDataDir: string): void {
  const locks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const item of locks) {
    const lockPath = path.join(userDataDir, item);
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
        console.log(\`[Lock Cleaner] Purged stale lock: \${lockPath}\`);
      }
    } catch (e) {
      // Ignore if in use or missing
    }
  }
}

async function runPuppeteerAutomation(): Promise<void> {
  const userDataDir = '${profile.userDataDir}';
  const diskCacheDir = '${profile.diskCacheDir}';

  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(diskCacheDir, { recursive: true });
  removeStaleLocks(userDataDir);

  console.log('[Puppeteer Runner] Launching Chromium with custom flags and isolated user data directory...');

  const launchFlags = ${flagsArrayStr};

  const browser: Browser = await puppeteer.launch({
    headless: true,
    userDataDir,
    args: launchFlags,
    defaultViewport: {
      width: ${profile.fingerprint.viewportWidth},
      height: ${profile.fingerprint.viewportHeight},
      deviceScaleFactor: ${profile.fingerprint.deviceScaleFactor},
      isMobile: ${profile.fingerprint.isMobile},
      hasTouch: ${profile.fingerprint.hasTouch},
    },
  });

  try {
    const page: Page = (await browser.pages())[0] || (await browser.newPage());

    // 1. Set User-Agent & Emulation headers
    await page.setUserAgent('${profile.fingerprint.userAgent}');
    await page.setExtraHTTPHeaders({
      'Accept-Language': '${profile.fingerprint.locale},en;q=0.9',
    });

    ${profile.proxy.enabled && profile.proxy.username ? `
    // 2. Per-profile Proxy Authentication
    // Puppeteer page.authenticate wires CDP Network.authenticate credentials
    await page.authenticate({
      username: '${profile.proxy.username}',
      password: '${profile.proxy.password || ''}',
    });
    console.log('[Puppeteer Runner] Proxy credentials registered via CDP page.authenticate()');
    ` : ''}

    // 3. Inject stealth evasions before any page script executes
    await page.evaluateOnNewDocument(\`${stealthScript}\`);

    // 4. Attach low-level CDP session for domain-specific telemetry
    const client: CDPSession = await page.target().createCDPSession();
    await client.send('Network.enable');
    
    // Optional: override timezone using CDP Emulation domain
    await client.send('Emulation.setTimezoneOverride', {
      timezoneId: '${profile.fingerprint.timezoneId}',
    });

    console.log('[Puppeteer Runner] Navigating to target:', '${targetUrl}');
    const response = await page.goto('${targetUrl}', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log('[Puppeteer Runner] HTTP Response Code:', response?.status());

    // 5. Audit isolated state within page
    const stateAudit = await page.evaluate(() => {
      return {
        navigatorWebdriver: navigator.webdriver,
        origin: window.location.origin,
        localStorageKeysCount: Object.keys(localStorage).length,
        documentCookiesLength: document.cookie.length,
      };
    });

    console.log('[Puppeteer Runner] State Isolation Audit:', stateAudit);

  } catch (error) {
    console.error('[Puppeteer Runner] Automation exception:', error);
    throw error;
  } finally {
    console.log('[Puppeteer Runner] Closing browser instance...');
    await browser.close();
    ${!profile.isPersistent ? `
    // Ephemeral cleanup
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(diskCacheDir, { recursive: true, force: true });
    console.log('[Puppeteer Runner] Ephemeral data directory deleted.');
    ` : `
    console.log('[Puppeteer Runner] Persistent profile state synced to disk.');
    `}
  }
}

runPuppeteerAutomation().catch((err) => {
  console.error('[Puppeteer Runner] Unhandled error:', err);
  process.exit(1);
});
`;
  }
}
