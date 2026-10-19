/**
 * Production-Ready Isolated Profile Storage Manager
 * Handles filesystem isolation (--user-data-dir), cache segregation (--disk-cache-dir),
 * singleton lock remediation (SingletonLock cleanup after process crashes),
 * and granular partition purging (Cookies, LevelDB, IndexedDB, Cache).
 */

import fs from 'node:fs';
import path from 'node:path';
import { BrowserProfile, StorageBucketItem } from './types';

export class ProfileManager {
  private profiles: Map<string, BrowserProfile> = new Map();
  private readonly catalogPath = path.resolve(process.env.PROFILE_CATALOG_PATH || 'profile-catalog.json');

  constructor() {
    this.seedDefaultProfiles();
    this.loadCatalog();
  }

  /**
   * Initializes high-fidelity default profile architectures
   */
  private seedDefaultProfiles(): void {
    const defaultProfiles: BrowserProfile[] = [
      {
        id: 'prof-us-east-01',
        name: 'US-East Residential Profile (E-Commerce)',
        description: 'Persistent isolated session for marketplace monitoring with dedicated residential proxy and saved session cookies.',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        isPersistent: true,
        userDataDir: '/var/automation/profiles/prof-us-east-01/user_data',
        diskCacheDir: '/var/automation/profiles/prof-us-east-01/cache_data',
        profileDirectory: 'Default',
        proxy: {
          enabled: true,
          protocol: 'http',
          host: 'res-us-pool.brightproxy.net',
          port: 10080,
          username: 'res_bot_corp_7491',
          password: '••••••••••••••••',
          authMethod: 'loopback_tunnel',
          bypassList: ['127.0.0.1', 'localhost', '*.internal.net'],
          testStatus: 'verified',
          lastLatencyMs: 84,
          exitIp: '198.51.100.42',
          countryCode: 'US',
        },
        fingerprint: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          viewportWidth: 1920,
          viewportHeight: 1080,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          timezoneId: 'America/New_York',
          locale: 'en-US',
          languages: ['en-US', 'en'],
          webglVendor: 'Google Inc. (NVIDIA)',
          webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
          hardwareConcurrency: 8,
          deviceMemory: 16,
          maskWebDriver: true,
          noiseCanvas: true,
          noiseAudio: true,
        },
        extraFlags: [
          '--disable-blink-features=AutomationControlled',
          '--enable-webgl',
        ],
        storageBuckets: [
          {
            id: 'sb-cookies',
            name: 'Network Cookies (SQLite)',
            relativePath: 'Default/Network/Cookies',
            sizeBytes: 248576, // ~242 KB
            fileCount: 1,
            description: 'SQLite database storing domain session cookies and auth tokens.',
            criticalForSession: true,
            safeToPurge: false,
            category: 'network',
          },
          {
            id: 'sb-localstorage',
            name: 'Local Storage (LevelDB)',
            relativePath: 'Default/Local Storage/leveldb',
            sizeBytes: 1542800, // ~1.47 MB
            fileCount: 8,
            description: 'LevelDB key-value store holding client web app states and token caches.',
            criticalForSession: true,
            safeToPurge: false,
            category: 'storage',
          },
          {
            id: 'sb-indexeddb',
            name: 'IndexedDB Object Stores',
            relativePath: 'Default/IndexedDB',
            sizeBytes: 8421000, // ~8.03 MB
            fileCount: 24,
            description: 'Structured client offline databases, draft carts, and telemetry caches.',
            criticalForSession: false,
            safeToPurge: true,
            category: 'storage',
          },
          {
            id: 'sb-cache',
            name: 'Chromium HTTP Cache',
            relativePath: 'Default/Cache/Cache_Data',
            sizeBytes: 42100000, // ~40.1 MB
            fileCount: 142,
            description: 'Cached scripts, stylesheets, and binary image blobs.',
            criticalForSession: false,
            safeToPurge: true,
            category: 'cache',
          },
          {
            id: 'sb-prefs',
            name: 'Preferences & Partition Keys',
            relativePath: 'Default/Preferences',
            sizeBytes: 98304, // 96 KB
            fileCount: 1,
            description: 'JSON file with browser flags, window layout, and site permissions.',
            criticalForSession: true,
            safeToPurge: false,
            category: 'metadata',
          },
        ],
        totalSizeBytes: 52410680,
        activeSessionsCount: 0,
        lastUsedAt: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        id: 'prof-eu-frankfurt-02',
        name: 'EU Frankfurt Banking Automation Context',
        description: 'Hardened browser instance with isolated state storage and German IP routing for fintech verification.',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
        isPersistent: true,
        userDataDir: '/var/automation/profiles/prof-eu-frankfurt-02/user_data',
        diskCacheDir: '/var/automation/profiles/prof-eu-frankfurt-02/cache_data',
        profileDirectory: 'Default',
        proxy: {
          enabled: true,
          protocol: 'http',
          host: 'de-proxy.fin-nodes.internal',
          port: 8443,
          username: 'fra_worker_secure',
          password: '••••••••••••••••',
          authMethod: 'cdp_fetch',
          bypassList: ['127.0.0.1'],
          testStatus: 'verified',
          lastLatencyMs: 38,
          exitIp: '203.0.113.19',
          countryCode: 'DE',
        },
        fingerprint: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          viewportWidth: 1440,
          viewportHeight: 900,
          deviceScaleFactor: 2,
          isMobile: false,
          hasTouch: false,
          timezoneId: 'Europe/Berlin',
          locale: 'de-DE',
          languages: ['de-DE', 'de', 'en-US'],
          webglVendor: 'Apple',
          webglRenderer: 'Apple M2 Pro',
          hardwareConcurrency: 10,
          deviceMemory: 32,
          maskWebDriver: true,
          noiseCanvas: true,
          noiseAudio: true,
        },
        extraFlags: [
          '--disable-blink-features=AutomationControlled',
        ],
        storageBuckets: [
          {
            id: 'sb-cookies',
            name: 'Network Cookies (SQLite)',
            relativePath: 'Default/Network/Cookies',
            sizeBytes: 184320,
            fileCount: 1,
            description: 'SQLite database storing domain session cookies and auth tokens.',
            criticalForSession: true,
            safeToPurge: false,
            category: 'network',
          },
          {
            id: 'sb-localstorage',
            name: 'Local Storage (LevelDB)',
            relativePath: 'Default/Local Storage/leveldb',
            sizeBytes: 980000,
            fileCount: 5,
            description: 'LevelDB key-value store holding client web app states.',
            criticalForSession: true,
            safeToPurge: false,
            category: 'storage',
          },
          {
            id: 'sb-cache',
            name: 'Chromium HTTP Cache',
            relativePath: 'Default/Cache/Cache_Data',
            sizeBytes: 18400000,
            fileCount: 88,
            description: 'Cached scripts and stylesheets.',
            criticalForSession: false,
            safeToPurge: true,
            category: 'cache',
          },
        ],
        totalSizeBytes: 19564320,
        activeSessionsCount: 1,
        lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'prof-ephemeral-mobile-03',
        name: 'Ephemeral Mobile Auditor (Clean-Room)',
        description: 'Temporary sandbox context with zero-persistence policy. Purges all filesystem artifacts immediately on teardown.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        isPersistent: false,
        userDataDir: '/tmp/automation_ephemeral_e83fa9',
        diskCacheDir: '/tmp/automation_ephemeral_e83fa9/cache',
        profileDirectory: 'Default',
        proxy: {
          enabled: false,
          protocol: 'http',
          host: '',
          port: 8080,
          authMethod: 'native_context',
          testStatus: 'idle',
        },
        fingerprint: {
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          viewportWidth: 412,
          viewportHeight: 915,
          deviceScaleFactor: 2.625,
          isMobile: true,
          hasTouch: true,
          timezoneId: 'America/Los_Angeles',
          locale: 'en-US',
          languages: ['en-US', 'en'],
          webglVendor: 'Qualcomm',
          webglRenderer: 'Adreno (TM) 750',
          hardwareConcurrency: 8,
          deviceMemory: 12,
          maskWebDriver: true,
          noiseCanvas: false,
          noiseAudio: false,
        },
        extraFlags: [
          '--disable-blink-features=AutomationControlled',
        ],
        storageBuckets: [
          {
            id: 'sb-cookies',
            name: 'Network Cookies (SQLite)',
            relativePath: 'Default/Network/Cookies',
            sizeBytes: 32768,
            fileCount: 1,
            description: 'Temporary cookies in ephemeral sandbox.',
            criticalForSession: false,
            safeToPurge: true,
            category: 'network',
          },
          {
            id: 'sb-cache',
            name: 'Chromium HTTP Cache',
            relativePath: 'Default/Cache/Cache_Data',
            sizeBytes: 4200000,
            fileCount: 30,
            description: 'Temporary cache in ram/tmpfs.',
            criticalForSession: false,
            safeToPurge: true,
            category: 'cache',
          },
        ],
        totalSizeBytes: 4232768,
        activeSessionsCount: 0,
      },
    ];

    for (const p of defaultProfiles) {
      this.profiles.set(p.id, p);
    }
  }

  public getAllProfiles(): BrowserProfile[] {
    return Array.from(this.profiles.values());
  }

  public getProfile(id: string): BrowserProfile | undefined {
    return this.profiles.get(id);
  }

  public createProfile(data: Partial<BrowserProfile>): BrowserProfile {
    const id = `prof-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const baseDir = data.isPersistent ? `/var/automation/profiles/${id}` : `/tmp/automation_ephemeral_${id}`;
    
    const newProfile: BrowserProfile = {
      id,
      name: data.name || 'New Isolated Chromium Profile',
      description: data.description || 'Isolated browser environment with distinct filesystem and proxy binding.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPersistent: data.isPersistent ?? true,
      userDataDir: data.userDataDir || `${baseDir}/user_data`,
      diskCacheDir: data.diskCacheDir || `${baseDir}/cache_data`,
      profileDirectory: data.profileDirectory || 'Default',
      proxy: data.proxy || {
        enabled: false,
        protocol: 'http',
        host: '',
        port: 8080,
        authMethod: 'loopback_tunnel',
        testStatus: 'idle',
      },
      fingerprint: data.fingerprint || {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewportWidth: 1920,
        viewportHeight: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        timezoneId: 'UTC',
        locale: 'en-US',
        languages: ['en-US'],
        webglVendor: 'Google Inc. (NVIDIA)',
        webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070)',
        hardwareConcurrency: 8,
        deviceMemory: 16,
        maskWebDriver: true,
        noiseCanvas: true,
        noiseAudio: true,
      },
      extraFlags: data.extraFlags || ['--disable-blink-features=AutomationControlled'],
      storageBuckets: [
        {
          id: 'sb-cookies',
          name: 'Network Cookies (SQLite)',
          relativePath: 'Default/Network/Cookies',
          sizeBytes: 0,
          fileCount: 0,
          description: 'Empty cookie store ready for session isolation.',
          criticalForSession: true,
          safeToPurge: true,
          category: 'network',
        },
        {
          id: 'sb-localstorage',
          name: 'Local Storage (LevelDB)',
          relativePath: 'Default/Local Storage/leveldb',
          sizeBytes: 0,
          fileCount: 0,
          description: 'Empty key-value storage partition.',
          criticalForSession: true,
          safeToPurge: true,
          category: 'storage',
        },
        {
          id: 'sb-cache',
          name: 'Chromium HTTP Cache',
          relativePath: 'Default/Cache/Cache_Data',
          sizeBytes: 0,
          fileCount: 0,
          description: 'Dedicated isolated cache directory.',
          criticalForSession: false,
          safeToPurge: true,
          category: 'cache',
        },
      ],
      totalSizeBytes: 0,
      activeSessionsCount: 0,
    };

    this.profiles.set(id, newProfile);
    this.persistCatalog();
    return newProfile;
  }

  public updateProfile(id: string, updates: Partial<BrowserProfile>): BrowserProfile | null {
    const existing = this.profiles.get(id);
    if (!existing) return null;

    const updated: BrowserProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(id, updated);
    this.persistCatalog();
    return updated;
  }

  public deleteProfile(id: string): boolean {
    const deleted = this.profiles.delete(id);
    if (deleted) this.persistCatalog();
    return deleted;
  }

  /**
   * Cleans stale Chromium singleton lock files (SingletonLock, SingletonCookie, SingletonSocket)
   * which cause crashes like "ProcessSingleton::Create() - Chrome is already running"
   */
  public sanitizeLocks(id: string): { success: boolean; clearedFiles: string[] } {
    const profile = this.profiles.get(id);
    if (!profile) return { success: false, clearedFiles: [] };

    const userDataDir = this.runtimeUserDataDir(profile.id);
    const cleared: string[] = [];
    for (const lockFile of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      const lockPath = path.join(userDataDir, lockFile);
      if (fs.existsSync(lockPath)) {
        fs.rmSync(lockPath, { force: true });
        cleared.push(lockPath);
      }
    }

    return {
      success: true,
      clearedFiles: cleared,
    };
  }

  /**
   * Purges specific storage bucket (e.g. cookies or cache) without wiping the entire profile
   */
  public purgeBucket(profileId: string, bucketId: string): { success: boolean; freedBytes: number } {
    const profile = this.profiles.get(profileId);
    if (!profile) return { success: false, freedBytes: 0 };

    let freed = 0;
    const bucket = profile.storageBuckets.find(b => b.id === bucketId);
    if (bucket) {
      freed = bucket.sizeBytes;
      bucket.sizeBytes = 0;
      bucket.fileCount = 0;
      const bucketPath = path.resolve(this.runtimeUserDataDir(profile.id), bucket.relativePath);
      const userDataRoot = path.resolve(this.runtimeUserDataDir(profile.id));
      if (bucketPath === userDataRoot || !bucketPath.startsWith(`${userDataRoot}${path.sep}`)) {
        return { success: false, freedBytes: 0 };
      }
      fs.rmSync(bucketPath, { recursive: true, force: true });
    }

    profile.totalSizeBytes = Math.max(0, profile.totalSizeBytes - freed);
    profile.updatedAt = new Date().toISOString();
    this.persistCatalog();
    return { success: true, freedBytes: freed };
  }

  /**
   * Full Clean-Room Reset: purges all runtime caches, cookies, and leveldb while retaining profile structure
   */
  public resetProfileCleanRoom(profileId: string): { success: boolean; freedBytes: number } {
    const profile = this.profiles.get(profileId);
    if (!profile) return { success: false, freedBytes: 0 };

    let totalFreed = 0;
    for (const b of profile.storageBuckets) {
      if (b.category !== 'metadata') {
        totalFreed += b.sizeBytes;
        b.sizeBytes = 0;
        b.fileCount = 0;
      }
    }

    profile.totalSizeBytes = Math.max(0, profile.totalSizeBytes - totalFreed);
    profile.updatedAt = new Date().toISOString();
    const userDataDir = this.runtimeUserDataDir(profile.id);
    for (const relativePath of ['Default/Network/Cookies', 'Default/Local Storage', 'Default/IndexedDB', 'Default/Cache']) {
      fs.rmSync(path.join(userDataDir, relativePath), { recursive: true, force: true });
    }
    fs.rmSync(this.runtimeCacheDir(profile.id), { recursive: true, force: true });
    this.persistCatalog();
    return { success: true, freedBytes: totalFreed };
  }

  private runtimeProfileRoot(profileId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(profileId)) throw new Error('Invalid profile id');
    return path.resolve(process.env.PROFILE_ROOT || path.join(process.cwd(), 'profiles_data'), profileId);
  }

  private runtimeUserDataDir(profileId: string): string {
    return path.join(this.runtimeProfileRoot(profileId), 'user_data');
  }

  private runtimeCacheDir(profileId: string): string {
    return path.join(this.runtimeProfileRoot(profileId), 'cache_data');
  }

  private loadCatalog(): void {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(this.catalogPath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      for (const profile of parsed) {
        if (profile && typeof profile === 'object' && 'id' in profile && typeof profile.id === 'string') {
          this.profiles.set(profile.id, profile as BrowserProfile);
        }
      }
    } catch {
      // A missing or invalid catalog should fall back to seeded profiles.
    }
  }

  private persistCatalog(): void {
    const profiles = this.getAllProfiles().map((profile) => ({
      ...profile,
      proxy: {
        ...profile.proxy,
        password: profile.proxy.password ? '••••••••••••••••' : undefined,
      },
    }));
    fs.writeFileSync(this.catalogPath, JSON.stringify(profiles, null, 2), 'utf8');
  }
}

export const globalProfileManager = new ProfileManager();
