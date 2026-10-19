/**
 * Production-Grade Python Playwright Script Generator
 * Generates fully typed, async Python scripts with isolated context storage,
 * per-profile proxy authentication, and CDP session hooks.
 */

import { BrowserProfile } from './types';

export class PythonPlaywrightOrchestrator {
  public static generateScript(profile: BrowserProfile, targetUrl = 'https://example.com'): string {
    return `"""
Playwright Python Automation Runner
Generated for Profile: "${profile.name}" (${profile.id})

Production Architecture:
- Isolated Persistent Storage (--user-data-dir): ${profile.userDataDir}
- Per-Profile Proxy Authentication: ${profile.proxy.enabled ? `${profile.proxy.protocol}://${profile.proxy.host}:${profile.proxy.port}` : 'None'}
- Strict Separation of Browser States
- Asyncio Event Loop & Signal Trapping
"""

import asyncio
import os
import shutil
import json
from typing import Dict, Any
from playwright.async_api import async_playwright, BrowserContext, Page, CDPSession

def sanitize_locks(user_data_dir: str) -> None:
    """Removes stale Chromium lock files left from abrupt process termination."""
    lock_files = ["SingletonLock", "SingletonCookie", "SingletonSocket"]
    for lock in lock_files:
        path = os.path.join(user_data_dir, lock)
        try:
            if os.path.exists(path):
                os.remove(path)
                print(f"[Sanitizer] Removed stale lock: {path}")
        except OSError:
            pass

async def main() -> None:
    user_data_dir = "${profile.userDataDir}"
    disk_cache_dir = "${profile.diskCacheDir}"

    os.makedirs(user_data_dir, exist_ok=True)
    os.makedirs(disk_cache_dir, exist_ok=True)
    sanitize_locks(user_data_dir)

    print("[Python Runner] Starting isolated Playwright persistent context...")

    ${profile.proxy.enabled ? `
    proxy_config: Dict[str, str] = {
        "server": "${profile.proxy.protocol}://${profile.proxy.host}:${profile.proxy.port}",
        "username": "${profile.proxy.username || ''}",
        "password": "${profile.proxy.password || ''}",
        "bypass": "${profile.proxy.bypassList ? profile.proxy.bypassList.join(',') : 'localhost,127.0.0.1'}",
    }
    ` : 'proxy_config = None'}

    chromium_args = [
        f"--disk-cache-dir={disk_cache_dir}",
        "--password-store=basic",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-features=Translate,OptimizationHints,MediaRouter",
        "--disable-blink-features=AutomationControlled",
    ]

    async with async_playwright() as p:
        context: BrowserContext = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=True,
            channel="chromium",
            viewport={
                "width": ${profile.fingerprint.viewportWidth},
                "height": ${profile.fingerprint.viewportHeight},
            },
            user_agent="${profile.fingerprint.userAgent}",
            device_scale_factor=${profile.fingerprint.deviceScaleFactor},
            is_mobile=${profile.fingerprint.isMobile ? 'True' : 'False'},
            has_touch=${profile.fingerprint.hasTouch ? 'True' : 'False'},
            locale="${profile.fingerprint.locale}",
            timezone_id="${profile.fingerprint.timezoneId}",
            proxy=proxy_config,
            args=chromium_args,
        )

        try:
            # Inject stealth evasions into every page in this context
            stealth_js = """
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
            Object.defineProperty(navigator, 'languages', { get: () => ${JSON.stringify(profile.fingerprint.languages)} });
            """
            await context.add_init_script(stealth_js)

            pages = context.pages
            page: Page = pages[0] if pages else await context.new_page()

            # Attach direct Chrome DevTools Protocol (CDP) session
            cdp: CDPSession = await context.new_cdp_session(page)
            await cdp.send("Network.enable")

            print("[Python Runner] Navigating to: ${targetUrl}")
            response = await page.goto("${targetUrl}", wait_until="domcontentloaded", timeout=30000)
            status_code = response.status if response else 0
            print(f"[Python Runner] HTTP Status: {status_code}")

            # Inspect isolated browser state
            state_audit: Dict[str, Any] = await page.evaluate("""() => ({
                webdriver: navigator.webdriver,
                userAgent: navigator.userAgent,
                hardwareConcurrency: navigator.hardwareConcurrency,
                cookieCount: document.cookie ? document.cookie.split(';').length : 0,
                localStorageKeys: Object.keys(localStorage),
            })""")

            print("[Python Runner] Context State Audit:", json.dumps(state_audit, indent=2))

        except Exception as e:
            print(f"[Python Runner] Execution error: {e}")
            raise
        finally:
            print("[Python Runner] Teardown: Closing persistent context...")
            await context.close()
            ${!profile.isPersistent ? `
            # Ephemeral cleanup
            try:
                shutil.rmtree(user_data_dir, ignore_errors=True)
                shutil.rmtree(disk_cache_dir, ignore_errors=True)
                print("[Python Runner] Ephemeral directory removed.")
            except Exception as e:
                print(f"[Python Runner] Cleanup error: {e}")
            ` : `
            print(f"[Python Runner] State preserved in {user_data_dir}")
            `}

if __name__ == "__main__":
    asyncio.run(main())
`;
  }
}
