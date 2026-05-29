import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

export const setTransformExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const d = node.data as any;
  const mappings = (d?.mappings || []) as { sourcePath: string; targetPath: string }[];
  const constantsRaw = String(d?.constants || '');
  const whitelistRaw = String(d?.whitelist || '');
  let result: any = {};
  for (const m of mappings) {
    const val = helpers.getByPath(payload, m.sourcePath);
    helpers.setByPath(result, m.targetPath, val);
  }
  if (constantsRaw) {
    try { result = { ...result, ...JSON.parse(constantsRaw) }; } catch { /* ignore invalid constants */ }
  }
  if (whitelistRaw) {
    const paths = whitelistRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
    const filtered: any = {};
    for (const p of paths) {
      const v = helpers.getByPath(result, p);
      if (v !== undefined) helpers.setByPath(filtered, p, v);
    }
    result = filtered;
  }
  return { ...payload, ...result, output: result };
};
