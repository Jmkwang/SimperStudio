export const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

export function withTimeout<T>(promise: Promise<T>, ms: number, fallbackError: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(fallbackError)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export function getByPath(obj: any, path: string): any {
  if (!path) return undefined;
  const normalizedPath = path.startsWith('payload.') ? path.slice('payload.'.length) : path;
  if (!normalizedPath) return obj;
  return normalizedPath.split('.').reduce((acc: any, key: string) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

export function setByPath(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] === undefined || cur[keys[i]] === null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

export async function evaluateExpression(expression: string, payload: any, timeoutMs: number): Promise<boolean> {
  const expressionJs = `try { with(payload) { return ${expression}; } } catch(e) { return false; }`;
  const evaluateFn = new AsyncFunction('payload', expressionJs);
  return withTimeout(evaluateFn(structuredClone(payload)), timeoutMs, 'Expression evaluation timed out');
}

export function evaluateExpressionSync(expression: string, payload: any): any {
  const fn = new Function('payload', `with(payload) { return ${expression}; }`);
  return fn(payload);
}

export function validateSchema(data: any, schemaStr: string | undefined, label: string): string | null {
  if (!schemaStr) return null;
  try {
    const schema = JSON.parse(schemaStr);
    for (const [key, type] of Object.entries(schema)) {
      const val = data?.[key];
      if (type === 'string' && typeof val !== 'string') return `${label}: "${key}" expected string, got ${typeof val}`;
      if (type === 'number' && typeof val !== 'number') return `${label}: "${key}" expected number, got ${typeof val}`;
      if (type === 'boolean' && typeof val !== 'boolean') return `${label}: "${key}" expected boolean, got ${typeof val}`;
      if (type === 'object' && (typeof val !== 'object' || val === null)) return `${label}: "${key}" expected object, got ${typeof val}`;
      if (type === 'array' && !Array.isArray(val)) return `${label}: "${key}" expected array, got ${typeof val}`;
    }
  } catch { /* ignore invalid schema */ }
  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function createExecutionHelpers(fetchNode: (nodeId: string) => any) {
  return {
    getByPath,
    setByPath,
    evaluateExpression,
    evaluateExpressionSync,
    withTimeout,
    sleep,
    validateSchema,
    AsyncFunction,
    fetchNode,
  };
}
