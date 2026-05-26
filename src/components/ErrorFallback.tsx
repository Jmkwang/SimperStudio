import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen flex items-center justify-center bg-background p-6"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            出错了
          </h1>
          <p className="text-sm text-muted-foreground">
            应用遇到了意外错误。你可以尝试刷新页面，或点击下方的重试按钮。
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-border bg-muted p-4 text-left">
            <p className="text-xs font-medium text-muted-foreground mb-1">错误详情</p>
            <pre className="text-xs text-destructive whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
              重试
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            刷新页面
          </Button>
        </div>
      </div>
    </div>
  );
}
