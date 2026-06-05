export function withTimeout<T>(promise: Promise<T>, ms: number, fallbackError: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(fallbackError)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

// ── Safe Expression Evaluator (replaces new Function / with(payload)) ──

interface ExprToken {
  type: 'num' | 'str' | 'bool' | 'null' | 'ident' | 'op' | 'paren' | 'bracket' | 'comma' | 'eof';
  value: string | number | boolean | null;
}

function tokenizeExpression(expr: string): ExprToken[] {
  const tokens: ExprToken[] = [];
  let i = 0;
  const skipWhitespace = () => { while (i < expr.length && /\s/.test(expr[i])) i++; };

  while (i < expr.length) {
    skipWhitespace();
    if (i >= expr.length) break;
    const ch = expr[i];

    // Numbers
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i + 1] || ''))) {
      let start = i;
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) i++;
      tokens.push({ type: 'num', value: parseFloat(expr.slice(start, i)) });
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let start = ++i;
      let str = '';
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          str += expr.slice(start, i);
          i++;
          const esc = expr[i];
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === 'r') str += '\r';
          else str += esc;
          i++;
          start = i;
        } else {
          i++;
        }
      }
      str += expr.slice(start, i);
      i++; // skip closing quote
      tokens.push({ type: 'str', value: str });
      continue;
    }

    // Operators and multi-char tokens
    const twoChar = expr.slice(i, i + 2);
    if (twoChar === '===' || twoChar === '!==' || twoChar === '==' || twoChar === '!=' || twoChar === '<=' || twoChar === '>=' || twoChar === '&&' || twoChar === '||') {
      tokens.push({ type: 'op', value: twoChar });
      i += 2;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '<' || ch === '>' || ch === '!' || ch === '=' || ch === '?') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    // Parentheses / brackets / comma / dot
    if (ch === '(' || ch === ')') { tokens.push({ type: 'paren', value: ch }); i++; continue; }
    if (ch === '[' || ch === ']') { tokens.push({ type: 'bracket', value: ch }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ch }); i++; continue; }
    if (ch === '.') { tokens.push({ type: 'op', value: ch }); i++; continue; }

    // Identifiers / booleans / null
    if (/[a-zA-Z_$]/.test(ch)) {
      let start = i;
      while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) i++;
      const word = expr.slice(start, i);
      if (word === 'true') tokens.push({ type: 'bool', value: true });
      else if (word === 'false') tokens.push({ type: 'bool', value: false });
      else if (word === 'null') tokens.push({ type: 'null', value: null });
      else tokens.push({ type: 'ident', value: word });
      continue;
    }

    // Unknown character — skip to avoid infinite loop
    i++;
  }

  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

class ExprParser {
  private tokens: ExprToken[];
  private pos = 0;

  constructor(tokens: ExprToken[]) {
    this.tokens = tokens;
  }

  private current(): ExprToken { return this.tokens[this.pos] || { type: 'eof', value: '' }; }
  private advance(): ExprToken { return this.tokens[this.pos++] || { type: 'eof', value: '' }; }

  parse(): ExprNode { return this.parseTernary(); }

  private parseTernary(): ExprNode {
    let node = this.parseOr();
    if (this.current().type === 'op' && this.current().value === '?') {
      this.advance();
      const trueBranch = this.parseTernary();
      if (this.current().type === 'op' && this.current().value === ':') {
        this.advance();
        const falseBranch = this.parseTernary();
        return { type: 'ternary', condition: node, trueBranch, falseBranch };
      }
    }
    return node;
  }

  private parseOr(): ExprNode {
    let node = this.parseAnd();
    while (this.current().type === 'op' && this.current().value === '||') {
      this.advance();
      node = { type: 'binary', op: '||', left: node, right: this.parseAnd() };
    }
    return node;
  }

  private parseAnd(): ExprNode {
    let node = this.parseEquality();
    while (this.current().type === 'op' && this.current().value === '&&') {
      this.advance();
      node = { type: 'binary', op: '&&', left: node, right: this.parseEquality() };
    }
    return node;
  }

  private parseEquality(): ExprNode {
    let node = this.parseRelational();
    while (this.current().type === 'op' && (this.current().value === '==' || this.current().value === '===' || this.current().value === '!=' || this.current().value === '!==')) {
      const op = String(this.advance().value);
      node = { type: 'binary', op, left: node, right: this.parseRelational() };
    }
    return node;
  }

  private parseRelational(): ExprNode {
    let node = this.parseAdditive();
    while (this.current().type === 'op' && (this.current().value === '<' || this.current().value === '>' || this.current().value === '<=' || this.current().value === '>=')) {
      const op = String(this.advance().value);
      node = { type: 'binary', op, left: node, right: this.parseAdditive() };
    }
    return node;
  }

  private parseAdditive(): ExprNode {
    let node = this.parseMultiplicative();
    while (this.current().type === 'op' && (this.current().value === '+' || this.current().value === '-')) {
      const op = String(this.advance().value);
      node = { type: 'binary', op, left: node, right: this.parseMultiplicative() };
    }
    return node;
  }

  private parseMultiplicative(): ExprNode {
    let node = this.parseUnary();
    while (this.current().type === 'op' && (this.current().value === '*' || this.current().value === '/' || this.current().value === '%')) {
      const op = String(this.advance().value);
      node = { type: 'binary', op, left: node, right: this.parseUnary() };
    }
    return node;
  }

