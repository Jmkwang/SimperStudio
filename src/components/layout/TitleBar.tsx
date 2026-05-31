import { useEffect, useState } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

// Tauri window API — only available in desktop context
let tauriWindow: any = null;
if (typeof window !== 'undefined') {
  import('@tauri-apps/api/window').then(m => {
    tauriWindow = m.getCurrentWindow?.() ?? null;
  }).catch(() => {});
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!tauriWindow) return;
    const checkMax = async () => {
      try { setIsMaximized(await tauriWindow.isMaximized()); } catch {}
    };
    checkMax();
    const unlisten = tauriWindow.onResized?.(() => checkMax());
    return () => { unlisten?.then?.((fn: any) => fn()); };
  }, []);

  const handleMinimize = () => tauriWindow?.minimize?.().catch(() => {});
  const handleMaximize = () => tauriWindow?.toggleMaximize?.().catch(() => {});
  const handleClose = () => tauriWindow?.close?.().catch(() => {});

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 px-4 shrink-0 select-none bg-background"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* App name */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        <div className="h-4 w-4 rounded bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">S</div>
        SimperStudio
      </div>

      {/* Window controls */}
      <div
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={handleMinimize}
          className="h-7 w-10 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="最小化"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-7 w-10 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized
            ? <Square className="h-3 w-3" />
            : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleClose}
          className="h-7 w-10 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          aria-label="关闭"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
