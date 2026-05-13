import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

export const httpExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const method = String(node.data?.method || 'GET').toUpperCase();
  const urlRaw = String(node.data?.url || '');
  const url = urlRaw.replace(/\{\{(.*?)\}\}/g, (_m: string, expr: string) => {
    try { return String(helpers.evaluateExpressionSync(expr.trim(), payload)); } catch { return ''; }
  });
  const headersRaw = String(node.data?.headers || '');
  const headers = headersRaw ? JSON.parse(
    headersRaw.replace(/\{\{(.*?)\}\}/g, (_m: string, expr: string) => {
      try { return JSON.stringify(helpers.evaluateExpressionSync(expr.trim(), payload)); } catch { return '""'; }
    })
  ) : {};
  const bodyRaw = String(node.data?.body || '');
  const body = bodyRaw ? bodyRaw.replace(/\{\{(.*?)\}\}/g, (_m: string, expr: string) => {
    try { return JSON.stringify(helpers.evaluateExpressionSync(expr.trim(), payload)); } catch { return '""'; }
  }) : undefined;
  const httpTimeout = Number(node.data?.timeoutMs) || 30000;
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
