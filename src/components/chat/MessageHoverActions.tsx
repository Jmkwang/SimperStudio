import { Copy, RefreshCw, Forward, RotateCcw, Quote, ThumbsUp, ThumbsDown, Bookmark, Trash2, MoreHorizontal } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDebugTrack } from "@/hooks/useDebugTrack";

export interface MessageHoverActionsProps {
  canCopy?: boolean;
  canRerun?: boolean;
  canForward?: boolean;
  canRerunAndForward?: boolean;
  canQuote?: boolean;
  canLike?: boolean;
  canDislike?: boolean;
  canBookmark?: boolean;
  canDelete?: boolean;
  onCopy?: () => void;
  onRerun?: () => void;
  onForward?: () => void;
  onRerunAndForward?: () => void;
  onQuote?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onBookmark?: () => void;
  onDelete?: () => void;
}

export function MessageHoverActions({
  canCopy,
  canRerun,
  canForward,
  canRerunAndForward,
  canQuote,
  canLike,
  canDislike,
  canBookmark,
  canDelete,
  onCopy,
  onRerun,
  onForward,
  onRerunAndForward,
  onQuote,
  onLike,
  onDislike,
  onBookmark,
  onDelete,
}: MessageHoverActionsProps) {
  const { t } = useTranslation();
  const { debugProps } = useDebugTrack('MessageHoverActions');

  return (
    <div className="mt-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
      {canCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          aria-label={t("Copy")}
          className="h-8 px-2"
          {...debugProps('msg:copy')}
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
      {canRerun && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRerun}
          aria-label={t("Regenerate")}
          className="h-8 px-2"
          {...debugProps('msg:rerun')}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
      {canQuote && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuote}
          aria-label={t("Quote")}
          className="h-8 px-2"
        >
          <Quote className="h-3 w-3" />
        </Button>
      )}
      {canLike && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          aria-label={t("Like")}
          className="h-8 px-2"
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
      )}
      {canDislike && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDislike}
          aria-label={t("Dislike")}
          className="h-8 px-2"
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      )}
      {canBookmark && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBookmark}
          aria-label={t("Bookmark")}
          className="h-8 px-2"
        >
          <Bookmark className="h-3 w-3" />
        </Button>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={t("Delete")}
          className="h-8 px-2 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
      {(canForward || canRerunAndForward) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canForward && (
              <DropdownMenuItem onClick={onForward} {...debugProps('msg:forward')}>
                <Forward className="mr-2 h-3 w-3" />
                {t("Send to next")}
              </DropdownMenuItem>
            )}
            {canRerunAndForward && (
              <DropdownMenuItem onClick={onRerunAndForward} {...debugProps('msg:rerunAndForward')}>
                <RotateCcw className="mr-2 h-3 w-3" />
                {t("Retry and send")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
