import { useAppStore } from '@/stores';

export function DebugBadge({ id }: { id: string }) {
  const debugMode = useAppStore(state => state.debugMode);
  if (!debugMode) return null;
  return (
    <div className="absolute top-2 right-2 z-50 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 pointer-events-none select-none">
      {id}
    </div>
  );
}
