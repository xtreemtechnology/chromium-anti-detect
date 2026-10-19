/**
 * Chrome DevTools Protocol (CDP) Low-Level Controller
 * Direct manipulation of Chromium internals across Network, Fetch, Page, Storage, and Emulation domains.
 */

import { CDPLogEntry, FingerprintConfig } from './types';

export class CDPSessionController {
  private logEntries: CDPLogEntry[] = [];

  constructor() {
    this.seedDefaultLogs();
  }

  private seedDefaultLogs(): void {
    const now = Date.now();
    this.logEntries = [
      {
        id: 'cdp-1',
        timestamp: now - 3200,
        domain: 'Target',
        type: 'command',
        method: 'Target.attachToTarget',
        params: { targetId: 'page-target-9941a', flatten: true },
        result: { sessionId: 'session-c081e2' },
      },
      {
        id: 'cdp-2',
        timestamp: now - 3100,
        domain: 'Fetch',
        type: 'command',
        method: 'Fetch.enable',
        params: { handleAuthRequests: true, patterns: [{ urlPattern: '*' }] },
        result: {},
      },
      {
        id: 'cdp-3',
        timestamp: now - 3050,
        domain: 'Network',
        type: 'command',
        method: 'Network.enable',
        params: { maxPostDataSize: 65536 },
        result: {},
      },
      {
        id: 'cdp-4',
        timestamp: now - 2900,
        domain: 'Page',
        type: 'command',
        method: 'Page.addScriptToEvaluateOnNewDocument',
        params: {
          source: `// Anti-detection stealth patch
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };`,
        },
        result: { identifier: 'stealth-hook-1' },
      },
      {
        id: 'cdp-5',
        timestamp: now - 1800,
        domain: 'Fetch',
        type: 'event',
        method: 'Fetch.authRequired',
        params: {
          requestId: 'req-auth-001',
          authChallenge: { source: 'Proxy', origin: 'res-us-pool.brightproxy.net:10080', scheme: 'Basic' },
          resourceType: 'Document',
        },
      },
      {
        id: 'cdp-6',
        timestamp: now - 1750,
        domain: 'Fetch',
        type: 'command',
        method: 'Fetch.continueWithAuth',
        params: {
          requestId: 'req-auth-001',
          authChallengeResponse: { response: 'ProvideCredentials', username: 'res_bot_corp_7491' },
        },
        result: {},
      },
      {
        id: 'cdp-7',
        timestamp: now - 1200,
        domain: 'Network',
        type: 'event',
        method: 'Network.responseReceived',
        params: {
          url: 'https://example-market.org/api/session',
          status: 200,
          statusText: 'OK',
          mimeType: 'application/json',
          remoteIPAddress: '198.51.100.42',
        },
      },
    ];
  }

  public getLogs(): CDPLogEntry[] {
    return [...this.logEntries];
  }

  public addLog(entry: Omit<CDPLogEntry, 'id' | 'timestamp'>): CDPLogEntry {
    const fullEntry: CDPLogEntry = {
      ...entry,
      id: `cdp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    this.logEntries.unshift(fullEntry);
    if (this.logEntries.length > 200) {
      this.logEntries.pop();
    }
    return fullEntry;
  }

  public clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * Generates production stealth script to evaluate on new document
   */
  public static generateStealthEvaluationScript(config: FingerprintConfig): string {
    const locale = JSON.stringify(config.locale);
    const languages = JSON.stringify(config.languages);
    const webglVendor = JSON.stringify(config.webglVendor);
    const webglRenderer = JSON.stringify(config.webglRenderer);

    return `(() => {
  // 1. Strip navigator.webdriver
  ${config.maskWebDriver ? `
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true,
  });
  delete Object.getPrototypeOf(navigator).webdriver;
  ` : ''}

  // 2. Mock Chrome runtime object
  if (!window.chrome) {
    window.chrome = {
      app: { isInstalled: false, InstallState: { DISABLED: 'disabled' }, RunningState: { CANNOT_RUN: 'cannot_run' } },
      runtime: {
        OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install' },
        PlatformArch: { ARM: 'arm', X86_64: 'x86-64' },
      },
      loadTimes: () => ({}),
      csi: () => ({}),
    };
  }

  // 3. Hardware concurrency & device memory
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${config.hardwareConcurrency} });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => ${config.deviceMemory} });

  // 4. Languages override
  Object.defineProperty(navigator, 'languages', { get: () => ${languages} });
  Object.defineProperty(navigator, 'language', { get: () => ${locale} });

  // 5. Canvas noise protection (subtle pixel jitter to defeat hash trackers without breaking render)
  ${config.noiseCanvas ? `
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (type, ...args) {
    const ctx = this.getContext('2d');
    if (ctx) {
      try {
        const imgData = ctx.getImageData(0, 0, Math.min(10, this.width || 1), Math.min(10, this.height || 1));
        for (let i = 0; i < imgData.data.length; i += 4) {
          imgData.data[i] = (imgData.data[i] ^ 1) & 0xff;
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {
        // cross-origin tainted canvas
      }
    }
    return originalToDataURL.apply(this, [type, ...args]);
  };
  ` : ''}

  // 6. WebGL Vendor / Renderer Spoofing
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (parameter) {
    if (parameter === 37445 /* UNMASKED_VENDOR_WEBGL */) {
      return ${webglVendor};
    }
    if (parameter === 37446 /* UNMASKED_RENDERER_WEBGL */) {
      return ${webglRenderer};
    }
    return getParameter.apply(this, [parameter]);
  };

  const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
  WebGL2RenderingContext.prototype.getParameter = function (parameter) {
    if (parameter === 37445) return ${webglVendor};
    if (parameter === 37446) return ${webglRenderer};
    return getParameter2.apply(this, [parameter]);
  };
})();`;
  }
}

export const globalCDPController = new CDPSessionController();
