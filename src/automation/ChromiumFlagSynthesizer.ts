/**
 * Chromium Flag Synthesizer & Arguments Engine
 * Curates enterprise-grade, battle-tested launch arguments for Chromium, Electron,
 * Playwright, and Puppeteer with strict state isolation and leak prevention.
 */

import { BrowserProfile } from './types';

export interface ChromiumFlagSpec {
  flag: string;
  category: 'storage' | 'networking' | 'stealth' | 'stability' | 'performance';
  description: string;
  recommended: boolean;
  valueTemplate?: string;
  dangerLevel: 'safe' | 'caution' | 'critical';
}

export const KNOWN_CHROMIUM_FLAGS: ChromiumFlagSpec[] = [
  {
    flag: '--user-data-dir',
    category: 'storage',
    description: 'Forces Chromium to use a dedicated isolated directory for all storage (cookies, cache, leveldb, local storage). Critical for zero cross-contamination.',
    recommended: true,
    valueTemplate: '<path>',
    dangerLevel: 'safe',
  },
  {
    flag: '--disk-cache-dir',
    category: 'storage',
    description: 'Separates HTTP disk cache from user-data-dir. Prevents unbounded disk cache growth from bloating persistent profile backups.',
    recommended: true,
    valueTemplate: '<path>',
    dangerLevel: 'safe',
  },
  {
    flag: '--profile-directory',
    category: 'storage',
    description: 'Selects the specific profile folder (default: "Default") within user-data-dir.',
    recommended: true,
    valueTemplate: 'Default',
    dangerLevel: 'safe',
  },
  {
    flag: '--password-store=basic',
    category: 'stability',
    description: 'Avoids desktop OS keychain prompts (GNOME Keyring, KWallet, macOS Keychain) which can hang headless automation processes indefinitely.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--no-first-run',
    category: 'stealth',
    description: 'Suppresses initial Chromium onboarding wizard, welcome dialogs, and setup screens.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--no-default-browser-check',
    category: 'stealth',
    description: 'Disables "Chrome is not your default browser" prompt bars.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--disable-background-networking',
    category: 'networking',
    description: 'Disables background network traffic (safe browsing pings, component updater, CRL sets, metrics). Essential to prevent proxy leakages.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--disable-sync',
    category: 'networking',
    description: 'Disables Google Account synchronization, reducing background token exchanges.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--disable-default-apps',
    category: 'stability',
    description: 'Prevents pre-installing Chrome default apps on profile creation.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--disable-features=Translate,OptimizationHints,MediaRouter',
    category: 'networking',
    description: 'Blocks Google telemetry calls for language translation, prefetch hints, and local Chromecast discovery.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--disable-dev-shm-usage',
    category: 'stability',
    description: 'Writes shared memory files to /tmp instead of /dev/shm. Prevents browser tab crashes in containerized/Docker environments with small 64MB shm.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--hide-scrollbars',
    category: 'stealth',
    description: 'Hides OS scrollbars to ensure consistent viewport rendering and pixel-perfect screenshots across environments.',
    recommended: false,
    dangerLevel: 'safe',
  },
  {
    flag: '--disable-blink-features=AutomationControlled',
    category: 'stealth',
    description: 'Suppresses navigator.webdriver detection flag at the Blink engine level.',
    recommended: true,
    dangerLevel: 'safe',
  },
  {
    flag: '--no-sandbox',
    category: 'stability',
    description: 'Disables Linux SUID sandbox. Required when running as root inside Docker containers without CAP_SYS_ADMIN.',
    recommended: false,
    dangerLevel: 'caution',
  },
  {
    flag: '--ignore-certificate-errors',
    category: 'networking',
    description: 'Allows navigation through MITM debugging proxies or self-signed certificates. Use only for dev/testing.',
    recommended: false,
    dangerLevel: 'caution',
  },
];

export class ChromiumFlagSynthesizer {
  /**
   * Synthesize full arguments array for a given profile
   */
  public static synthesizeFlags(profile: BrowserProfile, customOverrides: string[] = []): string[] {
    const flags: string[] = [];

    // 1. Filesystem isolation
    flags.push(`--user-data-dir=${profile.userDataDir}`);
    if (profile.diskCacheDir) {
      flags.push(`--disk-cache-dir=${profile.diskCacheDir}`);
    }
    if (profile.profileDirectory) {
      flags.push(`--profile-directory=${profile.profileDirectory}`);
    }

    // 2. Base stability & headless suppression
    flags.push('--password-store=basic');
    flags.push('--no-first-run');
    flags.push('--no-default-browser-check');
    flags.push('--disable-background-networking');
    flags.push('--disable-sync');
    flags.push('--disable-default-apps');
    flags.push('--disable-dev-shm-usage');
    flags.push('--disable-features=Translate,OptimizationHints,MediaRouter');

    // 3. Stealth flags
    if (profile.fingerprint.maskWebDriver) {
      flags.push('--disable-blink-features=AutomationControlled');
    }

    // 4. Viewport size
    flags.push(`--window-size=${profile.fingerprint.viewportWidth},${profile.fingerprint.viewportHeight}`);

    // 5. Proxy configuration
    if (profile.proxy.enabled && profile.proxy.host && profile.proxy.port) {
      const proxyUrl = `${profile.proxy.protocol}://${profile.proxy.host}:${profile.proxy.port}`;
      flags.push(`--proxy-server=${proxyUrl}`);

      if (profile.proxy.bypassList && profile.proxy.bypassList.length > 0) {
        flags.push(`--proxy-bypass-list=${profile.proxy.bypassList.join(';')}`);
      }
    }

    // 6. Profile specific extra flags
    for (const flag of profile.extraFlags) {
      if (!flags.some(f => f.startsWith(flag.split('=')[0]))) {
        flags.push(flag);
      }
    }

    // 7. Custom overrides
    for (const override of customOverrides) {
      const key = override.split('=')[0];
      const existingIdx = flags.findIndex(f => f.startsWith(key));
      if (existingIdx !== -1) {
        flags[existingIdx] = override;
      } else {
        flags.push(override);
      }
    }

    return flags;
  }

  /**
   * Formats synthesized flags into a clean CLI executable command string
   */
  public static formatCommandLine(executable: string, flags: string[], targetUrl?: string): string {
    const formattedArgs = flags.map(arg => {
      if (arg.includes(' ') || arg.includes(';') || arg.includes(',')) {
        const [key, ...rest] = arg.split('=');
        if (rest.length > 0) {
          return `${key}="${rest.join('=')}"`;
        }
        return `"${arg}"`;
      }
      return arg;
    });

    const urlPart = targetUrl ? ` "${targetUrl}"` : '';
    return `${executable} \\\n  ${formattedArgs.join(' \\\n  ')}${urlPart}`;
  }
}
