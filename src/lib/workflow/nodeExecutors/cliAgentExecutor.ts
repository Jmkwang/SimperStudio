import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { NodeExecutorFn } from '../types';
import { CliToolPreset } from '@/types/models';

const BUILTIN_PRESETS: CliToolPreset[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    executable: 'claude',
    defaultArgs: ['--print', '--output-format', 'json'],
    description: 'Anthropic Claude Code CLI agent',
  },
  {
    id: 'aider',
    name: 'Aider',
    executable: 'aider',
    defaultArgs: ['--no-auto-commits', '--yes-always'],
    description: 'Aider AI pair programming tool',
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    executable: 'cursor',
    defaultArgs: ['agent'],
    description: 'Cursor IDE CLI agent mode',
  },
  {
    id: 'custom',
    name: 'Custom Command',
    executable: '',
    defaultArgs: [],
    description: 'Run any arbitrary CLI command',
  },
];

function resolvePreset(presetId: string, userPresets?: CliToolPreset[]): CliToolPreset | undefined {
  const userPreset = userPresets?.find(p => p.id === presetId);
  const builtinPreset = BUILTIN_PRESETS.find(p => p.id === presetId);
  // Merge: user overrides take precedence for executable/args
  if (userPreset && builtinPreset) {
    return { ...builtinPreset, ...userPreset };
  }
  return userPreset || builtinPreset;
}

