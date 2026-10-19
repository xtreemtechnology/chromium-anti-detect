import { BrowserProfile } from './types';

export interface ProfileAuditFinding {
  severity: 'error' | 'warning';
  field: string;
  message: string;
}

export function auditProfile(profile: BrowserProfile): ProfileAuditFinding[] {
  const findings: ProfileAuditFinding[] = [];
  const fingerprint = profile.fingerprint;
  const userAgent = fingerprint.userAgent.toLowerCase();
  const mobileUa = /android|mobile|iphone|ipad/.test(userAgent);

  if (fingerprint.isMobile !== mobileUa) {
    findings.push({ severity: 'error', field: 'fingerprint.isMobile', message: 'Mobile flag does not match the user agent.' });
  }
  if (fingerprint.hasTouch !== (fingerprint.isMobile || /touch/.test(userAgent))) {
    findings.push({ severity: 'warning', field: 'fingerprint.hasTouch', message: 'Touch capability may not match the selected device family.' });
  }
  if (fingerprint.viewportWidth <= 0 || fingerprint.viewportHeight <= 0) {
    findings.push({ severity: 'error', field: 'fingerprint.viewport', message: 'Viewport dimensions must be positive.' });
  }
  if (!Number.isInteger(fingerprint.hardwareConcurrency) || fingerprint.hardwareConcurrency < 1) {
    findings.push({ severity: 'error', field: 'fingerprint.hardwareConcurrency', message: 'Hardware concurrency must be a positive integer.' });
  }
  if (!Number.isInteger(fingerprint.deviceMemory) || fingerprint.deviceMemory < 1) {
    findings.push({ severity: 'error', field: 'fingerprint.deviceMemory', message: 'Device memory must be a positive integer.' });
  }
  if (!fingerprint.languages.includes(fingerprint.locale)) {
    findings.push({ severity: 'warning', field: 'fingerprint.languages', message: 'The primary locale is missing from navigator.languages.' });
  }
  if (profile.proxy.enabled && (!profile.proxy.host || profile.proxy.port < 1 || profile.proxy.port > 65535)) {
    findings.push({ severity: 'error', field: 'proxy', message: 'Enabled proxy is missing a valid host or port.' });
  }
  if (profile.userDataDir === profile.diskCacheDir) {
    findings.push({ severity: 'error', field: 'storage', message: 'User data and disk cache directories must be different.' });
  }
  return findings;
}