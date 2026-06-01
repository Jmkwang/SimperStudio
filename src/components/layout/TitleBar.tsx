import { useEffect, useRef, useState } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const winRef = useRef<any>(null);

  useEffect(() => {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      winRef.current = win;
      win.isMaximized().then(setIsMaximized).catch(e => console.error('[TitleBar] isMaximized failed', e));
      let unlisten: (() => void) | undefined;
      win.onResized(() => {
        win.isMaximized().then(setIsMaximized).catch(e => console.error('[TitleBar] isMaximized failed', e));
      }).then(fn => { unlisten = fn; }).catch(e => console.error('[TitleBar] onResized failed', e));
      return () => { unlisten?.(); };
    }).catch(e => console.error('[TitleBar] failed to load window API', e));
  }, []);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleMinimize = (e: React.MouseEvent) => {
    stop(e);
    winRef.current?.minimize().catch((err: unknown) => console.error('[TitleBar] minimize failed', err));
  };
  const handleMaximize = (e: React.MouseEvent) => {
    stop(e);
    winRef.current?.toggleMaximize().catch((err: unknown) => console.error('[TitleBar] toggleMaximize failed', err));
  };
  const handleClose = (e: React.MouseEvent) => {
    stop(e);
    winRef.current?.close().catch((err: unknown) => console.error('[TitleBar] close failed', err));
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 px-4 shrink-0 select-none bg-background"
    >
      {/* App name — part of drag region */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 text-sm font-medium text-foreground/80 pointer-events-none"
      >
        <div className="h-4 w-4 rounded bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">S</div>
        SimperStudio
      </div>

      {/* Window controls — must NOT be part of drag region */}
      <div className="flex items-center gap-0.5" onClick={stop}>
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
