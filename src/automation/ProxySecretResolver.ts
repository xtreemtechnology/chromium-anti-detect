import { BrowserProfile, ProxyConfig } from './types';

const REDACTED_PASSWORD = '••';

export function resolveProxyPassword(profile: BrowserProfile): string | undefined {
  const configured = profile.proxy.password;
  if (configured && !configured.startsWith(REDACTED_PASSWORD)) return configured;
  const environmentKey = `PROXY_PASSWORD_${profile.id.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  return process.env[environmentKey] || undefined;
}

export function withResolvedProxySecret(profile: BrowserProfile): ProxyConfig {
  const password = resolveProxyPassword(profile);
  return {
    ...profile.proxy,
    ...(password ? { password } : {}),
  };
}