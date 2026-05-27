import { useAppStore } from '@/stores';

type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

const positionClasses: Record<BadgePosition, string> = {
  'top-right': 'top-1 right-1',
  'top-left': 'top-1 left-1',
  'bottom-right': 'bottom-1 right-1',
  'bottom-left': 'bottom-1 left-1',
};

export function DebugBadge({ id, position = 'top-right' }: { id: string; position?: BadgePosition }) {
  const debugMode = useAppStore(state => state.debugMode);
  if (!debugMode) return null;
  return (
    <div
      className={`absolute ${positionClasses[position]} z-[100] px-1 py-0.5 rounded text-xs font-mono bg-primary/15 text-primary border border-primary/25 pointer-events-none select-none whitespace-nowrap leading-none`}
      title={`Container: ${id}`}
    >
      {id}
    </div>
  );
}
