import { Copy, RefreshCw, Forward, RotateCcw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export interface MessageHoverActionsProps {
  canCopy?: boolean;
  canRerun?: boolean;
  canForward?: boolean;
  canRerunAndForward?: boolean;
  onCopy?: () => void;
  onRerun?: () => void;
  onForward?: () => void;
  onRerunAndForward?: () => void;
}

export function MessageHoverActions({
  canCopy,
  canRerun,
  canForward,
  canRerunAndForward,
  onCopy,
  onRerun,
  onForward,
  onRerunAndForward,
}: MessageHoverActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
      {canCopy && (
        <button
          type="button"
          aria-label={t("Copy")}
          onClick={onCopy}
          className="inline-flex items-center justify-center h-7 min-w-[44px] px-2 rounded-md border bg-background text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Copy className="mr-1 h-3 w-3" />{t("Copy")}
        </button>
      )}
      {canRerun && (
        <button
          type="button"
          aria-label={t("Regenerate")}
          onClick={onRerun}
          className="inline-flex items-center justify-center h-7 min-w-[44px] px-2 rounded-md border bg-background text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <RefreshCw className="mr-1 h-3 w-3" />{t("Regenerate")}
        </button>
      )}
      {canForward && (
        <button
          type="button"
          aria-label={t("Send to next")}
          onClick={onForward}
          className="inline-flex items-center justify-center h-7 min-w-[44px] px-2 rounded-md border bg-background text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Forward className="mr-1 h-3 w-3" />{t("Send to next")}
        </button>
      )}
      {canRerunAndForward && (
        <button
          type="button"
          aria-label={t("Retry and send")}
          onClick={onRerunAndForward}
          className="inline-flex items-center justify-center h-7 min-w-[44px] px-2 rounded-md border bg-background text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <RotateCcw className="mr-1 h-3 w-3" />{t("Retry and send")}
        </button>
      )}
    </div>
  );
}
