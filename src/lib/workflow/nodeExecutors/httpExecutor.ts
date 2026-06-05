import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

/** SSRF protection: validate URL before fetch */
function validateUrl(urlStr: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return 'Invalid URL format';
  }

  // Only allow http and https protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Protocol "${parsed.protocol}" is not allowed. Only http: and https: are permitted.`;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback addresses
  const blockedHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]'];
  if (blockedHosts.includes(hostname)) {
    return `Request to "${hostname}" is blocked (localhost/loopback).`;
  }

  // Block private IP ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    // 10.0.0.0/8
    if (a === 10) return 'Requests to private IP range 10.x.x.x are blocked.';
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return 'Requests to private IP range 172.16-31.x.x are blocked.';
    // 192.168.0.0/16
    if (a === 192 && b === 168) return 'Requests to private IP range 192.168.x.x are blocked.';
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return 'Requests to link-local IP range 169.254.x.x are blocked.';
  }

  return null; // Valid
}

export const httpExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const data = node.data as Record<string, unknown>;
  const method = String(data.method || 'GET').toUpperCase();
  const urlRaw = String(data.url || '');
  const url = urlRaw.replace(/\{\{(.*?)\}\}/g, (_m: string, expr: string) => {
    try { return String(helpers.evaluateExpressionSync(expr.trim(), payload)); } catch { return ''; }
  });

  // SSRF validation
  const urlError = validateUrl(url);
  if (urlError) {
    return { ...payload, _error: `HTTP request blocked: ${urlError}` };
  }

  const headersRaw = String(data.headers || '');
  const headers = headersRaw ? JSON.parse(
    headersRaw.replace(/\{\{(.*?)\}\}/g, (_m: string, expr: string) => {
      try { return JSON.stringify(helpers.evaluateExpressionSync(expr.trim(), payload)); } catch { return '""'; }
    })
  ) : {};
  const bodyRaw = String(data.body || '');
  const body = bodyRaw ? bodyRaw.replace(/\{\{(.*?)\}\}/g, (_m: string, expr: string) => {
    try { return JSON.stringify(helpers.evaluateExpressionSync(expr.trim(), payload)); } catch { return '""'; }
  }) : undefined;
  const httpTimeout = Number(data.timeoutMs) || 30000;
  const fetchOptions: RequestInit = { method, headers };
  if (body && method !== 'GET') fetchOptions.body = body;

  const response = await helpers.withTimeout(
    fetch(url, fetchOptions),
    httpTimeout,
    `HTTP ${method} timed out after ${httpTimeout}ms`
  );
  const contentType = response.headers.get('content-type') || '';
  let responseData: any;
  if (contentType.includes('application/json')) responseData = await response.json();
  else responseData = await response.text();
  return { ...payload, httpStatus: response.status, httpData: responseData, output: responseData };
};
