/**
 * Production-Grade Playwright Context Orchestrator
 * Generates and executes fully typed, battle-tested Playwright TypeScript automation workflows.
 * Emphasizes isolated filesystem storage (--user-data-dir), per-profile proxy authentication,
 * and low-level CDP session attachments.
 */

import { BrowserProfile } from './types';
import { CDPSessionController } from './CDPSessionController';

export class PlaywrightOrchestrator {
  /**
   * Generates a complete, standalone, production-ready TypeScript file for Playwright
   */
  public static generateScript(profile: BrowserProfile, targetUrl = 'https://example.com'): string {
    const stealthScript = CDPSessionController.generateStealthEvaluationScript(profile.fingerprint)
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    return `/**
 * Playwright Automation Node.js / TypeScript Runner
 * Generated for Profile: "${profile.name}" (${profile.id})
 * 
 * Features:
 * - Isolated Filesystem (--user-data-dir): ${profile.userDataDir}
 * - Isolated Disk Cache: ${profile.diskCacheDir}
 * - Per-Profile Proxy: ${profile.proxy.enabled ? `${profile.proxy.protocol}://${profile.proxy.host}:${profile.proxy.port}` : 'Direct'}
 * - Anti-Contamination Singleton Lock Cleanup
 * - CDP Low-Level Session Attachment & Stealth Masking
 */

import { chromium, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// 1. Filesystem Sanitization: Remove stale Chromium singleton locks before launch
function sanitizeChromiumLocks(userDataDir: string): void {
  const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const lockFile of lockFiles) {
    const fullPath = path.join(userDataDir, lockFile);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(\`[Profile Sanitizer] Removed stale lock file: \${fullPath}\`);
      }
    } catch (err) {
      console.warn(\`[Profile Sanitizer] Could not remove lock file \${fullPath}: \${err}\`);
    }
  }
}

async function runAutomation(): Promise<void> {
  const userDataDir = '${profile.userDataDir}';
  const diskCacheDir = '${profile.diskCacheDir}';

  // Ensure directories exist
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(diskCacheDir, { recursive: true });
  sanitizeChromiumLocks(userDataDir);

  console.log('[Runner] Launching isolated Chromium persistent context...');

  // 2. Launch persistent context with strictly separated state
  const context: BrowserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: 'chromium',
    viewport: {
      width: ${profile.fingerprint.viewportWidth},
      height: ${profile.fingerprint.viewportHeight},
    },
    userAgent: '${profile.fingerprint.userAgent}',
    deviceScaleFactor: ${profile.fingerprint.deviceScaleFactor},
    isMobile: ${profile.fingerprint.isMobile},
    hasTouch: ${profile.fingerprint.hasTouch},
    locale: '${profile.fingerprint.locale}',
    timezoneId: '${profile.fingerprint.timezoneId}',
    ${profile.proxy.enabled ? `// Per-profile Proxy Configuration with upstream credentials
    proxy: {
      server: '${profile.proxy.protocol}://${profile.proxy.host}:${profile.proxy.port}',
      username: '${profile.proxy.username || ''}',
      password: '${profile.proxy.password || ''}',
      bypass: '${profile.proxy.bypassList ? profile.proxy.bypassList.join(',') : 'localhost,127.0.0.1'}',
    },` : ''}
    args: [
      \`--disk-cache-dir=\${diskCacheDir}\`,
      '--password-store=basic',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--disable-features=Translate,OptimizationHints,MediaRouter',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    // 3. Inject stealth evasions into every page in this context
    await context.addInitScript(\`${stealthScript}\`);

    // 4. Create or obtain primary page
    const page: Page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // 5. Attach direct Chrome DevTools Protocol (CDP) session
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.enable');
    
    ${profile.proxy.enabled && profile.proxy.authMethod === 'cdp_fetch' ? `
    // CDP Fetch Interception for Proxy Authentication
    await cdpSession.send('Fetch.enable', { handleAuthRequests: true });
    cdpSession.on('Fetch.authRequired', async (event: any) => {
      console.log(\`[CDP] Received auth challenge from \${event.authChallenge.source}\`);
      await cdpSession.send('Fetch.continueWithAuth', {
        requestId: event.requestId,
        authChallengeResponse: {
          response: 'ProvideCredentials',
          username: '${profile.proxy.username || ''}',
          password: '${profile.proxy.password || ''}',
        },
      });
    });
    ` : ''}

    console.log('[Runner] Navigating to target:', '${targetUrl}');
    const response = await page.goto('${targetUrl}', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log('[Runner] Navigation complete. Status:', response?.status());

    // 6. Verify state isolation & evaluate browser fingerprint
    const evaluation = await page.evaluate(() => {
      return {
        webdriver: navigator.webdriver,
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        screenDimensions: \`\${window.screen.width}x\${window.screen.height}\`,
        cookiesCount: document.cookie ? document.cookie.split(';').length : 0,
        localStorageKeys: Object.keys(localStorage),
      };
    });

    console.log('[Runner] Context Isolation Telemetry:', JSON.stringify(evaluation, null, 2));

    // Optional: extract page title or screenshot
    const title = await page.title();
    console.log('[Runner] Page Title:', title);

  } catch (error) {
    console.error('[Runner] Automation error encountered:', error);
    throw error;
  } finally {
    console.log('[Runner] Gracefully closing browser context and synchronizing disk state...');
    await context.close();
    ${!profile.isPersistent ? `
    // Ephemeral teardown: wipe temp directory
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      fs.rmSync(diskCacheDir, { recursive: true, force: true });
      console.log('[Runner] Ephemeral storage purged completely.');
    } catch (e) {
      console.warn('[Runner] Failed to remove ephemeral directory:', e);
    }
    ` : `
    console.log('[Runner] Persistent state successfully preserved in: ' + userDataDir);
    `}
  }
}

// Execute runner if invoked directly
runAutomation().catch((err) => {
  console.error('[Runner] Fatal exit:', err);
  process.exit(1);
});
`;
  }
}