function parseArgsString(argsStr: string | undefined): string[] {
  if (!argsStr?.trim()) return [];
  // Simple split respecting quoted strings
  const args: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  for (const ch of argsStr) {
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

interface FileSnapshot {
  relativePath: string;
  modifiedMs: number;
  sizeBytes: number;
}

function computeFileChanges(before: FileSnapshot[], after: FileSnapshot[]) {
  const beforeMap = new Map(before.map(f => [f.relativePath, f]));
  const afterMap = new Map(after.map(f => [f.relativePath, f]));

  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  for (const [path, file] of afterMap) {
    const prev = beforeMap.get(path);
    if (!prev) {
      added.push(path);
    } else if (prev.modifiedMs !== file.modifiedMs || prev.sizeBytes !== file.sizeBytes) {
      modified.push(path);
    }
  }

  for (const path of beforeMap.keys()) {
    if (!afterMap.has(path)) {
      deleted.push(path);
    }
  }

  return { added, modified, deleted };
}

const MAX_OUTPUT_BYTES = 1024 * 1024; // 1MB cap

export const cliAgentExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const data = node.data as any;

  // 1. Resolve executable and args
  let executable: string;
  let args: string[];

  if (data.mode === 'preset') {
    const preset = resolvePreset(data.presetId, helpers.getGlobalState?.('settings')?.cliTools?.presets);
    if (!preset) {
      return { ...payload, _error: `CLI preset not found: ${data.presetId}` };
    }
    executable = preset.executable;
    args = [...preset.defaultArgs];
    // Append prompt as the last argument if inputMode is prompt-template
    if (data.inputMode === 'prompt-template' && data.promptTemplate) {
      const prompt = helpers.replaceTemplateVars(data.promptTemplate, payload);
      args.push(prompt);
    }
  } else {
    // Custom mode
    executable = helpers.replaceTemplateVars(data.executable || '', payload);
    const rawArgs = helpers.replaceTemplateVars(data.args || '', payload);
    args = parseArgsString(rawArgs);
    // Append prompt as last arg if prompt-template mode
    if (data.inputMode === 'prompt-template' && data.promptTemplate) {
      const prompt = helpers.replaceTemplateVars(data.promptTemplate, payload);
      args.push(prompt);
    }
  }

  if (!executable) {
    return { ...payload, _error: 'CLI Agent: no executable specified' };
  }

  // 2. Resolve working directory
  let workingDir = data.workingDir
    ? helpers.replaceTemplateVars(data.workingDir, payload)
    : undefined;
  if (!workingDir) {
    workingDir = helpers.getGlobalState?.('settings')?.cliTools?.defaultWorkingDir;
  }

  // 3. Build stdin input (for payload mode)
  let stdinInput: string | undefined;
  if (data.inputMode === 'payload') {
    const inputField = data.inputField;
    const inputPayload = inputField ? helpers.getByPath(payload, inputField) : payload;
    stdinInput = JSON.stringify(inputPayload, null, 2);
  }

  // 4. Parse env vars
  let envVars: Record<string, string> | undefined;
  if (data.envVars) {
    try {
      const resolved = helpers.replaceTemplateVars(data.envVars, payload);
      envVars = JSON.parse(resolved);
    } catch {
      return { ...payload, _error: 'CLI Agent: invalid envVars JSON' };
    }
  }

  // 5. User confirmation
  if (data.requireConfirmation !== false) {
    const cmdPreview = `${executable} ${args.join(' ')}`;
    const dirPreview = workingDir || '(current directory)';
    const confirmed = confirm(
      `CLI Agent will execute:\n\n` +
      `Command: ${cmdPreview}\n` +
      `Working Directory: ${dirPreview}\n\n` +
      `Do you want to proceed?`
    );
    if (!confirmed) {
      return { ...payload, _error: 'CLI Agent: execution cancelled by user' };
    }
  }

  const executionId = `cli-${node.id}-${Date.now()}`;
  const unlisteners: UnlistenFn[] = [];

  try {
    // 6. File snapshot (before)
    let beforeSnapshot: FileSnapshot[] = [];
    if (workingDir) {
      try {
        beforeSnapshot = await invoke<FileSnapshot[]>('get_working_dir_snapshot', { dir: workingDir });
      } catch {
        // Non-critical: skip file change detection
      }
    }

    // 7. Spawn + Listen
    let stdout = '';
    let stderr = '';
    let truncated = false;

    const outputListener = await listen<{ executionId: string; stream: string; line: string }>(
      'cli-output',
      (event) => {
        if (event.payload.executionId !== executionId) return;
        const line = event.payload.line + '\n';
        if (event.payload.stream === 'stdout') {
          if (stdout.length + line.length <= MAX_OUTPUT_BYTES) {
            stdout += line;
          } else if (!truncated) {
            truncated = true;
            stdout += '\n[Output truncated at 1MB]\n';
          }
        } else {
          stderr += line;
        }
      }
    );
    unlisteners.push(outputListener);

    const exitPromise = new Promise<{ exitCode: number | null; success: boolean; error?: string }>((resolve) => {
      listen<{ executionId: string; exitCode: number | null; success: boolean; error?: string }>(
        'cli-exit',
        (event) => {
          if (event.payload.executionId !== executionId) return;
          resolve({
            exitCode: event.payload.exitCode,
            success: event.payload.success,
            error: event.payload.error,
          });
        }
      ).then(fn => unlisteners.push(fn));
    });

    // 8. Abort support
    const onAbort = () => {
      invoke('kill_cli_agent', { executionId }).catch(() => {});
    };
    helpers.signal?.addEventListener('abort', onAbort, { once: true });

    // 9. Invoke Tauri command (non-blocking spawn)
    const timeoutMs = data.timeoutMs || helpers.getGlobalState?.('settings')?.cliTools?.defaultTimeoutMs || 300000;

    invoke('spawn_cli_agent', {
      request: {
        executionId,
        executable,
        args,
        workingDir: workingDir || undefined,
        envVars,
        stdinInput,
        timeoutMs,
      },
    }).catch(() => {
      // Error handled via exit event
    });

    // 10. Wait for exit
    const exitResult = await exitPromise;

    // Cleanup abort listener
    helpers.signal?.removeEventListener('abort', onAbort);

    // 11. File snapshot (after) + change detection
    let fileChanges: { added: string[]; modified: string[]; deleted: string[] } | undefined;
    if (workingDir && beforeSnapshot.length > 0) {
      try {
        const afterSnapshot = await invoke<FileSnapshot[]>('get_working_dir_snapshot', { dir: workingDir });
        fileChanges = computeFileChanges(beforeSnapshot, afterSnapshot);
      } catch {
        // Non-critical
      }
    }

    // 12. Build result
    const outputField = data.outputField || 'cliOutput';
    let outputValue: any = stdout.trim();

    if (data.parseJson !== false && outputValue) {
      try {
        outputValue = JSON.parse(outputValue);
      } catch {
        // Keep as string
      }
    }

    return {
      ...payload,
      [outputField]: outputValue || null,
      cliStderr: data.captureStderr !== false ? stderr.trim() : undefined,
      cliExitCode: exitResult.exitCode,
      cliSuccess: exitResult.success,
      cliFileChanges: fileChanges,
      _error: exitResult.success ? undefined : (exitResult.error || `CLI exited with code ${exitResult.exitCode}`),
    };
  } finally {
    unlisteners.forEach(fn => {
      try { fn(); } catch { /* ignore */ }
    });
  }
};
