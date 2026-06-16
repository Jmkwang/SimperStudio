import { useRef, useState, useCallback, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const LONG_PRESS_DURATION_MS = 2000;
const UPDATE_INTERVAL_MS = 50;

interface NodeDeleteButtonProps {
  nodeId: string;
  deleteNode?: (nodeId: string) => void;
  className?: string;
}

export function NodeDeleteButton({ nodeId, deleteNode, className }: NodeDeleteButtonProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!deleteNode) return null;

  const clearLongPress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
  }, []);

  const startLongPress = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.stopPropagation();
      event.preventDefault();
      if (timerRef.current) return;

      startTimeRef.current = Date.now();
      setProgress(0);

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const nextProgress = Math.min((elapsed / LONG_PRESS_DURATION_MS) * 100, 100);
        setProgress(nextProgress);

        if (elapsed >= LONG_PRESS_DURATION_MS) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setProgress(0);
          deleteNode(nodeId);
        }
      }, UPDATE_INTERVAL_MS);
    },
    [deleteNode, nodeId]
  );

  return (
    <button
      type="button"
      onMouseDown={startLongPress}
      onMouseUp={clearLongPress}
      onMouseLeave={clearLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative overflow-hidden ${className ?? ''}`}
      aria-label={t('Delete node')}
      title={t('Hold to delete')}
    >
      <span
        className="absolute inset-0 bg-destructive/20 origin-left transition-none"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
      <Trash2 className="h-4 w-4 relative z-10" />
    </button>
  );
}
