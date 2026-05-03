import { MultiModelComparison as MultiModelComparisonType } from "@/types/models";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, RefreshCw, Quote, ThumbsUp, Bookmark, Trash2, MoreHorizontal, Star, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

interface MultiModelComparisonProps {
  comparison: MultiModelComparisonType;
  onSelectResponse?: (responseId: string) => void;
}

export function MultiModelComparison({ comparison, onSelectResponse }: MultiModelComparisonProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {comparison.models.map((modelId) => {
        const response = comparison.responses[modelId];
        if (!response) return null;

        const isSelected = comparison.selectedResponseId === modelId;

        return (
          <ComparisonCard
            key={modelId}
            modelId={modelId}
            response={response}
            isSelected={isSelected}
            onSelectResponse={onSelectResponse}
            t={t}
          />
        );
      })}
    </div>
  );
}

function ComparisonCard({
  modelId,
  response,
  isSelected,
  onSelectResponse,
  t,
}: {
  modelId: string;
  response: NonNullable<MultiModelComparisonType['responses'][string]>;
  isSelected: boolean;
  onSelectResponse?: (responseId: string) => void;
  t: (key: string) => string;
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response.content.text);
  };

  const handleLike = () => {
    setLiked(!liked);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
  };

  return (
    <Card className={`relative ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{modelId}</CardTitle>
            <Star className="h-3.5 w-3.5 text-green-500 fill-green-500" />
          </div>
          {isSelected && (
            <Badge variant="default" className="h-5">
              <Check className="h-3 w-3 mr-1" />
              {t("Selected")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
          <span>{new Date(response.timestamp).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          {response.tokenUsage && (
            <span className="flex items-center gap-1">
              <span>|</span>
              <span>{response.tokenUsage.totalTokens} {t("tokens")}</span>
              <ArrowUp className="h-2.5 w-2.5" />
              <span>{response.tokenUsage.promptTokens}</span>
              <ArrowDown className="h-2.5 w-2.5" />
              <span>{response.tokenUsage.completionTokens}</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-wrap break-words mb-3">
          {response.content.text}
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap gap-1 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            aria-label={t("Copy")}
            className="h-8 px-2"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("Regenerate")}
            className="h-8 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("Quote")}
            className="h-8 px-2"
          >
            <Quote className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            aria-label={t("Like")}
            className={`h-8 px-2 ${liked ? 'text-primary' : ''}`}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            aria-label={t("Bookmark")}
            className={`h-8 px-2 ${bookmarked ? 'text-primary' : ''}`}
          >
            <Bookmark className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("Delete")}
            className="h-8 px-2 text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("More")}
            className="h-8 px-2"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {!isSelected && onSelectResponse && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectResponse(modelId)}
            className="mt-2 w-full"
          >
            {t("Select")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
