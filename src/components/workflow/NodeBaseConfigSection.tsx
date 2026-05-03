import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NodeRetryPolicy, WorkflowNodeDataBase } from '@/types/models';

export type NodeBaseConfigDraft = {
  label: string;
  description: string;
  timeoutMs: string;
  retryPolicy: {
    maxAttempts: string;
    backoff: NonNullable<NodeRetryPolicy['backoff']>;
    delayMs: string;
  };
  onError: NonNullable<WorkflowNodeDataBase['onError']>;
};

const DEFAULT_RETRY_POLICY = {
  maxAttempts: '1',
  backoff: 'fixed' as const,
  delayMs: '1000',
};

const toOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : undefined;
};

export function createNodeBaseConfigDraft(data: WorkflowNodeDataBase, fallbackLabel: string): NodeBaseConfigDraft {
  return {
    label: data.label || fallbackLabel,
    description: data.description || '',
    timeoutMs: data.timeoutMs === undefined ? '' : String(data.timeoutMs),
    retryPolicy: {
      maxAttempts: data.retryPolicy?.maxAttempts === undefined ? DEFAULT_RETRY_POLICY.maxAttempts : String(data.retryPolicy.maxAttempts),
      backoff: data.retryPolicy?.backoff || DEFAULT_RETRY_POLICY.backoff,
      delayMs: data.retryPolicy?.delayMs === undefined ? DEFAULT_RETRY_POLICY.delayMs : String(data.retryPolicy.delayMs),
    },
    onError: data.onError || 'stop',
  };
}

export function applyNodeBaseConfigDraft<T extends WorkflowNodeDataBase>(data: T, draft: NodeBaseConfigDraft): T {
  return {
    ...data,
    label: draft.label,
    description: draft.description || undefined,
    timeoutMs: toOptionalNumber(draft.timeoutMs),
    retryPolicy: {
      maxAttempts: toOptionalNumber(draft.retryPolicy.maxAttempts),
      backoff: draft.retryPolicy.backoff,
      delayMs: toOptionalNumber(draft.retryPolicy.delayMs),
    },
    onError: draft.onError,
  };
}

export function NodeBaseConfigSection({
  value,
  onChange,
}: {
  value: NodeBaseConfigDraft;
  onChange: (value: NodeBaseConfigDraft) => void;
}) {
  return (
    <div className="grid gap-4 rounded-lg border p-3">
      <div>
        <h3 className="text-sm font-medium">Base Settings</h3>
        <p className="text-xs text-muted-foreground">Shared execution and recovery settings for this node.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="node-label">Node Label</Label>
        <Input
          id="node-label"
          value={value.label}
          onChange={(event) => onChange({ ...value, label: event.target.value })}
          placeholder="Node name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="node-description">Description</Label>
        <Textarea
          id="node-description"
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          placeholder="Optional note about what this node does"
          className="h-20 resize-none"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="node-timeout">Timeout (ms)</Label>
        <Input
          id="node-timeout"
          type="number"
          min="0"
          value={value.timeoutMs}
          onChange={(event) => onChange({ ...value, timeoutMs: event.target.value })}
          placeholder="Use runtime default"
        />
      </div>

      <div className="grid gap-3 rounded-md bg-muted/40 p-3">
        <Label>Retry Policy</Label>
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="node-retry-attempts" className="text-xs">Attempts</Label>
            <Input
              id="node-retry-attempts"
              type="number"
              min="1"
              value={value.retryPolicy.maxAttempts}
              onChange={(event) => onChange({
                ...value,
                retryPolicy: { ...value.retryPolicy, maxAttempts: event.target.value },
              })}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Backoff</Label>
            <Select
              value={value.retryPolicy.backoff}
              onValueChange={(backoff: NodeBaseConfigDraft['retryPolicy']['backoff']) => onChange({
                ...value,
                retryPolicy: { ...value.retryPolicy, backoff },
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="exponential">Exponential</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="node-retry-delay" className="text-xs">Delay (ms)</Label>
            <Input
              id="node-retry-delay"
              type="number"
              min="0"
              value={value.retryPolicy.delayMs}
              onChange={(event) => onChange({
                ...value,
                retryPolicy: { ...value.retryPolicy, delayMs: event.target.value },
              })}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Error Handling</Label>
        <Select
          value={value.onError}
          onValueChange={(onError: NodeBaseConfigDraft['onError']) => onChange({ ...value, onError })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stop">Stop workflow</SelectItem>
            <SelectItem value="continue">Continue</SelectItem>
            <SelectItem value="route-to-error">Route to error branch</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