  private parseUnary(): ExprNode {
    if (this.current().type === 'op' && this.current().value === '!') {
      this.advance();
      return { type: 'unary', op: '!', operand: this.parseUnary() };
    }
    if (this.current().type === 'op' && this.current().value === '-') {
      this.advance();
      return { type: 'unary', op: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const tok = this.current();

    if (tok.type === 'num' || tok.type === 'str' || tok.type === 'bool' || tok.type === 'null') {
      this.advance();
      return { type: 'literal', value: tok.value };
    }

    if (tok.type === 'ident') {
      let name = String(tok.value);
      this.advance();
      // Property access chain: a.b.c or a[b]
      while (true) {
        if (this.current().type === 'op' && this.current().value === '.') {
          this.advance();
          const propTok = this.current();
          if (propTok.type === 'ident') {
            this.advance();
            name = name + '.' + String(propTok.value);
          } else {
            break;
          }
        } else if (this.current().type === 'bracket' && this.current().value === '[') {
          this.advance();
          const indexNode = this.parseTernary();
          if (this.current().type === 'bracket' && this.current().value === ']') {
            this.advance();
            return { type: 'member', object: { type: 'ident', name }, index: indexNode };
          } else {
            break;
          }
        } else {
          break;
        }
      }
      return { type: 'ident', name };
    }

    if (tok.type === 'paren' && tok.value === '(') {
      this.advance();
      const node = this.parseTernary();
      if (this.current().type === 'paren' && this.current().value === ')') {
        this.advance();
      }
      return node;
    }

    // Empty / unexpected — return null literal
    return { type: 'literal', value: null };
  }
}

type ExprNode =
  | { type: 'literal'; value: unknown }
  | { type: 'ident'; name: string }
  | { type: 'member'; object: ExprNode; index: ExprNode }
  | { type: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { type: 'unary'; op: string; operand: ExprNode }
  | { type: 'ternary'; condition: ExprNode; trueBranch: ExprNode; falseBranch: ExprNode };

function resolveIdent(name: string, payload: any): any {
  // Strip the conventional "payload." prefix so expressions like
  // "payload.value > 10" resolve against the payload object directly.
  const normalizedName = name.startsWith('payload.') ? name.slice('payload.'.length) : name;
  const parts = normalizedName.split('.');
  // If the first segment is "payload" itself (bare reference), return the whole object.
  if (normalizedName === 'payload') return payload;
  let value = payload;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = value[part];
  }
  return value;
}

function evalNode(node: ExprNode, payload: any): any {
  switch (node.type) {
    case 'literal':
      return node.value;
    case 'ident':
      return resolveIdent(node.name, payload);
    case 'member': {
      const obj = evalNode(node.object, payload);
      const idx = evalNode(node.index, payload);
      if (obj === null || obj === undefined) return undefined;
      return obj[idx];
    }
    case 'unary': {
      const val = evalNode(node.operand, payload);
      if (node.op === '!') return !val;
      if (node.op === '-') return -Number(val);
      return val;
    }
    case 'binary': {
      const left = evalNode(node.left, payload);
      const right = evalNode(node.right, payload);
      switch (node.op) {
        case '+': return Number(left) + Number(right);
        case '-': return Number(left) - Number(right);
        case '*': return Number(left) * Number(right);
        case '/': return Number(right) !== 0 ? Number(left) / Number(right) : Infinity;
        case '%': return Number(left) % Number(right);
        case '==': return left == right;
        case '===': return left === right;
        case '!=': return left != right;
        case '!==': return left !== right;
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        case '&&': return left && right;
        case '||': return left || right;
        default: return undefined;
      }
    }
    case 'ternary': {
      const cond = evalNode(node.condition, payload);
      return cond ? evalNode(node.trueBranch, payload) : evalNode(node.falseBranch, payload);
    }
  }
}

/** Evaluate a user-supplied expression safely (no arbitrary code execution). */
export function evaluateExpressionSafe(expression: string, payload: any): any {
  const tokens = tokenizeExpression(expression);
  const parser = new ExprParser(tokens);
  const ast = parser.parse();
  return evalNode(ast, payload);
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
  const result = await withTimeout(
    Promise.resolve(evaluateExpressionSafe(expression, structuredClone(payload))),
    timeoutMs,
    'Expression evaluation timed out'
  );
  return Boolean(result);
}

export function evaluateExpressionSync(expression: string, payload: any): any {
  return evaluateExpressionSafe(expression, payload);
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

/**
 * Replace template variables in a string with values from an object.
 * Supports {{path.to.value}} syntax.
 */
export function replaceTemplateVars(template: string, payload: any): string {
  if (!template) return '';
  return template.replace(/\{\{(.*?)\}\}/g, (match, path) => {
    const value = getByPath(payload, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Escape a string value for safe embedding in a JSON string literal context.
 * Backslash-escapes backslashes, double-quotes, and control characters.
 */
function escapeForJson(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\x00-\x1f]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * Like replaceTemplateVars but escapes interpolated values for embedding
 * inside a JSON string literal (e.g. inside double-quoted JSON fields).
 * Use this when the template result will be parsed as JSON.
 */
export function replaceTemplateVarsSafe(template: string, payload: any): string {
  if (!template) return '';
  return template.replace(/\{\{(.*?)\}\}/g, (match, path) => {
    const value = getByPath(payload, path.trim());
    if (value === undefined) return match;
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return escapeForJson(String(value));
  });
}

export function createExecutionHelpers(
  fetchNode: (nodeId: string) => any,
  globalState?: Record<string, any>,
  executeWorkflow?: (workflowId: string, initialPayload: Record<string, any>) => Promise<any>,
  signal?: AbortSignal,
) {
  return {
    getByPath,
    setByPath,
    evaluateExpression,
    evaluateExpressionSync,
    withTimeout,
    sleep,
    validateSchema,
    replaceTemplateVars,
    replaceTemplateVarsSafe,
    fetchNode,
    getGlobalState: globalState ? (key: string) => globalState[key] : undefined,
    executeWorkflow,
    signal,
  };
}
