import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface NodeDeleteButtonProps {
  nodeId: string;
  deleteNode?: (nodeId: string) => void;
  className?: string;
}

export function NodeDeleteButton({ nodeId, deleteNode, className }: NodeDeleteButtonProps) {
  const { t } = useTranslation();
  if (!deleteNode) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        deleteNode(nodeId);
      }}
      className={className}
      aria-label={t('Delete node')}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
