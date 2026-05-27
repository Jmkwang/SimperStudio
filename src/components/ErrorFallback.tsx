import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation();
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
            {t('Something went wrong')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('The app encountered an unexpected error. You can try refreshing the page, or click the retry button below.')}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-border bg-muted p-4 text-left">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('Error Details')}</p>
            <pre className="text-xs text-destructive whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('Retry')}
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            {t('Refresh Page')}
          </Button>
        </div>
      </div>
    </div>
  );
}
